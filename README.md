# Welcome to your Construction Management Software

## Project info

fairfield.rg

## How can I edit this code?

There are several ways of editing your application.


**Use your preferred IDE**

If you want to work locally using your own IDE, you can clone this repo and push changes.

The only requirement is having Node.js & npm installed - [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating)

Follow these steps:

```sh
# Step 1: Clone the repository using the project's Git URL.
git clone <YOUR_GIT_URL>

# Step 2: Navigate to the project directory.
cd <YOUR_PROJECT_NAME>

# Step 3: Install the necessary dependencies.
npm i

# Step 4: Start the development server with auto-reloading and an instant preview.
npm run dev
```

**Edit a file directly in GitHub**

- Navigate to the desired file(s).
- Click the "Edit" button (pencil icon) at the top right of the file view.
- Make your changes and commit the changes.

**Use GitHub Codespaces**

- Navigate to the main page of your repository.
- Click on the "Code" button (green button) near the top right.
- Select the "Codespaces" tab.
- Click on "New codespace" to launch a new Codespace environment.
- Edit files directly within the Codespace and commit and push your changes once you're done.

## What technologies are used for this project?

- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS

## Environment Setup

1. Copy `.env.example` to `.env` and fill in your values
2. **Never commit `.env`** — it contains project-specific keys
3. Edge function secrets (Twilio, QuickBooks, Resend, OpenAI, MapBox) are managed via **Lovable Cloud → Settings → Connectors → Secrets**

### Required Client-Side Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Backend API URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Public anon key (safe for client) |
| `VITE_SUPABASE_PROJECT_ID` | Project identifier |

### Required Edge Function Secrets

| Secret | Purpose |
|--------|---------|
| `QUICKBOOKS_CLIENT_ID` | QuickBooks OAuth integration |
| `QUICKBOOKS_CLIENT_SECRET` | QuickBooks OAuth integration |
| `QUICKBOOKS_WEBHOOK_VERIFIER_TOKEN` | QuickBooks webhook validation |
| `TWILIO_ACCOUNT_SID` | SMS messaging |
| `TWILIO_AUTH_TOKEN` | SMS messaging |
| `TWILIO_PHONE_NUMBER` | SMS sender number |
| `RESEND_API_KEY` | Email delivery |
| `OPENAI` | AI features |
| `MapBox` | Geocoding and maps |
| `SITE_URL` | Application base URL for links |

## Security Notes

- **No service-role keys in client code** — only the publishable anon key is used browser-side
- **RLS enforced** — all tables use Row Level Security policies
- **RBAC** — role-based access via `user_roles` table (admin, manager, user, personnel, vendor)
- See `CONTRIBUTING.md` for PR workflow and branch protection setup

### Manual Steps Required (Outside Lovable)

1. **Clean git history** — if `.env` was previously committed, use BFG Repo-Cleaner locally (see `CONTRIBUTING.md`)
2. **GitHub branch protection** — configure in GitHub repo settings (see `CONTRIBUTING.md`)

To connect a domain, navigate to Project > Settings > Domains and click Connect Domain.

Read more here: [Setting up a custom domain](https://docs.lovable.dev/features/custom-domain#custom-domain)
