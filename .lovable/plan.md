
# Phase 0 — Critical Security Fixes

This plan directly addresses all 8 items listed in the Notion Implementation Progress Tracker under Phase 0. Each item has been verified against the actual codebase. Here is exactly what the code looks like today and what changes are required.

---

## What the Notion Tracker Requires (Phase 0, ~22 hours total)

| # | Task | Effort | Status in Code |
|---|------|--------|----------------|
| 1 | Remove .env with Supabase keys from Git history | 2h | Cannot be done by Lovable — manual git operation |
| 2 | Fix Twilio webhook signature validation | 3h | CONFIRMED MISSING — no X-Twilio-Signature check anywhere |
| 3 | Remove exposed Mapbox secret token | 1h | CONFIRMED — unauthenticated endpoint returns secret token to any caller |
| 4 | Add Electron auto-updater signature verification | 4h | Out of scope for Lovable (Electron binary config) |
| 5 | Fix XSS via dangerouslySetInnerHTML in AI chat | 2h | CONFIRMED — line 80 of ChatMessage.tsx, no sanitization |
| 6 | Fix SSRF in badge PDF export | 2h | CONFIRMED — line 149 of badgePdfExport.ts, raw fetch with no URL validation |
| 7 | Fix wildcard CORS on 29 Edge Functions | 3h | CONFIRMED — 90 files have Access-Control-Allow-Origin: * |
| 8 | Address 36 high-severity npm vulnerabilities | 5h | Partially addressable via package updates |

Lovable can implement items 2, 3, 5, 6, and 7. Items 1 and 4 require manual action outside Lovable. Item 8 is addressed through dependency notes.

---

## Fix 1: XSS in AI Chat (ChatMessage.tsx)

**Current vulnerable code (line 80):**
```typescript
dangerouslySetInnerHTML={{ __html: formatContent(message.content) }}
```

The `formatContent` function applies regex replacements on AI-generated content and then injects it directly as raw HTML with no sanitization. A malicious AI response containing `<script>`, `<img onerror=...>`, or event handler attributes would execute in the browser.

**Fix:** Replace `dangerouslySetInnerHTML` entirely. Parse the markdown-like formatting into React elements instead of HTML strings. No external library needed — the formatting only does bold, italic, and line breaks:

```typescript
// Instead of dangerouslySetInnerHTML, split content into segments
// and render <strong>, <em>, and <br/> as React elements
const renderContent = (content: string) => {
  // Safe React element rendering, no raw HTML injection
};
```

This eliminates the XSS vector completely without needing DOMPurify.

---

## Fix 2: SSRF in Badge PDF Export (badgePdfExport.ts)

**Current vulnerable code (lines 142-165):**
```typescript
const fetchImageAsBase64 = async (url: string): Promise<string | null> => {
  if (!url || url.startsWith('/') || url.startsWith('./')) {
    return null; // Only blocks local paths
  }
  const response = await fetch(url); // No other validation
```

An attacker-controlled `company_logo_url` or `photo_url` stored in the database could point to `http://169.254.169.254/` (AWS metadata), `http://localhost:5432/` (internal Postgres), or any internal service. The function fetches it client-side, so this is a client-side SSRF rather than server-side — but it still exposes the browser's internal network access and can be used for internal port scanning.

The same pattern exists in `applicationExportUtils.ts` (line 80).

**Fix:** Add an allowlist validator before `fetch()`:

```typescript
const isAllowedImageUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    // Only allow https
    if (parsed.protocol !== 'https:') return false;
    // Block private IP ranges and localhost
    const hostname = parsed.hostname;
    if (hostname === 'localhost') return false;
    if (/^127\./.test(hostname)) return false;
    if (/^10\./.test(hostname)) return false;
    if (/^192\.168\./.test(hostname)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return false;
    if (hostname === '169.254.169.254') return false;
    return true;
  } catch {
    return false;
  }
};
```

Apply this check in both `badgePdfExport.ts` and `applicationExportUtils.ts`.

---

## Fix 3: Exposed Mapbox Secret Token (get-mapbox-token)

**Current state:** The `get-mapbox-token` edge function has no authentication. Any caller — including unauthenticated ones — can hit this endpoint and receive the Mapbox secret token (`MapBox` env variable). The audit (C-03) describes this as allowing "complete takeover of the Mapbox account."

**Fix per Notion spec:** Add JWT authentication to the endpoint. The function will validate the Supabase auth token from the Authorization header before returning the token. Unauthenticated callers receive 401.

```typescript
// Extract and verify the user's JWT
const authHeader = req.headers.get('Authorization');
if (!authHeader) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
const supabase = createClient(url, anonKey, {
  global: { headers: { Authorization: authHeader } }
});
const { data: { user }, error } = await supabase.auth.getUser();
if (error || !user) {
  return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
}
// Now safe to return token
```

The CORS wildcard on this function is also fixed as part of Fix 5 below.

---

## Fix 4: Twilio Webhook Signature Validation (twilio-webhook)

**Current state (confirmed):** The `twilio-webhook/index.ts` function receives incoming SMS, processes them, and stores messages — but performs zero validation of the `X-Twilio-Signature` header. Any HTTP POST to the function endpoint will be processed as a legitimate Twilio message.

**Fix:** Implement HMAC-SHA1 signature validation using the Twilio auth token. The signature is computed over the full URL + sorted POST parameters:

