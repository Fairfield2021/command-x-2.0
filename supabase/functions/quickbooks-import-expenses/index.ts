import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getCorsHeaders } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

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
      console.log("Importing expenses (Purchase) from QuickBooks...");

      // QB Purchase = expense/check/credit card charge
      const query =
        "SELECT * FROM Purchase ORDERBY MetaData.CreateTime DESC MAXRESULTS 1000";
      const result = await qbRequest(
        "GET",
        `/query?query=${encodeURIComponent(query)}&minorversion=65`,
        accessToken,
        realmId
      );

      const qbExpenses = result.QueryResponse?.Purchase || [];
      console.log(`Found ${qbExpenses.length} expenses in QuickBooks`);

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];
      const unmappedVendors: string[] = [];

      // Load mappings
      const { data: vendorMappings } = await supabase
        .from("quickbooks_vendor_mappings")
        .select("vendor_id, quickbooks_vendor_id");

      const qbVendorToLocal = new Map(
        (vendorMappings || []).map((m: any) => [
          m.quickbooks_vendor_id,
          m.vendor_id,
        ])
      );

      const { data: customerMappings } = await supabase
        .from("quickbooks_customer_mappings")
        .select("customer_id, quickbooks_customer_id");

      const qbCustomerToLocal = new Map(
        (customerMappings || []).map((m: any) => [
          m.quickbooks_customer_id,
          m.customer_id,
        ])
      );

      const { data: accountMappings } = await supabase
        .from("quickbooks_account_mappings")
        .select("expense_category_id, quickbooks_account_id");

      const qbAccountToLocal = new Map(
        (accountMappings || []).map((m: any) => [
          m.quickbooks_account_id,
          m.expense_category_id,
        ])
      );

      // Check existing expense mappings (reuse bill mappings table with a flag)
      const { data: existingMappings } = await supabase
        .from("quickbooks_bill_mappings")
        .select("quickbooks_bill_id, bill_id")
        .like("quickbooks_bill_id", "EXP-%");

      const mappedQbIds = new Map(
        (existingMappings || []).map((m: any) => [
          m.quickbooks_bill_id,
          m.bill_id,
        ])
      );

      for (const qbExpense of qbExpenses) {
        const qbExpenseId = qbExpense.Id;
        const mappingKey = `EXP-${qbExpenseId}`;
        const existingBillId = mappedQbIds.get(mappingKey);

        try {
          // Resolve vendor (entity reference)
          const qbEntityId = qbExpense.EntityRef?.value;
          const localVendorId = qbEntityId
            ? qbVendorToLocal.get(qbEntityId)
            : null;

          if (!localVendorId) {
            const vendorName =
              qbExpense.EntityRef?.name || "Unknown";
            if (!unmappedVendors.includes(vendorName)) {
              unmappedVendors.push(vendorName);
            }
            skipped++;
            continue;
          }

          // Get vendor name
          const { data: vendor } = await supabase
            .from("vendors")
            .select("name")
            .eq("id", localVendorId)
            .single();

          // Parse line items
          const lineItems: any[] = [];
          let subtotal = 0;

          for (const line of qbExpense.Line || []) {
            if (
              line.DetailType === "AccountBasedExpenseLineDetail" &&
              line.AccountBasedExpenseLineDetail
            ) {
              const detail = line.AccountBasedExpenseLineDetail;
              const lineTotal = Number(line.Amount || 0);
              subtotal += lineTotal;

              // Resolve project from customer ref on line
              const lineCustomerId = detail.CustomerRef?.value;
              const localCustomerId = lineCustomerId
                ? qbCustomerToLocal.get(lineCustomerId)
                : null;

              let projectId: string | null = null;
              if (localCustomerId) {
                const { data: project } = await supabase
                  .from("projects")
                  .select("id")
                  .eq("customer_id", localCustomerId)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                projectId = project?.id || null;
              }

              lineItems.push({
                description:
                  line.Description ||
                  detail.AccountRef?.name ||
                  "Expense",
                quantity: 1,
                unit_cost: lineTotal,
                total: lineTotal,
                project_id: projectId,
                category_id:
                  qbAccountToLocal.get(detail.AccountRef?.value) || null,
              });
            } else if (
              line.DetailType === "ItemBasedExpenseLineDetail" &&
              line.ItemBasedExpenseLineDetail
            ) {
              const detail = line.ItemBasedExpenseLineDetail;
              const qty = Number(detail.Qty || 1);
              const unitPrice = Number(detail.UnitPrice || 0);
              const lineTotal = Number(line.Amount || qty * unitPrice);
              subtotal += lineTotal;

              const lineCustomerId = detail.CustomerRef?.value;
              const localCustomerId = lineCustomerId
                ? qbCustomerToLocal.get(lineCustomerId)
                : null;

              let projectId: string | null = null;
              if (localCustomerId) {
                const { data: project } = await supabase
                  .from("projects")
                  .select("id")
                  .eq("customer_id", localCustomerId)
                  .order("created_at", { ascending: false })
                  .limit(1)
                  .maybeSingle();
                projectId = project?.id || null;
              }

              lineItems.push({
                description:
                  line.Description ||
                  detail.ItemRef?.name ||
                  "Item expense",
                quantity: qty,
                unit_cost: unitPrice,
                total: lineTotal,
                project_id: projectId,
                category_id: null,
              });
            }
          }

          const total = Number(qbExpense.TotalAmt || subtotal);
          const txnDate =
            qbExpense.TxnDate || new Date().toISOString().split("T")[0];

          // Expenses are already paid, so create bill with status "paid"
          const billData: Record<string, any> = {
            vendor_id: localVendorId,
            vendor_name: vendor?.name || "Unknown",
            bill_date: txnDate,
            due_date: txnDate,
            status: "paid",
            subtotal,
            tax_rate: 0,
            tax_amount: 0,
            total,
            paid_amount: total,
            remaining_amount: 0,
            notes: qbExpense.PrivateNote
              ? `[QB Expense] ${qbExpense.PrivateNote}`
              : `[QB Expense] ${qbExpense.PaymentType || "Expense"}`,
          };

          if (existingBillId) {
            // Update existing
            await supabase
              .from("vendor_bills")
              .update(billData)
              .eq("id", existingBillId);

            await supabase
              .from("vendor_bill_line_items")
              .delete()
              .eq("bill_id", existingBillId);

            if (lineItems.length > 0) {
              await supabase.from("vendor_bill_line_items").insert(
                lineItems.map((item) => ({
                  ...item,
                  bill_id: existingBillId,
                }))
              );
            }

            await supabase
              .from("quickbooks_bill_mappings")
              .update({ last_synced_at: new Date().toISOString() })
              .eq("quickbooks_bill_id", mappingKey);

            updated++;
          } else {
            // Create new bill
            const { data: newBill, error: billError } = await supabase
              .from("vendor_bills")
              .insert(billData)
              .select("id, number")
              .single();

            if (billError) {
              errors.push(
                `Expense ${qbExpenseId}: ${billError.message}`
              );
              continue;
            }

            if (lineItems.length > 0) {
              await supabase.from("vendor_bill_line_items").insert(
                lineItems.map((item) => ({
                  ...item,
                  bill_id: newBill.id,
                }))
              );
            }

            // Create mapping with EXP- prefix to distinguish from regular bills
            await supabase.from("quickbooks_bill_mappings").upsert(
              {
                bill_id: newBill.id,
                quickbooks_bill_id: mappingKey,
                sync_status: "synced",
                sync_direction: "import",
                last_synced_at: new Date().toISOString(),
              },
              { onConflict: "quickbooks_bill_id" }
            );

            imported++;
            console.log(`Imported expense ${qbExpenseId} as bill ${newBill.number}`);
          }
        } catch (error: any) {
          console.error(
            `Error processing expense ${qbExpenseId}:`,
            error
          );
          errors.push(`${qbExpenseId}: ${error.message}`);
        }
      }

      // Log the import
      await supabase.from("quickbooks_sync_log").insert({
        entity_type: "expense",
        action: "bulk_import",
        status: errors.length > 0 ? "partial" : "success",
        details: {
          imported,
          updated,
          skipped,
          errors: errors.slice(0, 10),
          unmappedVendors,
          total: qbExpenses.length,
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
          total: qbExpenses.length,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    throw new Error("Invalid action");
  } catch (error: unknown) {
    console.error("QuickBooks expense import error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
