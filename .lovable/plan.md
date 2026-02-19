

# Step 2: RBAC and RLS Hardening

## Current State Analysis

The project already has a well-established RBAC system:

- **`user_roles`** table with `app_role` enum: `admin`, `manager`, `user`, `personnel`, `vendor`, `accounting`
- **`user_permissions`** table with 25 modules and granular `can_view/can_add/can_edit/can_delete` flags
- **`project_assignments`** table linking users to projects (with `project_role` column)
- **`has_role()`** and **`has_permission()`** security definer functions already exist
- **RLS is enabled on all tables** (100% coverage)
- Existing RLS policies use `has_role()` properly to avoid recursion

**Creating new `departments`, `roles`, `permissions`, `role_permissions` tables would duplicate the existing system and risk conflicts.** Instead, this plan hardens the existing RBAC with the security gaps identified below.

## Security Gaps Found

### Gap 1: Regular users (`user` role) can see ALL projects
The policy `Staff can view all projects` grants SELECT to anyone with `admin`, `manager`, OR `user` role -- meaning every regular user sees every project regardless of assignment.

### Gap 2: Financial tables have no project-scoping for regular users
Invoices, estimates, purchase orders, change orders, and vendor bills let any `user` role view ALL records. There is no restriction to assigned projects.

### Gap 3: Several tables use overly permissive `qual: true`
Tables like `project_documents`, `project_task_orders`, `po_addendums`, and `expense_categories` have SELECT policies with `qual: true` (anyone authenticated can see everything).

### Gap 4: Accounting role is missing from financial RLS policies
The `accounting` role should have access to financial tables but is not referenced in most RLS policies.

### Gap 5: No `is_assigned_to_project()` helper function
Project-scoped access checks are currently done ad-hoc. A reusable security definer function would simplify and secure all project-scoped policies.

## What Will Change

### 1. New Database Function: `is_assigned_to_project()`

A `SECURITY DEFINER` function that checks if a user is assigned to a specific project via the `project_assignments` table.

```text
is_assigned_to_project(user_id, project_id) -> boolean
```

### 2. Replace Overly Permissive Projects Policy

**Drop**: `Staff can view all projects` (gives all users access to everything)

**Add**: `Users can view assigned projects` -- restricts `user` role to only projects in `project_assignments`.

Admin, manager, and accounting roles retain full access.

### 3. Harden Financial Table Policies

For `invoices`, `estimates`, `purchase_orders`, `change_orders`, and `vendor_bills`:

- **Drop** the existing `Staff can view` policies that grant blanket access to `user` role
- **Add** new policies that:
  - Admin/manager/accounting: full view access
  - `user` role: can only view records linked to their assigned projects

### 4. Harden Operational Table Policies

For `project_documents`, `project_task_orders`:

- **Drop** `Authenticated users can view` (qual: true) policies
- **Add** policies scoped to admin/manager OR project assignment

### 5. Add Accounting Role to Financial Policies

Update ALL/manage policies on financial tables to include `accounting` role alongside `admin` and `manager`.

### 6. Add Performance Indexes

Add indexes on columns used in RLS policy subqueries to prevent performance degradation.

## Tables Affected

| Table | Current Issue | Fix |
|-------|--------------|-----|
| `projects` | `user` role sees all | Scope to assignments |
| `invoices` | `user` role sees all | Scope to project assignments |
| `estimates` | `user` role sees all | Scope to project assignments |
| `purchase_orders` | `user` role sees all | Scope to project assignments |
| `change_orders` | `user` role sees all | Scope to project assignments |
| `vendor_bills` | `user` role sees all | Scope to project assignments |
| `project_documents` | `qual: true` (anyone) | Scope to admin/manager or assignments |
| `project_task_orders` | `qual: true` (anyone) | Scope to admin/manager or assignments |
| `po_addendums` | `qual: true` (anyone) | Scope to admin/manager or assignments |

## What Will NOT Change

- The existing `user_roles` and `user_permissions` tables (already correct architecture)
- The existing `has_role()` and `has_permission()` functions
- The `app_role` enum (already has all needed roles)
- The `project_assignments` table structure
- Admin/manager full-access policies (these stay as-is)
- Vendor and personnel portal access patterns

## Technical Details

### Migration SQL (Single File)

The migration will:

1. Create `is_assigned_to_project()` security definer function
2. Drop 9 overly permissive policies
3. Create 12 replacement policies with proper scoping
4. Add accounting role to 6 financial management policies
5. Add 2 performance indexes on `project_assignments(user_id)` and `project_assignments(project_id)`

### Frontend Code Changes

**None required.** The existing `usePermissionCheck` hook and `useUserRole` hook already handle the client-side permission logic correctly. RLS changes are transparent to the frontend -- queries will simply return fewer rows for unprivileged users.

### Rollback Strategy

Each policy change is paired with a comment containing the original policy definition, enabling manual rollback if needed.

### Risk Assessment

- **Low risk**: Admin and manager access is unchanged
- **Medium risk**: Users with `user` role who previously saw all projects will now only see assigned ones. If project assignments are missing, those users will see nothing until assigned.
- **Mitigation**: Before applying, we can query how many users have `user` role and whether they have project assignments to estimate impact.