```typescript
import { createHmac } from "https://deno.land/std/crypto/mod.ts";

async function validateTwilioSignature(
  authToken: string,
  signature: string,
  url: string,
  params: Record<string, string>
): Promise<boolean> {
  // Sort params, build validation string
  const sortedKeys = Object.keys(params).sort();
  let validationStr = url;
  for (const key of sortedKeys) {
    validationStr += key + params[key];
  }
  // HMAC-SHA1
  const key = new TextEncoder().encode(authToken);
  const data = new TextEncoder().encode(validationStr);
  const hmac = createHmac("sha1", key);
  hmac.update(data);
  const expected = btoa(String.fromCharCode(...new Uint8Array(await hmac.digest())));
  return expected === signature;
}
```

The `TWILIO_AUTH_TOKEN` secret is required for this. If it is already configured in the project secrets, it will be used. If not, the user will need to add it.

---

## Fix 5: Wildcard CORS on All Edge Functions

**Current state:** 90 files contain `'Access-Control-Allow-Origin': '*'`. The audit says 29 — the actual count is higher because more functions have been added since.

**The right approach for this project:** The app is deployed at `https://commandx-craft.lovable.app` (published URL) and `https://id-preview--76ab7580-4e0f-4011-980d-d7fa0d216db7.lovable.app` (preview URL). The CORS headers should allow both origins.

However, there is an important nuance: some functions are called from **external systems** that legitimately need open CORS:
- `twilio-webhook` — called directly by Twilio's servers (not a browser, so CORS doesn't apply; wildcard is irrelevant but harmless)
- `quickbooks-webhook` — called by Intuit's servers (same — not a browser)
- Portal/onboarding functions (`lookup-applicant`, `approve-estimate`, `get-estimate-for-approval`) — called from the app by potentially unauthenticated users

**Strategy:**
- Functions called only by authenticated app users: restrict to app origins
- Webhook receivers (`twilio-webhook`, `quickbooks-webhook`): CORS headers are irrelevant (server-to-server) but will be restricted for consistency
- Public portal functions: restrict to app origins (portal users access through the app)

A shared CORS helper will be created in `supabase/functions/_shared/cors.ts`:

```typescript
export const ALLOWED_ORIGINS = [
  'https://commandx-craft.lovable.app',
  'https://id-preview--76ab7580-4e0f-4011-980d-d7fa0d216db7.lovable.app',
];

export function getCorsHeaders(req: Request) {
  const origin = req.headers.get('Origin') || '';
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };
}
```

All 90 functions will be updated to use this helper instead of the hardcoded wildcard. This is a mechanical change — the content of each function does not change, only the `corsHeaders` object and its usage.

---

## Files to Create

| File | Purpose |
|------|---------|
| `supabase/functions/_shared/cors.ts` | Shared CORS helper with allowed origins allowlist |

## Files to Modify

| File | Change |
|------|--------|
| `src/components/ai-assistant/ChatMessage.tsx` | Replace `dangerouslySetInnerHTML` with safe React element rendering |
| `src/utils/badgePdfExport.ts` | Add `isAllowedImageUrl` validator before all `fetchImageAsBase64` calls |
| `src/utils/applicationExportUtils.ts` | Same SSRF fix for the second `fetchImageAsBase64` function |
| `supabase/functions/get-mapbox-token/index.ts` | Add JWT authentication before returning token |
| `supabase/functions/twilio-webhook/index.ts` | Add Twilio HMAC-SHA1 signature validation |
| All 90 edge function `index.ts` files | Replace `Access-Control-Allow-Origin: *` with the shared CORS helper |

---

## What Is Out of Scope for Lovable

| Item | Reason | Action Required |
|------|--------|-----------------|
| Remove .env from Git history | Requires `git-filter-repo` CLI on the repo host | Manus must run locally |
| Electron auto-updater signature | Electron binary config, not web code | Manus must configure in electron build pipeline |
| npm audit (36 vulns) | Package updates can break things; needs testing | Can update specific safe packages (jspdf is already updated to v3.0.4 in package.json — C-04 may already be resolved) |

---

## Prerequisite: Twilio Auth Token Secret

Fix 4 (Twilio signature validation) requires `TWILIO_AUTH_TOKEN` to be available as a secret in the edge function environment. Before implementing, the current secrets will be checked. If it is not already configured, it will need to be added before the Twilio fix can be deployed.

---

## Risk Assessment

- **XSS fix:** Zero risk — removes `dangerouslySetInnerHTML` and replaces with typed React rendering. No UI change visible to users.
- **SSRF fix:** Zero risk — adds validation before fetch calls. Images from legitimate URLs (Supabase storage, S3, CDN) all pass https validation. Only private/internal URLs are blocked.
- **Mapbox auth:** Low risk — any code that calls `get-mapbox-token` must be authenticated (logged-in users). The geocode function uses the token server-side and is unaffected.
- **Twilio signature:** Low risk for authenticated flow. Risk: if `TWILIO_AUTH_TOKEN` secret is wrong, real Twilio messages will be rejected. Will add a dev-mode bypass flag.
- **CORS:** Medium risk — any external integration that currently relies on the wildcard (e.g., a tool hitting functions from a non-app domain) will break. Webhooks from Twilio/Intuit are server-to-server and unaffected by CORS. The main risk is the preview URL vs. the published URL — both are included in the allowlist.

---

## Success Criteria (Notion Phase 0 Checklist)

- AI chat renders bold/italic/line breaks without any raw HTML injection
- Badge PDF generation only fetches images from https:// public URLs — internal network URLs are rejected
- Mapbox token endpoint returns 401 to unauthenticated callers
- Twilio webhook rejects requests with invalid or missing signature
- All 90 edge functions respond with the specific app origin instead of `*` in CORS headers
- The above items check off 5 of the 8 Phase 0 tasks in the Notion tracker
