

# Step 1: Repository and Environment Security Lockdown

## Summary

This plan hardens the project's environment security by updating `.gitignore`, adding a `.env.example` template, and documenting the setup. The client-side code is already clean (no service-role keys in the `src/` directory), and edge functions correctly use `SUPABASE_SERVICE_ROLE_KEY` server-side only.

## What's Already Secure

- The Supabase client (`src/integrations/supabase/client.ts`) only uses the anon key -- no service-role keys are exposed to the browser.
- All 77 edge functions that use `SUPABASE_SERVICE_ROLE_KEY` do so server-side (Deno runtime), which is the correct pattern.

## What Needs Fixing

### 1. Update `.gitignore` to block sensitive files

The current `.gitignore` is missing rules for `.env`, keystores, and mobile platform secrets. We'll add:

```text
# Environment files
.env
.env.local
.env.*.local
.env.production
.env.development

# Secrets and keys
*.keystore
*.jks
android/local.properties
ios/App/GoogleService-Info.plist
```

Note: The `.env` file in this project is auto-managed by Lovable Cloud and cannot be deleted. Adding it to `.gitignore` prevents it from being committed if the project is pushed to GitHub.

### 2. Create `.env.example`

A safe template file documenting what environment variables are needed, with placeholder values only:

```text
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_BUILD_TIMESTAMP=auto-generated
```

### 3. Add `verify_jwt = false` to `supabase/config.toml` for public endpoints

Currently `config.toml` only has the project ID. We need to add JWT verification settings for webhook/public endpoints that must accept unauthenticated requests (e.g., `quickbooks-webhook`, `twilio-webhook`, vendor onboarding acceptance). All other functions will use the default (JWT required) or validate in code.

### 4. Update `README.md`

Add a section documenting required environment variables and the secrets needed in Lovable Cloud for edge functions.

## Out of Scope (Cannot Be Done Here)

- **Git history cleaning** (removing `.env` from past commits) -- this requires running `git filter-branch` or BFG locally, not through Lovable's editor.
- **GitHub branch protection rules** -- these must be configured in GitHub's repository settings UI.
- Both are documented in the README for the team to complete manually.

## Technical Details

### Files Modified

| File | Change |
|------|--------|
| `.gitignore` | Add env, keystore, and secrets rules |
| `supabase/config.toml` | Add `verify_jwt = false` for public webhook functions |

### Files Created

| File | Purpose |
|------|---------|
| `.env.example` | Safe placeholder template for environment variables |
| `CONTRIBUTING.md` | PR workflow and branch protection documentation |

### Edge Functions Requiring `verify_jwt = false`

These functions accept external webhooks or unauthenticated public form submissions:

- `quickbooks-webhook` (Intuit webhook callbacks)
- `twilio-webhook` (Twilio SMS callbacks)
- `accept-vendor-invitation` (public vendor onboarding)
- `accept-portal-invitation` (public portal access)
- `get-estimate-for-approval` (public estimate approval links)
- `process-co-signature` (public change order signatures)

All other functions keep JWT validation (either default or in-code).

