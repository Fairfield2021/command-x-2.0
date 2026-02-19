# Contributing to CommandX 2.0

## Branch Protection (GitHub Setup Required)

The `main` branch must have the following protection rules configured in **GitHub → Settings → Branches → Branch protection rules**:

1. **Require pull request reviews** — minimum 1 approval before merging
2. **Require status checks to pass** — ensure CI/build succeeds
3. **Require branches to be up to date** — prevent merge conflicts
4. **Include administrators** — no bypassing for anyone

## PR Workflow

1. Create a feature branch from `main`: `git checkout -b feature/your-feature`
2. Make changes and commit with clear messages
3. Push and open a Pull Request against `main`
4. Wait for at least 1 approval and passing status checks
5. Merge via squash merge (preferred) or merge commit

## Environment Setup

1. Copy `.env.example` to `.env`
2. Fill in your project-specific values (never commit `.env`)
3. For edge function secrets, configure them in **Lovable Cloud → Settings → Connectors → Secrets**

## Security Checklist Before Merging

- [ ] No `.env` files or secrets in the diff
- [ ] No `SUPABASE_SERVICE_ROLE_KEY` used in client-side code (`src/`)
- [ ] Edge functions use service-role key only server-side
- [ ] New tables have RLS policies
- [ ] Financial mutations use append-only patterns (no destructive edits)

## Git History Cleanup (One-Time)

If `.env` was previously committed, run locally:

```bash
# Using BFG Repo-Cleaner (recommended)
bfg --delete-files .env
git reflog expire --expire=now --all && git gc --prune=now --aggressive

# Then force push (coordinate with team first!)
git push --force
```

This cannot be done through the Lovable editor — it must be run locally.
