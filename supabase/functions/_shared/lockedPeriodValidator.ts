/**
 * Server-side locked period validation for edge functions.
 * Prevents syncing transactions if they fall within a locked accounting period.
 * 
 * CRITICAL: This validator uses FAIL-CLOSED behavior.
 * If settings cannot be read, transactions are BLOCKED (not allowed through).
 */

export interface LockedPeriodResult {
  allowed: boolean;
  message?: string;
}

/**
 * Validates a transaction date against locked period settings AND accounting_periods table.
 * FAIL-CLOSED: If settings cannot be read, the transaction is blocked.
 */
export async function validateLockedPeriod(
  supabase: any,
  txnDate: string,
  entityType: string,
  entityId: string | null,
  userId: string,
  action: "create" | "update"
): Promise<LockedPeriodResult> {
  try {
    // 1. Fetch company settings — FAIL CLOSED if unreachable
    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("locked_period_date, locked_period_enabled")
      .single();

    if (settingsError) {
      console.error("FAIL-CLOSED: Could not fetch company settings for locked period check:", settingsError);
      return {
        allowed: false,
        message: "Cannot verify accounting period status. Transaction blocked for safety. Please contact an administrator."
      };
    }

    // 2. Check global locked period date
    if (settings?.locked_period_enabled && settings?.locked_period_date) {
      const txn = new Date(txnDate + "T12:00:00");
      const cutoff = new Date(settings.locked_period_date + "T12:00:00");

      if (txn <= cutoff) {
        console.warn(`Locked period violation: ${entityType} with date ${txnDate} is before cutoff ${settings.locked_period_date}`);
        await logViolation(supabase, userId, entityType, entityId, txnDate, settings.locked_period_date, action, "global_locked_period");
        return {
          allowed: false,
          message: `Transaction date ${txnDate} is in a locked accounting period (locked through ${settings.locked_period_date}). This change will not be synced.`
        };
      }
    }

    // 3. Check accounting_periods table for any locked period containing the date
    const { data: lockedPeriods, error: periodsError } = await supabase
      .from("accounting_periods")
      .select("period_name, start_date, end_date")
      .eq("is_locked", true)
      .lte("start_date", txnDate)
      .gte("end_date", txnDate)
      .limit(1);

    if (periodsError) {
      console.error("FAIL-CLOSED: Could not query accounting_periods:", periodsError);
      return {
        allowed: false,
        message: "Cannot verify accounting period status. Transaction blocked for safety. Please contact an administrator."
      };
    }

    if (lockedPeriods && lockedPeriods.length > 0) {
      const period = lockedPeriods[0];
      console.warn(`Locked period violation: ${entityType} with date ${txnDate} falls in locked period "${period.period_name}"`);
      await logViolation(supabase, userId, entityType, entityId, txnDate, settings?.locked_period_date, action, "accounting_period", period.period_name);
      return {
        allowed: false,
        message: `Transaction date ${txnDate} falls within locked accounting period "${period.period_name}" (${period.start_date} to ${period.end_date}). This change will not be synced.`
      };
    }

    return { allowed: true };
  } catch (error) {
    // FAIL-CLOSED on unexpected errors
    console.error("FAIL-CLOSED: Unexpected error in locked period validation:", error);
    return {
      allowed: false,
      message: "Cannot verify accounting period status due to an unexpected error. Transaction blocked for safety."
    };
  }
}

async function logViolation(
  supabase: any,
  userId: string,
  entityType: string,
  entityId: string | null,
  txnDate: string,
  lockedPeriodDate: string | null,
  action: "create" | "update",
  reason: string,
  periodName?: string
): Promise<void> {
  try {
    await supabase.from("locked_period_violations").insert({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      attempted_date: txnDate,
      locked_period_date: lockedPeriodDate,
      action,
      blocked: true,
      details: { source: "edge_function", reason, period_name: periodName ?? null }
    });
  } catch (logError) {
    console.error("Failed to log locked period violation:", logError);
  }
}
