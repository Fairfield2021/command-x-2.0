

# Phase 4a — New Navigation Shell

## Overview
Replace the current ERP-style 3-panel layout (MegaMenu + LeftPanel + RightPanel + BottomNav + MobileDrawer) with a clean 5-section navigation organized around **Home, Workspace, People, Company, and Global Actions**.

## Current State (what we're replacing)
- **TopNavBar** with horizontal MegaMenu (Transactions, Lists, Reports, Setup dropdowns)
- **LeftPanel** — collapsible sidebar with recent pages, reminders, alerts, trash, messages
- **RightPanel** — collapsible sidebar with KPI meters and quick stats
- **BottomNav** — mobile bottom tab bar (Home, Jobs, FAB, Sales, More)
- **MobileDrawer** — full mobile navigation sheet
- **QuickCreateMenu** — dropdown with "New Estimate/Invoice/PO/Bill" (legacy links)
- **GlobalSearch** — basic command palette (page-only, no data search)

## New Navigation Structure

### Desktop: Sidebar + Slim Header
A vertical sidebar replaces the horizontal MegaMenu and side panels. Five sections:

```text
+------------------+----------------------------------------+
|  SIDEBAR         |  SLIM HEADER (search, user, actions)   |
|                  +----------------------------------------+
|  [Logo]          |                                        |
|                  |                                        |
|  HOME            |         MAIN CONTENT AREA              |
|    Dashboard     |                                        |
|                  |                                        |
|  WORKSPACE       |                                        |
|    Jobs/Projects |                                        |
|    Estimates     |                                        |
|    Invoices      |                                        |
|    Purchase Ord. |                                        |
|    Vendor Bills  |                                        |
|    Time Tracking |                                        |
|                  |                                        |
|  PEOPLE          |                                        |
|    Personnel     |                                        |
|    Customers     |                                        |
|    Vendors       |                                        |
|                  |                                        |
|  COMPANY         |                                        |
|    Settings      |                                        |
|    User Mgmt     |                                        |
|    Permissions   |                                        |
|    QuickBooks    |                                        |
|    Audit Logs    |                                        |
|                  |                                        |
|  [+ Create]      |                                        |
|  [Sign Out]      |                                        |
+------------------+----------------------------------------+
```

### Mobile: Bottom Tab Bar + Sheet Drawer
Five bottom tabs: **Home, Workspace, People, Company, + (Create)**. Tapping a section opens a sheet with its sub-items.

## Implementation Steps

### Step 1: Create new sidebar navigation component
**File:** `src/components/layout/navigation/AppNavigationSidebar.tsx`

- Vertical sidebar with 4 collapsible groups: Home, Workspace, People, Company
- Collapsible to icon-only mini mode (w-14 collapsed, w-60 expanded)
- Role-based filtering (admin items hidden for non-admins)
- Active route highlighting
- Logo at top, Global Create (+) button and Sign Out at bottom
- Uses existing Shadcn Sidebar primitives already in the project

### Step 2: Create new slim header
**File:** `src/components/layout/navigation/NavigationHeader.tsx`

- Slim bar (h-12) with: sidebar toggle, Global Search trigger, AI assistant, messages, notifications, session timer, user menu
- Reuses existing components: `AdminNotificationBell`, `SessionTimer`, user dropdown logic from current `TopNavBar`

### Step 3: Build Global Create (+) floating action
**File:** `src/components/layout/navigation/GlobalCreateMenu.tsx`

- Button in sidebar bottom area (desktop) and center tab (mobile)
- Quick creation items: New Job, New Customer, New Vendor, New Personnel
- Opens a popover/dialog with minimal inline forms (not full page navigations)
- Replaces the old `QuickCreateMenu` which linked to deleted routes

### Step 4: Upgrade Global Search to command palette
**File:** `src/components/layout/navigation/GlobalCommandPalette.tsx`

- Cmd+K / Ctrl+K keyboard shortcut (already partially works)
- Add live data search: query jobs, customers, vendors, personnel from database
- Keep existing page navigation shortcuts
- Uses existing `CommandDialog` from cmdk (already installed)
- No new backend needed -- uses existing Supabase queries

### Step 5: Create new layout wrapper
**File:** `src/components/layout/navigation/NavigationLayout.tsx`

- Replaces `NetSuiteLayout` as the route wrapper in App.tsx
- Structure: Sidebar + (Header + Content area)
- Mobile: Header + Content + Bottom tabs
- Retains `DashboardDraftProvider` and `BackgroundMediaLayer`

### Step 6: Create mobile bottom navigation
**File:** `src/components/layout/navigation/MobileBottomNav.tsx`

- 5 tabs: Home, Workspace, People, Company, + (Create)
- Tapping a section navigates to its index page
- + button opens Global Create sheet
- Replaces current `BottomNav`

### Step 7: Wire into App.tsx
- Replace `<NetSuiteLayout />` with `<NavigationLayout />` in the route wrapper
- Remove `<BottomNav>` from the app root
- Keep old components in place (hidden, not deleted) as a safety net per the Phase 4a spec

### Step 8: Test all existing pages
- Verify every current route renders correctly inside the new shell
- No functionality changes -- just a new navigation wrapper
- Test on both desktop and mobile viewports

## Files Created (new)
| File | Purpose |
|---|---|
| `src/components/layout/navigation/AppNavigationSidebar.tsx` | Main sidebar with 4 section groups |
| `src/components/layout/navigation/NavigationHeader.tsx` | Slim top header bar |
| `src/components/layout/navigation/GlobalCreateMenu.tsx` | Global + button with quick create actions |
| `src/components/layout/navigation/GlobalCommandPalette.tsx` | Enhanced Cmd+K search with data queries |
| `src/components/layout/navigation/NavigationLayout.tsx` | New layout wrapper |
| `src/components/layout/navigation/MobileBottomNav.tsx` | Mobile bottom tab bar |
| `src/components/layout/navigation/index.ts` | Barrel export |

## Files Modified
| File | Change |
|---|---|
| `src/App.tsx` | Swap `NetSuiteLayout` for `NavigationLayout`; hide `BottomNav` |

## Files NOT Deleted (safety net)
All existing navigation components remain in place but are no longer imported/used:
- `src/components/layout/netsuite/MegaMenu.tsx`
- `src/components/layout/netsuite/LeftPanel.tsx`
- `src/components/layout/netsuite/RightPanel.tsx`
- `src/components/layout/netsuite/TopNavBar.tsx`
- `src/components/layout/netsuite/MobileDrawer.tsx`
- `src/components/layout/netsuite/QuickCreateMenu.tsx`
- `src/components/layout/netsuite/GlobalSearch.tsx`
- `src/components/layout/BottomNav.tsx`

## Navigation Item Mapping (old location -> new section)

| Page | New Section |
|---|---|
| Dashboard | Home |
| Jobs, Projects, Sales | Workspace |
| Estimates, Invoices, POs, Vendor Bills | Workspace |
| Time Tracking, Project Assignments | Workspace |
| Document Center, Messages, Vendor Documents | Workspace |
| Personnel, Customers, Vendors | People |
| Applications, Badge Templates | People |
| Settings, User Management, Permissions | Company |
| QuickBooks, Audit Logs | Company |
| Products | Workspace |

## Risk Assessment
**Low risk.** This is a wrapper change only. All existing page components, routes, and data queries remain untouched. Old navigation components are hidden but not deleted, allowing instant rollback by swapping the import back.

