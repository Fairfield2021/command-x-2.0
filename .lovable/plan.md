

# Testing All 4 Role-Based Dashboards

## Current Blocker

Only one user exists in the system: `chris.guevara97@gmail.com` with role `admin`. No personnel or vendor records are linked to any user. This means only the Owner dashboard can be tested live today.

## Test Strategy

Since creating new auth users requires signup flows (not SQL), the fastest path is to **temporarily rotate the existing user's role** through each dashboard, verify rendering, then restore to `admin`.

### Step-by-step execution

**1. Owner Dashboard (current state — already verified)**
- Role: `admin`
- Renders: `RowBasedDashboard` with KPIs, quick actions, revenue chart
- Status: PASS (verified in prior sprint)

**2. PM Dashboard — change role to `manager`**
- Update `user_roles` to set role = `manager` for the current user
- Reload `/` — should render `PMDashboard`
- Verify: KPI strip (Active Jobs, Upcoming Milestones, In Progress, On Hold), My Active Jobs list, Milestones card
- Data will show empty states since no project assignments exist for this user via `project_assignments`, which is correct behavior
- Test on mobile viewport (390px) for responsive layout

**3. Accounting Dashboard — change role to `accounting`**
- Update `user_roles` to set role = `accounting`
- Reload `/` — should render `AccountingDashboard`
- Verify: KPI strip (Outstanding, Overdue, Pending Invoices, QBO status), Overdue Payments list, Pending Invoices list, Invoice Aging summary
- Data will pull from existing invoices table (seeded data from earlier sprint)
- Test on mobile viewport

**4. Field Crew Dashboard — change role to `admin` + link personnel record**
- The `FieldCrewDashboard` renders when `isPersonnel === true` (checked via `personnel` table, not `user_roles`)
- Need to: create a personnel record with `user_id` = current user, AND ensure role is NOT `admin`/`manager` (those override personnel redirect)
- Temporarily set role to `user` and insert a personnel record
- Reload `/` — should render `FieldCrewDashboard`
- Verify: date header, clock status card, today's schedule (empty state), my projects list
- Test on mobile viewport (this dashboard is mobile-first with `max-w-lg mx-auto`)

**5. Restore admin role**
- Delete the temporary personnel record
- Set role back to `admin`

### What gets tested

| Dashboard | Component | Key elements verified |
|---|---|---|
| Owner | `RowBasedDashboard` | KPIs, quick actions, revenue chart, recent invoices |
| PM | `PMDashboard` | Active jobs list, milestones, KPI counts |
| Accounting | `AccountingDashboard` | Outstanding/overdue amounts, invoice lists, QBO status, aging chart |
| Field Crew | `FieldCrewDashboard` | Date header, clock card, schedule, project links |

### Mobile testing

Each dashboard will be tested at 390x844 viewport to verify:
- Cards stack vertically
- No horizontal overflow
- Touch targets are adequate
- Field Crew dashboard's `max-w-lg` constraint works properly

### Data expectations

- Owner: sees all company data (invoices, estimates, projects)
- PM: empty "My Active Jobs" (no `project_assignments` for this user) — correct empty state
- Accounting: sees existing seeded invoices in overdue/pending lists
- Field Crew: empty schedule and projects — correct empty state since no schedules exist

### Risk

Temporarily changing the admin user's role means brief loss of admin access during testing. Each step restores access immediately after verification. No schema changes, no permanent data modifications.

