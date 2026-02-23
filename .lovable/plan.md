

# Phase 4c — People Directory

## Goal
Create a unified `/people` directory page that consolidates Personnel, Customers, and Vendors into a single searchable, filterable hub with category tabs — while preserving the existing detail pages (`/personnel/:id`, `/customers/:id`, `/vendors/:id`).

## Architecture Decision

**Tabbed directory, not a merged table.** Each entity type (Personnel, Customers, Vendors) has fundamentally different schemas, columns, actions, and workflows. Merging them into one table would lose too much context. Instead, we create a **single page with 3 category tabs** and a **shared search bar** that filters whichever tab is active.

```text
/people
  [All] [Personnel] [Customers] [Vendors]
  ┌─────────────────────────────────────┐
  │ Search across all people...         │
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │  Combined stats ribbon              │
  │  Personnel: 42  Customers: 18  ...  │
  └─────────────────────────────────────┘
  ┌─────────────────────────────────────┐
  │  Filtered list (cards on mobile,    │
  │  table on desktop)                  │
  └─────────────────────────────────────┘
```

## What Changes

### New Files

| File | Purpose |
|---|---|
| `src/pages/PeopleDirectory.tsx` | Main directory page with Radix Tabs for Personnel / Customers / Vendors, shared search bar, URL hash persistence (`#personnel`, `#customers`, `#vendors`) |
| `src/components/people/PeopleDirectoryStats.tsx` | Combined stats ribbon showing counts for all 3 entity types |
| `src/components/people/PeopleAllTab.tsx` | "All" tab showing a unified card list of all entity types, sorted by name, with a type badge on each card |

### Modified Files

| File | Change |
|---|---|
| `src/App.tsx` | Add `/people` route pointing to `PeopleDirectory`; keep legacy routes (`/personnel`, `/customers`, `/vendors`) working via redirect or as-is |
| `src/components/layout/navigation/AppNavigationSidebar.tsx` | Replace 3 separate People links (Personnel, Customers, Vendors) with single "Directory" link to `/people`; keep Applications, Badge Templates, Staffing Map as sub-items |
| `src/components/layout/navigation/MobileBottomNav.tsx` | Change "People" tab path from `/personnel` to `/people` |
| `.lovable/plan.md` | Update with Phase 4c completion notes |

### Unchanged (preserved)

- `/personnel`, `/customers`, `/vendors` pages remain intact — they become accessible via the directory tabs or direct URL
- `/personnel/:id`, `/customers/:id`, `/vendors/:id` detail pages untouched
- All existing hooks, forms, dialogs, import/export, QB sync, badges — reused as-is inside the tab panels

## Implementation Detail

### PeopleDirectory.tsx Structure

The directory page is a thin orchestration layer:

1. **Shared search bar** at the top — passes `search` state down to whichever tab is active
2. **Radix Tabs** with 4 triggers: All, Personnel, Customers, Vendors
3. **Tab content** renders the existing page internals (stats, filters, table/cards) as embedded components — not iframes or re-implementations
4. URL hash persistence: `#personnel`, `#customers`, `#vendors` (default: `#all`)

For the Personnel tab, we extract the core list/filter/action logic from `Personnel.tsx` into a reusable component `PersonnelDirectoryPanel` that can be embedded in both the standalone page and the directory. Same pattern for Customers and Vendors.

However, to minimize refactoring risk, the simpler approach is to **inline the existing page content directly into tab panels** by importing the key sub-components (stats, filters, table, dialogs) and composing them. The standalone pages (`/personnel`, `/customers`, `/vendors`) can then redirect to `/people#personnel` etc., or remain as legacy access points.

### "All" Tab

Shows a combined list of all people across types:
- Each row/card has a **type badge** (Personnel, Customer, Vendor)
- Sorted alphabetically by name
- Click navigates to the appropriate detail page
- Search filters across all three datasets simultaneously
- Capped display with "load more" or pagination

### Navigation Updates

Sidebar "People" section becomes:

```text
People
  Directory        → /people
  Applications     → /staffing/applications
  Badge Templates  → /badge-templates
  Staffing Map     → /staffing/map
```

### URL Structure

- `/people` — defaults to "All" tab
- `/people#personnel` — Personnel tab active
- `/people#customers` — Customers tab active
- `/people#vendors` — Vendors tab active
- Legacy routes `/personnel`, `/customers`, `/vendors` remain functional (no breaking changes)

## Implementation Steps

1. **Create `PeopleDirectory.tsx`** — tabbed page with shared search, Radix Tabs, URL hash persistence
2. **Create `PeopleDirectoryStats.tsx`** — combined stats ribbon using existing hooks (`usePersonnel`, `useCustomers`, `useVendors`)
3. **Create `PeopleAllTab.tsx`** — unified "All" view combining results from all 3 entity hooks
4. **Compose tab panels** — Personnel tab reuses `PersonnelStats`, `PersonnelFilters`, `PersonnelTable`, and dialog state from the existing page; same for Customers and Vendors
5. **Add route** in `App.tsx` for `/people`
6. **Update sidebar** — consolidate People section links
7. **Update mobile nav** — point People tab to `/people`

## Risk Assessment

**Low risk.** This is additive — a new page that composes existing components. No database changes. No existing pages are removed. Legacy routes remain functional. The main complexity is managing state (search, filters, dialogs) for 3 entity types within one page, but each tab panel manages its own filter/dialog state independently, with only the search bar shared.

## No Database Changes Required

This is purely a frontend consolidation. All existing tables, hooks, and RLS policies remain unchanged.

