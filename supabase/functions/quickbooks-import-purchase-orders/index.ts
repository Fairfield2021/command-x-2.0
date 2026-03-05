import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

// Helper to get valid access token (refresh if near expiry)
async function getValidToken(supabase: any) {
  const { data: config, error } = await supabase
    .from("quickbooks_config")
    .select("*")
    .eq("is_connected", true)
    .single();

  if (error || !config) {
    throw new Error("QuickBooks not connected");
  }

  const tokenExpires = new Date(config.token_expires_at);
  const now = new Date();
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (tokenExpires < fiveMinutesFromNow) {
    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/quickbooks-oauth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        },
        body: JSON.stringify({ action: "refresh-token" }),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to refresh token");
    }

    const { access_token, realm_id } = await response.json();
    return { accessToken: access_token, realmId: realm_id };
  }

  return { accessToken: config.access_token, realmId: config.realm_id };
}

// QuickBooks API helper
async function qbRequest(
  method: string,
  endpoint: string,
  accessToken: string,
  realmId: string
): Promise<any> {
  const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}${endpoint}`;

  const response = await fetch(url, {
    method,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error(`QuickBooks API error: ${responseText}`);
    throw new Error(`QuickBooks API error: ${response.status}`);
  }

  return responseText ? JSON.parse(responseText) : {};
}

// Map QB PO status to local status
function mapQbPOStatusToLocal(qbPO: any): string {
  const status = qbPO.POStatus?.toLowerCase();
  if (status === "closed") return "completed";
  // QB POs are "Open" by default
  return "sent";
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action } = await req.json();
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const { accessToken, realmId } = await getValidToken(supabase);

    if (action === "import") {
      console.log("Importing purchase orders from QuickBooks...");

      // Query all purchase orders from QuickBooks
      const query =
        "SELECT * FROM PurchaseOrder ORDERBY MetaData.CreateTime DESC MAXRESULTS 1000";
      const result = await qbRequest(
        "GET",
        `/query?query=${encodeURIComponent(query)}&minorversion=65`,
        accessToken,
        realmId
      );

      const qbPOs = result.QueryResponse?.PurchaseOrder || [];
      console.log(`Found ${qbPOs.length} purchase orders in QuickBooks`);

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      const unmappedVendors: string[] = [];

      // Get existing PO mappings
      const { data: existingMappings } = await supabase
        .from("quickbooks_po_mappings")
        .select("quickbooks_po_id, purchase_order_id");

      const mappedQbIds = new Map(
        (existingMappings || []).map((m: any) => [
          m.quickbooks_po_id,
          m.purchase_order_id,
        ])
      );

      // Get vendor mappings
      const { data: vendorMappings } = await supabase
        .from("quickbooks_vendor_mappings")
        .select("vendor_id, quickbooks_vendor_id");

      const qbVendorToLocal = new Map(
        (vendorMappings || []).map((m: any) => [
          m.quickbooks_vendor_id,
          m.vendor_id,
        ])
      );

      // Get customer mappings (QB CustomerRef = project/customer)
      const { data: customerMappings } = await supabase
        .from("quickbooks_customer_mappings")
        .select("customer_id, quickbooks_customer_id");

      const qbCustomerToLocal = new Map(
        (customerMappings || []).map((m: any) => [
          m.quickbooks_customer_id,
          m.customer_id,
        ])
      );

      // Get product mappings for line items
      const { data: productMappings } = await supabase
        .from("quickbooks_product_mappings")
        .select("product_id, quickbooks_item_id");

      const qbItemToLocal = new Map(
        (productMappings || []).map((m: any) => [
          m.quickbooks_item_id,
          m.product_id,
        ])
      );

      for (const qbPO of qbPOs) {
        const qbPOId = qbPO.Id;
        const existingPOId = mappedQbIds.get(qbPOId);

        try {
          // Resolve vendor
          const qbVendorId = qbPO.VendorRef?.value;
          const localVendorId = qbVendorToLocal.get(qbVendorId);

          if (!localVendorId) {
            const vendorName = qbPO.VendorRef?.name || "Unknown";
            if (!unmappedVendors.includes(vendorName)) {
              unmappedVendors.push(vendorName);
            }
            errors.push(
              `PO ${qbPO.DocNumber}: Vendor "${vendorName}" not mapped`
            );
            continue;
          }

          // Get vendor details
          const { data: vendor } = await supabase
            .from("vendors")
            .select("name")
            .eq("id", localVendorId)
            .single();

          // Resolve customer/project
          // QB POs can have a CustomerRef at the header or per line
          const qbCustomerId =
            qbPO.CustomerRef?.value ||
            qbPO.Line?.[0]?.ItemBasedExpenseLineDetail?.CustomerRef?.value;
          const localCustomerId = qbCustomerId
            ? qbCustomerToLocal.get(qbCustomerId)
            : null;

          // Get customer details
          let customerName = "Unknown";
          let projectId: string | null = null;
          let projectName = "Unknown";

          if (localCustomerId) {
            const { data: customer } = await supabase
              .from("customers")
              .select("name")
              .eq("id", localCustomerId)
              .single();
            customerName = customer?.name || "Unknown";

            // Find project for this customer
            const { data: project } = await supabase
              .from("projects")
              .select("id, name")
              .eq("customer_id", localCustomerId)
              .order("created_at", { ascending: false })
              .limit(1)
              .maybeSingle();

            if (project) {
              projectId = project.id;
              projectName = project.name;
            }
          }

          if (!localCustomerId || !projectId) {
            errors.push(
              `PO ${qbPO.DocNumber}: No mapped customer/project (QB Customer: ${qbPO.CustomerRef?.name || "none"})`
            );
            continue;
          }

          // Find or create job order for this project
          const { data: jobOrder } = await supabase
            .from("job_orders")
            .select("id, number")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (!jobOrder) {
            errors.push(
              `PO ${qbPO.DocNumber}: No job order found for project "${projectName}"`
            );
            continue;
          }

          // Parse line items and calculate totals
          const lineItems: any[] = [];
          let subtotal = 0;

          for (const line of qbPO.Line || []) {
            if (
              line.DetailType === "ItemBasedExpenseLineDetail" &&
              line.ItemBasedExpenseLineDetail
            ) {
              const detail = line.ItemBasedExpenseLineDetail;
              const qty = Number(detail.Qty || 1);
              const unitPrice = Number(detail.UnitPrice || 0);
              const lineTotal = Number(line.Amount || qty * unitPrice);

              subtotal += lineTotal;

              lineItems.push({
                description:
                  line.Description || detail.ItemRef?.name || "Imported item",
                quantity: qty,
                unit_price: unitPrice,
                markup: 0,
                total: lineTotal,
              });
            } else if (
              line.DetailType === "AccountBasedExpenseLineDetail" &&
              line.AccountBasedExpenseLineDetail
            ) {
              const detail = line.AccountBasedExpenseLineDetail;
              const lineTotal = Number(line.Amount || 0);
              subtotal += lineTotal;

              lineItems.push({
                description:
                  line.Description ||
                  detail.AccountRef?.name ||
                  "Expense item",
                quantity: 1,
                unit_price: lineTotal,
                markup: 0,
                total: lineTotal,
              });
            }
          }

          const taxAmount = Number(
            qbPO.TxnTaxDetail?.TotalTax || 0
          );
          const total = Number(qbPO.TotalAmt || subtotal + taxAmount);
          const taxRate =
            subtotal > 0
              ? Math.round((taxAmount / subtotal) * 100 * 100) / 100
              : 0;

          const poData: Record<string, any> = {
            job_order_id: jobOrder.id,
            job_order_number: jobOrder.number,
            vendor_id: localVendorId,
            vendor_name: vendor?.name || "Unknown",
            project_id: projectId,
            project_name: projectName,
            customer_id: localCustomerId,
            customer_name: customerName,
            status: mapQbPOStatusToLocal(qbPO),
            subtotal,
            tax_rate: taxRate,
            tax_amount: taxAmount,
            total,
            notes: qbPO.PrivateNote || qbPO.Memo || null,
            due_date:
              qbPO.DueDate ||
              qbPO.TxnDate ||
              new Date().toISOString().split("T")[0],
          };

          if (existingPOId) {
            // Update existing PO
            await supabase
              .from("purchase_orders")
              .update(poData)
              .eq("id", existingPOId);

            // Delete + recreate line items
            await supabase
              .from("po_line_items")
              .delete()
              .eq("purchase_order_id", existingPOId);

            if (lineItems.length > 0) {
              await supabase.from("po_line_items").insert(
                lineItems.map((item) => ({
                  ...item,
                  purchase_order_id: existingPOId,
                }))
              );
            }

            // Update mapping
            await supabase
              .from("quickbooks_po_mappings")
              .update({
                sync_status: "synced",
                last_synced_at: new Date().toISOString(),
              })
              .eq("quickbooks_po_id", qbPOId);

            updated++;
            console.log(`Updated PO ${qbPO.DocNumber}`);
          } else {
            // Create new PO (number auto-generated by trigger)
            const { data: newPO, error: poError } = await supabase
              .from("purchase_orders")
              .insert(poData)
              .select("id, number")
              .single();

            if (poError) {
              console.error(
                `Error creating PO ${qbPO.DocNumber}:`,
                poError
              );
              errors.push(`${qbPO.DocNumber}: ${poError.message}`);
              continue;
            }

            // Create line items
            if (lineItems.length > 0) {
              const { data: insertedLines, error: lineError } = await supabase
                .from("po_line_items")
                .insert(
                  lineItems.map((item) => ({
                    ...item,
                    purchase_order_id: newPO.id,
                  }))
                )
                .select("id, description, total");

              if (lineError) {
                console.error(
                  `Error creating line items for PO ${qbPO.DocNumber}:`,
                  lineError
                );
              }

              // Auto-match PO lines to SoV lines by description
              if (insertedLines && projectId) {
                try {
                  // Get contract for this project
                  const { data: contract } = await supabase
                    .from("contracts")
                    .select("id")
                    .eq("project_id", projectId)
                    .order("created_at", { ascending: false })
                    .limit(1)
                    .maybeSingle();

                  if (contract) {
                    const { data: sovLines } = await supabase
                      .from("sov_lines")
                      .select("id, description, line_number, total_value")
                      .eq("contract_id", contract.id);

                    if (sovLines && sovLines.length > 0) {
                      for (const poLine of insertedLines) {
                        // Try description match (case-insensitive substring)
                        const descLower = (poLine.description || "").toLowerCase();
                        const match = sovLines.find((sl: any) =>
                          descLower.includes((sl.description || "").toLowerCase()) ||
                          (sl.description || "").toLowerCase().includes(descLower)
                        );

                        if (match) {
                          await supabase
                            .from("po_line_items")
                            .update({ sov_line_id: match.id })
                            .eq("id", poLine.id);
                          console.log(`Auto-linked PO line "${poLine.description}" to SoV line #${match.line_number}`);
                        }
                      }
                    }
                  }
                } catch (sovErr) {
                  console.warn("Auto SoV matching failed (non-fatal):", sovErr);
                }
              }
            }

            // Create mapping
            await supabase.from("quickbooks_po_mappings").upsert(
              {
                purchase_order_id: newPO.id,
                quickbooks_po_id: qbPOId,
                sync_status: "synced",
                sync_direction: "import",
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "quickbooks_po_id" }
            );

            // Log sync
            await supabase.from("quickbooks_sync_log").insert({
              entity_type: "purchase_order",
              entity_id: newPO.id,
              quickbooks_id: qbPOId,
              action: "import",
              status: "success",
              details: {
                number: newPO.number,
                total,
                vendor: vendor?.name,
              },
            });

            imported++;
            console.log(`Imported PO ${qbPO.DocNumber}`);
          }
        } catch (error: any) {
          console.error(
            `Error processing PO ${qbPO.DocNumber}:`,
            error
          );
          errors.push(`${qbPO.DocNumber}: ${error.message}`);
        }
      }

      // Log the overall import
      await supabase.from("quickbooks_sync_log").insert({
        entity_type: "purchase_order",
        action: "bulk_import",
        status: errors.length > 0 ? "partial" : "success",
        details: {
          imported,
          updated,
          skipped,
          errors: errors.slice(0, 10),
          unmappedVendors,
          total: qbPOs.length,
        },
      });

      // Update last sync time
      await supabase
        .from("quickbooks_config")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("is_connected", true);

      return new Response(
        JSON.stringify({
          success: true,
          imported,
          updated,
          skipped,
          errors: errors.slice(0, 10),
          unmappedVendors,
          total: qbPOs.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("QuickBooks PO import error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
