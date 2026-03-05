/**
 * Auto-link a vendor bill to its originating Purchase Order.
 *
 * Matching strategies (ordered by confidence):
 * 1. PO number found in bill notes/memo
 * 2. Same vendor + same project with open PO
 * 3. Vendor + amount match (within 5%)
 *
 * When linked, sets:
 * - vendor_bills.purchase_order_id / purchase_order_number
 * - vendor_bill_line_items.po_line_item_id (best-effort line matching)
 *
 * Existing triggers then auto-update PO billed_amount and billed_quantity.
 */

export async function autoLinkBillToPO(
  supabase: any,
  billId: string,
  vendorId: string
): Promise<{ linked: boolean; poId?: string; poNumber?: string; method?: string }> {
  // Fetch the bill with its line items
  const { data: bill } = await supabase
    .from("vendor_bills")
    .select("id, vendor_id, total, notes, purchase_order_id")
    .eq("id", billId)
    .single();

  if (!bill || bill.purchase_order_id) {
    // Already linked or not found
    return { linked: false };
  }

  const { data: billLines } = await supabase
    .from("vendor_bill_line_items")
    .select("id, description, quantity, unit_cost, total, project_id, po_line_item_id")
    .eq("bill_id", billId);

  // Strategy 1: PO number in bill notes
  if (bill.notes) {
    const poNumberMatch = bill.notes.match(/\b(PO-\d{2}\d{5})\b/i);
    if (poNumberMatch) {
      const { data: po } = await supabase
        .from("purchase_orders")
        .select("id, number")
        .eq("number", poNumberMatch[1])
        .eq("vendor_id", vendorId)
        .is("deleted_at", null)
        .maybeSingle();

      if (po) {
        await linkBillToPO(supabase, billId, po.id, po.number, billLines);
        return { linked: true, poId: po.id, poNumber: po.number, method: "memo_match" };
      }
    }
  }

  // Collect unique project IDs from bill lines
  const projectIds = [
    ...new Set(
      (billLines || [])
        .map((l: any) => l.project_id)
        .filter(Boolean)
    ),
  ];

  // Strategy 2: Same vendor + same project with open PO
  if (projectIds.length > 0) {
    const { data: candidatePOs } = await supabase
      .from("purchase_orders")
      .select("id, number, total, billed_amount, status")
      .eq("vendor_id", vendorId)
      .in("project_id", projectIds)
      .in("status", ["sent", "acknowledged", "in-progress", "partially_billed"])
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    if (candidatePOs && candidatePOs.length === 1) {
      // Exactly one matching PO — high confidence
      const po = candidatePOs[0];
      await linkBillToPO(supabase, billId, po.id, po.number, billLines);
      return { linked: true, poId: po.id, poNumber: po.number, method: "vendor_project_match" };
    }

    // If multiple POs, try amount matching among them
    if (candidatePOs && candidatePOs.length > 1) {
      const amountMatch = findAmountMatch(candidatePOs, bill.total);
      if (amountMatch) {
        await linkBillToPO(supabase, billId, amountMatch.id, amountMatch.number, billLines);
        return { linked: true, poId: amountMatch.id, poNumber: amountMatch.number, method: "vendor_project_amount_match" };
      }
    }
  }

  // Strategy 3: Vendor-only + amount match
  const { data: vendorPOs } = await supabase
    .from("purchase_orders")
    .select("id, number, total, billed_amount, status")
    .eq("vendor_id", vendorId)
    .in("status", ["sent", "acknowledged", "in-progress", "partially_billed"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(20);

  if (vendorPOs && vendorPOs.length > 0) {
    const amountMatch = findAmountMatch(vendorPOs, bill.total);
    if (amountMatch) {
      await linkBillToPO(supabase, billId, amountMatch.id, amountMatch.number, billLines);
      return { linked: true, poId: amountMatch.id, poNumber: amountMatch.number, method: "vendor_amount_match" };
    }
  }

  return { linked: false };
}

// Find a PO whose remaining unbilled amount matches the bill total (within 5%)
function findAmountMatch(
  pos: any[],
  billTotal: number
): { id: string; number: string } | null {
  const tolerance = 0.05; // 5%

  for (const po of pos) {
    const remaining = Number(po.total) - Number(po.billed_amount || 0);
    if (remaining <= 0) continue;

    const diff = Math.abs(remaining - billTotal);
    const pct = diff / remaining;

    if (pct <= tolerance) {
      return { id: po.id, number: po.number };
    }
  }

  return null;
}

// Set the link on the bill and attempt to match line items
async function linkBillToPO(
  supabase: any,
  billId: string,
  poId: string,
  poNumber: string,
  billLines: any[] | null
): Promise<void> {
  // Link bill header to PO
  await supabase
    .from("vendor_bills")
    .update({ purchase_order_id: poId, purchase_order_number: poNumber })
    .eq("id", billId);

  if (!billLines || billLines.length === 0) return;

  // Fetch PO line items for matching
  const { data: poLines } = await supabase
    .from("po_line_items")
    .select("id, description, quantity, unit_price, total, billed_quantity")
    .eq("purchase_order_id", poId)
    .order("created_at", { ascending: true });

  if (!poLines || poLines.length === 0) return;

  // Try to match bill lines to PO lines
  const usedPOLines = new Set<string>();

  for (const billLine of billLines) {
    if (billLine.po_line_item_id) continue; // already linked

    let bestMatch: string | null = null;

    // Try description match first
    for (const poLine of poLines) {
      if (usedPOLines.has(poLine.id)) continue;

      const billDesc = (billLine.description || "").toLowerCase().trim();
      const poDesc = (poLine.description || "").toLowerCase().trim();

      if (billDesc && poDesc && (billDesc.includes(poDesc) || poDesc.includes(billDesc))) {
        bestMatch = poLine.id;
        break;
      }
    }

    // Fallback: match by amount
    if (!bestMatch) {
      for (const poLine of poLines) {
        if (usedPOLines.has(poLine.id)) continue;

        const billAmt = Number(billLine.total || 0);
        const poAmt = Number(poLine.total || 0);

        if (poAmt > 0 && Math.abs(billAmt - poAmt) / poAmt <= 0.05) {
          bestMatch = poLine.id;
          break;
        }
      }
    }

    // Fallback: positional match (if same count)
    if (!bestMatch && billLines.length === poLines.length) {
      const idx = billLines.indexOf(billLine);
      const poLine = poLines[idx];
      if (poLine && !usedPOLines.has(poLine.id)) {
        bestMatch = poLine.id;
      }
    }

    if (bestMatch) {
      usedPOLines.add(bestMatch);

      // Also propagate sov_line_id from PO line to bill line
      const matchedPOLine = poLines.find((p: any) => p.id === bestMatch);

      const updateData: Record<string, any> = { po_line_item_id: bestMatch };

      // If PO line has sov_line_id, propagate it
      if (matchedPOLine) {
        const { data: fullPOLine } = await supabase
          .from("po_line_items")
          .select("sov_line_id")
          .eq("id", bestMatch)
          .single();

        if (fullPOLine?.sov_line_id) {
          updateData.sov_line_id = fullPOLine.sov_line_id;
        }
      }

      await supabase
        .from("vendor_bill_line_items")
        .update(updateData)
        .eq("id", billLine.id);
    }
  }
}
