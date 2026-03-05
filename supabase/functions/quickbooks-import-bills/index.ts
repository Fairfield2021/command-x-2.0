import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";
import { autoLinkBillToPO } from "../_shared/billAutoLinker.ts";

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

// Map QB bill balance to local status
function mapQbBillStatusToLocal(
  balance: number,
  totalAmt: number
): string {
  if (balance === 0 && totalAmt > 0) return "paid";
  if (balance < totalAmt && balance > 0) return "partially_paid";
  return "open";
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
      console.log("Importing bills from QuickBooks...");

      // Query all bills from QuickBooks
      const query = "SELECT * FROM Bill MAXRESULTS 1000";
      const result = await qbRequest(
        "GET",
        `/query?query=${encodeURIComponent(query)}&minorversion=65`,
        accessToken,
        realmId
      );

      const qbBills = result.QueryResponse?.Bill || [];
      console.log(`Found ${qbBills.length} bills in QuickBooks`);

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      const unmappedVendors: string[] = [];

      // Get existing bill mappings to know which are already imported
      const { data: existingMappings } = await supabase
        .from("quickbooks_bill_mappings")
        .select("quickbooks_bill_id, bill_id");

      const mappedQbIds = new Map(
        (existingMappings || []).map((m: any) => [
          m.quickbooks_bill_id,
          m.bill_id,
        ])
      );

      // Get vendor mappings for matching
      const { data: vendorMappings } = await supabase
        .from("quickbooks_vendor_mappings")
        .select("vendor_id, quickbooks_vendor_id");

      const qbVendorToLocal = new Map(
        (vendorMappings || []).map((m: any) => [
          m.quickbooks_vendor_id,
          m.vendor_id,
        ])
      );

      // Get account mappings for expense category resolution
      const { data: accountMappings } = await supabase
        .from("quickbooks_account_mappings")
        .select("expense_category_id, quickbooks_account_id");

      const qbAccountToCategory = new Map(
        (accountMappings || []).map((m: any) => [
          m.quickbooks_account_id,
          m.expense_category_id,
        ])
      );

      // Get customer mappings for project resolution (QB CustomerRef on bill lines = project)
      const { data: customerMappings } = await supabase
        .from("quickbooks_customer_mappings")
        .select("customer_id, quickbooks_customer_id");

      const qbCustomerToLocal = new Map(
        (customerMappings || []).map((m: any) => [
          m.quickbooks_customer_id,
          m.customer_id,
        ])
      );

      // Get product mappings for item-based lines
      const { data: productMappings } = await supabase
        .from("quickbooks_product_mappings")
        .select("product_id, quickbooks_item_id");

      const qbItemToLocal = new Map(
        (productMappings || []).map((m: any) => [
          m.quickbooks_item_id,
          m.product_id,
        ])
      );

      for (const qbBill of qbBills) {
        const qbBillId = qbBill.Id;

        // Check if already mapped
        const existingBillId = mappedQbIds.get(qbBillId);

        try {
          // Find local vendor by QB vendor ID
          const qbVendorId = qbBill.VendorRef?.value;
          const localVendorId = qbVendorToLocal.get(qbVendorId);

          if (!localVendorId) {
            const vendorName =
              qbBill.VendorRef?.name || "Unknown";
            if (!unmappedVendors.includes(vendorName)) {
              unmappedVendors.push(vendorName);
            }
            errors.push(
              `Bill ${qbBill.DocNumber}: Vendor "${vendorName}" not mapped`
            );
            continue;
          }

          // Get vendor details
          const { data: vendor } = await supabase
            .from("vendors")
            .select("name")
            .eq("id", localVendorId)
            .single();

          // Calculate totals from QB bill
          const total = Number(qbBill.TotalAmt || 0);
          const balance = Number(qbBill.Balance || 0);
          const paidAmount = total - balance;
          const taxAmount = Number(
            qbBill.TxnTaxDetail?.TotalTax || 0
          );
          const subtotal = total - taxAmount;
          const status = mapQbBillStatusToLocal(balance, total);

          const billData: Record<string, any> = {
            vendor_id: localVendorId,
            vendor_name: vendor?.name || "Unknown",
            bill_date: qbBill.TxnDate || new Date().toISOString().split("T")[0],
            due_date:
              qbBill.DueDate ||
              qbBill.TxnDate ||
              new Date().toISOString().split("T")[0],
            subtotal,
            tax_rate:
              subtotal > 0
                ? Math.round((taxAmount / subtotal) * 100 * 100) / 100
                : 0,
            tax_amount: taxAmount,
            total,
            paid_amount: paidAmount,
            remaining_amount: balance,
            status,
            notes: qbBill.PrivateNote || null,
          };

          if (existingBillId) {
            // Update existing bill
            await supabase
              .from("vendor_bills")
              .update(billData)
              .eq("id", existingBillId);

            // Delete existing line items to re-create
            await supabase
              .from("vendor_bill_line_items")
              .delete()
              .eq("bill_id", existingBillId);

            // Re-create line items
            const lineItems = parseBillLineItems(
              qbBill,
              existingBillId,
              qbAccountToCategory,
              qbCustomerToLocal,
              qbItemToLocal,
              supabase
            );
            if (lineItems.length > 0) {
              await supabase
                .from("vendor_bill_line_items")
                .insert(await Promise.all(lineItems));
            }

            // Update mapping
            await supabase
              .from("quickbooks_bill_mappings")
              .update({
                quickbooks_doc_number: qbBill.DocNumber || null,
                sync_status: "synced",
                last_synced_at: new Date().toISOString(),
              })
              .eq("quickbooks_bill_id", qbBillId);

            updated++;
            console.log(`Updated bill ${qbBill.DocNumber}`);
          } else {
            // Create new bill (number auto-generated by trigger)
            const { data: newBill, error: billError } = await supabase
              .from("vendor_bills")
              .insert(billData)
              .select("id, number")
              .single();

            if (billError) {
              console.error(
                `Error creating bill ${qbBill.DocNumber}:`,
                billError
              );
              errors.push(
                `${qbBill.DocNumber}: ${billError.message}`
              );
              continue;
            }

            // Create line items
            const lineItems = parseBillLineItems(
              qbBill,
              newBill.id,
              qbAccountToCategory,
              qbCustomerToLocal,
              qbItemToLocal,
              supabase
            );
            if (lineItems.length > 0) {
              const resolvedItems = await Promise.all(lineItems);
              const { error: lineError } = await supabase
                .from("vendor_bill_line_items")
                .insert(resolvedItems);

              if (lineError) {
                console.error(
                  `Error creating line items for ${qbBill.DocNumber}:`,
                  lineError
                );
              }
            }

            // Create mapping
            await supabase.from("quickbooks_bill_mappings").upsert(
              {
                bill_id: newBill.id,
                quickbooks_bill_id: qbBillId,
                quickbooks_doc_number: qbBill.DocNumber || null,
                sync_status: "synced",
                sync_direction: "import",
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "quickbooks_bill_id" }
            );

            // Log sync
            await supabase.from("quickbooks_sync_log").insert({
              entity_type: "bill",
              entity_id: newBill.id,
              quickbooks_id: qbBillId,
              action: "import",
              status: "success",
              details: {
                number: newBill.number,
                total,
                vendor: vendor?.name,
              },
            });

            // Auto-link bill to PO
            const linkResult = await autoLinkBillToPO(supabase, newBill.id, localVendorId);
            if (linkResult.linked) {
              console.log(`Auto-linked bill ${newBill.number} to PO ${linkResult.poNumber} (${linkResult.method})`);
            }

            imported++;
            console.log(`Imported bill ${qbBill.DocNumber}`);
          }
        } catch (error: any) {
          console.error(
            `Error processing bill ${qbBill.DocNumber}:`,
            error
          );
          errors.push(`${qbBill.DocNumber}: ${error.message}`);
        }
      }

      // Log the overall import
      await supabase.from("quickbooks_sync_log").insert({
        entity_type: "bill",
        action: "bulk_import",
        status: errors.length > 0 ? "partial" : "success",
        details: {
          imported,
          updated,
          skipped,
          errors: errors.slice(0, 10),
          unmappedVendors,
          total: qbBills.length,
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
          total: qbBills.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("QuickBooks bill import error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Parse QB bill line items into local format
// QB bills can have AccountBasedExpenseLineDetail and/or ItemBasedExpenseLineDetail
function parseBillLineItems(
  qbBill: any,
  billId: string,
  qbAccountToCategory: Map<string, string>,
  qbCustomerToLocal: Map<string, string>,
  qbItemToLocal: Map<string, string>,
  supabase: any
): Promise<Record<string, any>>[] {
  const lines = qbBill.Line || [];
  const lineItems: Promise<Record<string, any>>[] = [];

  for (const line of lines) {
    if (line.DetailType === "AccountBasedExpenseLineDetail") {
      const detail = line.AccountBasedExpenseLineDetail || {};
      const qbAccountId = detail.AccountRef?.value;
      const qbCustomerId = detail.CustomerRef?.value;

      lineItems.push(
        resolveProjectId(qbCustomerId, qbCustomerToLocal, supabase).then(
          (projectId) => ({
            bill_id: billId,
            description:
              line.Description || detail.AccountRef?.name || "Expense",
            quantity: 1,
            unit_cost: Number(line.Amount || 0),
            total: Number(line.Amount || 0),
            category_id: qbAccountId
              ? qbAccountToCategory.get(qbAccountId) || null
              : null,
            project_id: projectId,
          })
        )
      );
    } else if (line.DetailType === "ItemBasedExpenseLineDetail") {
      const detail = line.ItemBasedExpenseLineDetail || {};
      const qbCustomerId = detail.CustomerRef?.value;
      const qbItemId = detail.ItemRef?.value;

      lineItems.push(
        resolveProjectId(qbCustomerId, qbCustomerToLocal, supabase).then(
          (projectId) => ({
            bill_id: billId,
            description:
              line.Description || detail.ItemRef?.name || "Item",
            quantity: Number(detail.Qty || 1),
            unit_cost: Number(detail.UnitPrice || line.Amount || 0),
            total: Number(line.Amount || 0),
            project_id: projectId,
          })
        )
      );
    }
  }

  return lineItems;
}

// Resolve QB CustomerRef to local project_id
// In QB, CustomerRef on bill lines represents the job/project
async function resolveProjectId(
  qbCustomerId: string | undefined,
  qbCustomerToLocal: Map<string, string>,
  supabase: any
): Promise<string | null> {
  if (!qbCustomerId) return null;

  const localCustomerId = qbCustomerToLocal.get(qbCustomerId);
  if (!localCustomerId) return null;

  // Find a project for this customer
  const { data: project } = await supabase
    .from("projects")
    .select("id")
    .eq("customer_id", localCustomerId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return project?.id || null;
}
