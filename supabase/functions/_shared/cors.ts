/**
 * Shared CORS helper for CommandX edge functions.
 * Restricts Access-Control-Allow-Origin to known app origins
 * instead of the insecure wildcard '*'.
 */

export const ALLOWED_ORIGINS = [
  "https://commandx-craft.lovable.app",
  "https://id-preview--76ab7580-4e0f-4011-980d-d7fa0d216db7.lovable.app",
];

export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin)
    ? origin
    : ALLOWED_ORIGINS[0];

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  };
}
