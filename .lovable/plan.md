

# Phase 4c — Role-Based Dashboards

## Role Mapping

The user references roles `owner`, `pm`, `field_crew`, `accounting`. The existing `app_role` enum is: `admin`, `manager`, `user`, `personnel`, `vendor`, `accounting`. The mapping:

| User's term | Existing `app_role` | Dashboard |
|---|---|---|
| owner | `admin` | OwnerDashboard |
| pm | `manager` | PMDashboard |
| field_crew | `personnel` (+ `isPersonnel` check) | FieldCrewDashboard |
| accounting | `accounting` | AccountingDashboard |
| (fallback) | `user`, `vendor`, null | OwnerDashboard |

No database changes needed. Role detection uses the existing `useUserRole()` hook which already returns `isAdmin`, `isManager`, `isAccounting`, `isPersonnel`, etc.

## Architecture

```text
src/pages/Index.tsx
  └─ RowBasedDashboard (existing, becomes OwnerDashboard wrapper)
  └─ OR PMDashboard (new)
  └─ OR FieldCrewDashboard (new)
  └─ OR AccountingDashboard (new)
```

The `Index.tsx` page uses `useUserRole()` to conditionally render the correct dashboard. The existing `RowBasedDashboard` (with WelcomeStrip, KPIBar, QuickActions, RecentInvoices, RevenueChart, InvoiceAging) becomes the Owner/Admin dashboard — it already shows company-wide KPIs.

## New Files

| File | Purpose |
|---|---|
| `src/components/dashboard/roles/PMDashboard.tsx` | My active jobs, upcoming milestones (7 days), pending approvals, crew alerts |
| `src/components/dashboard/roles/FieldCrewDashboard.tsx` | Today's assignment, clock in/out, job details, daily log form — mobile-first |
| `src/components/dashboard/roles/AccountingDashboard.tsx` | Pending invoices, overdue payments, QBO sync status, recent financial activity |

## Modified Files

| File | Change |
|---|---|
| `src/pages/Index.tsx` | Import `useUserRole`, conditionally render dashboard by role |
| `src/components/dashboard/rows/RowBasedDashboard.tsx` | No changes — remains the Owner/Admin dashboard as-is |

## Component Details

### PMDashboard

Reuses existing hooks:
- `useProjects()` — filter to projects assigned to current user via `project_assignments`
- `useMilestonesByProject()` — will need a new `useUpcomingMilestones()` hook or inline query for milestones across all my projects in next 7 days
- Uses `WelcomeStrip` at top
- Links each job to `/projects/:id`

New hook needed: `useMyProjects(userId)` — queries `project_assignments` to get the user's assigned projects, then fetches those projects. Or we filter client-side from `useProjects()` if assignment data is available.

Actually, looking at the existing `is_assigned_to_project` function and `project_assignments` table, we'll create a lightweight `useMyAssignedProjects` hook that joins `project_assignments` with `projects`.

For milestones across projects, we'll create `useUpcomingMilestones(projectIds, days)` that queries milestones due within N days for a set of project IDs.

### FieldCrewDashboard

Reuses:
- `useTodaysSchedule(personnelId)` — already exists in `usePersonnelSchedules.ts`
- `useOpenClockEntry(personnelId, projectId)` + `useClockIn`/`useClockOut` from `useTimeClock.ts`
- `DailyFieldLogForm` component — already built in Phase 4b
- `get_personnel_id_for_user` DB function — maps auth user to personnel record

Mobile-first layout: single column, large tap targets, clock button prominent at top.

### AccountingDashboard

Reuses:
- `useInvoices()` — filter for pending/overdue
- `QuickBooksSyncBadge` component
- `useQuickBooksConfig()` for sync status
- `RecentInvoicesTable` component (or adapted version)
- `InvoiceAgingSummary` component from existing dashboard

## Implementation Steps

1. **Create `useMyAssignedProjects` hook** — queries `project_assignments` joined with `projects` for the current user
2. **Create `useUpcomingMilestones` hook** — milestones across multiple projects due within 7 days
3. **Create `PMDashboard.tsx`** — WelcomeStrip, my jobs list with status indicators, milestones timeline, quick actions scoped to PM work
4. **Create `FieldCrewDashboard.tsx`** — today's schedule card, clock in/out button, job details, daily log form shortcut, mobile-first
5. **Create `AccountingDashboard.tsx`** — pending invoices table, overdue payments with days count, QBO sync badge, recent financial activity
6. **Update `Index.tsx`** — role-based conditional rendering with loading state

## Risk Assessment

**Low risk.** All dashboards are additive new components. The existing Owner dashboard (`RowBasedDashboard`) is unchanged. Two small new hooks are needed (`useMyAssignedProjects`, `useUpcomingMilestones`) but they follow established query patterns. No database changes required.

