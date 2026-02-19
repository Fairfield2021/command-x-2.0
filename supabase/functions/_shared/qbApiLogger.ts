import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface LoggedRequestParams {
  functionName: string;
  entityType?: string;
  entityId?: string;
  quickbooksEntityId?: string;
  method: string;
  endpoint: string;
  accessToken: string;
  realmId: string;
  body?: any;
  initiatedBy?: string;
}

interface LoggedRequestResult {
  response: any;
  httpStatus: number;
  logId?: string;
}

/**
 * Sanitize payloads before storing in the immutable API log.
 * Strips access tokens, refresh tokens, authorization headers, and masks sensitive PII.
 */
function sanitizePayload(payload: any): any {
  if (!payload) return null;

  const sensitiveKeys = [
    "authorization",
    "access_token",
    "refresh_token",
    "token",
    "password",
    "secret",
  ];

  const piiKeys = ["tax_id", "ssn", "ssn_full", "ssn_last_four", "bank_account_number", "bank_routing_number"];

  function sanitize(obj: any): any {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(sanitize);

    const result: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some((sk) => lowerKey.includes(sk))) {
        result[key] = "[REDACTED]";
      } else if (piiKeys.some((pk) => lowerKey.includes(pk))) {
        result[key] = typeof value === "string" && value.length > 4
          ? `***${value.slice(-4)}`
          : "[MASKED]";
      } else {
        result[key] = sanitize(value);
      }
    }
    return result;
  }

  return sanitize(payload);
}

/**
 * Makes a QuickBooks API request and logs it immutably to quickbooks_api_log.
 * This is the ONLY way QuickBooks API calls should be made — all edge functions
 * must use this wrapper instead of raw fetch calls.
 */
export async function loggedQBRequest(
  supabase: any,
  params: LoggedRequestParams
): Promise<LoggedRequestResult> {
  const {
    functionName,
    entityType,
    entityId,
    quickbooksEntityId,
    method,
    endpoint,
    accessToken,
    realmId,
    body,
    initiatedBy,
  } = params;

  const url = `https://quickbooks.api.intuit.com/v3/company/${realmId}${endpoint}`;
  const requestSentAt = new Date().toISOString();

  const options: RequestInit = {
    method,
    headers: {
      Accept: "application/json",
      "Accept-Encoding": "identity",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "User-Agent": "CommandX/1.0",
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`[${functionName}] QB API ${method} ${endpoint}`);

  let responseText: string;
  let httpStatus: number;
  let responsePayload: any = null;
  let errorMessage: string | null = null;

  try {
    const response = await fetch(url, options);
    httpStatus = response.status;

    try {
      responseText = await response.text();
    } catch (textError) {
      errorMessage = `Failed to read response body: ${textError}`;
      responseText = "";
    }

    const responseReceivedAt = new Date().toISOString();

    if (responseText) {
      try {
        responsePayload = JSON.parse(responseText);
      } catch {
        responsePayload = { raw_text: responseText.substring(0, 2000) };
      }
    }

    if (!response.ok) {
      errorMessage = `QuickBooks API error: ${httpStatus} - ${responseText.substring(0, 200)}`;
    }

    // Log to immutable API log (fire-and-forget, don't block on log failure)
    try {
      await supabase.from("quickbooks_api_log").insert({
        function_name: functionName,
        entity_type: entityType || null,
        entity_id: entityId || null,
        quickbooks_entity_id: quickbooksEntityId || null,
        http_method: method,
        endpoint,
        http_status: httpStatus,
        request_payload: sanitizePayload(body),
        response_payload: sanitizePayload(responsePayload),
        error_message: errorMessage,
        request_sent_at: requestSentAt,
        response_received_at: responseReceivedAt,
        initiated_by: initiatedBy || null,
      });
    } catch (logError) {
      console.error(`[${functionName}] Failed to write API log:`, logError);
    }

    if (!response.ok) {
      throw new Error(errorMessage!);
    }

    return { response: responsePayload, httpStatus, logId: undefined };
  } catch (fetchError: any) {
    // If it's our own thrown error from !response.ok, re-throw
    if (errorMessage && fetchError.message === errorMessage) {
      throw fetchError;
    }

    // Network/fetch error — log it
    const responseReceivedAt = new Date().toISOString();
    const networkError = fetchError instanceof Error ? fetchError.message : String(fetchError);

    try {
      await supabase.from("quickbooks_api_log").insert({
        function_name: functionName,
        entity_type: entityType || null,
        entity_id: entityId || null,
        quickbooks_entity_id: quickbooksEntityId || null,
        http_method: method,
        endpoint,
        http_status: 0,
        request_payload: sanitizePayload(body),
        response_payload: null,
        error_message: `Network error: ${networkError}`,
        request_sent_at: requestSentAt,
        response_received_at: responseReceivedAt,
        initiated_by: initiatedBy || null,
      });
    } catch (logError) {
      console.error(`[${functionName}] Failed to write API log:`, logError);
    }

    throw fetchError;
  }
}

/**
 * Lookup-only function for vendor QB mapping.
 * NEVER creates vendors in QuickBooks — returns an error if no mapping exists.
 */
export async function getRequiredQBVendor(
  supabase: any,
  vendorId: string
): Promise<string> {
  const { data: mapping } = await supabase
    .from("quickbooks_vendor_mappings")
    .select("quickbooks_vendor_id")
    .eq("vendor_id", vendorId)
    .single();

  if (mapping?.quickbooks_vendor_id) {
    return mapping.quickbooks_vendor_id;
  }

  // Get vendor name for error message
  const { data: vendor } = await supabase
    .from("vendors")
    .select("name")
    .eq("id", vendorId)
    .single();

  const vendorName = vendor?.name || vendorId;
  throw new Error(
    `Vendor '${vendorName}' is not mapped to QuickBooks. Please sync this vendor first from the Vendor Management page.`
  );
}

/**
 * Lookup-only function for customer QB mapping.
 * NEVER creates customers in QuickBooks — returns an error if no mapping exists.
 */
export async function getRequiredQBCustomer(
  supabase: any,
  customerId: string
): Promise<string> {
  // Try embedded mapping first
  const { data: mapping } = await supabase
    .from("quickbooks_customer_mappings")
    .select("quickbooks_customer_id")
    .eq("customer_id", customerId)
    .single();

  if (mapping?.quickbooks_customer_id) {
    return mapping.quickbooks_customer_id;
  }

  // Get customer name for error message
  const { data: customer } = await supabase
    .from("customers")
    .select("name")
    .eq("id", customerId)
    .single();

  const customerName = customer?.name || customerId;
  throw new Error(
    `Customer '${customerName}' is not mapped to QuickBooks. Please sync this customer first from the Customer Management page.`
  );
}
