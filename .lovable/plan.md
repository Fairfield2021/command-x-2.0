

# Phase 4b — Job Hub (Tabbed Interface)

## Overview
Transform the current monolithic `ProjectDetail.tsx` (979 lines of vertically stacked sections) into a clean tabbed Job Hub. The data fetching and business logic already exist -- this is a UI reorganization.

## Current State
`ProjectDetail.tsx` renders everything in one long scroll:
- Progress bar, Financial Summary, Labor Allocation
- Project info cards (Status, Customer, Timeline, Address, POC)
- Rate Brackets, Applicants, Personnel, Assets, Rooms
- Milestones, Estimates, Job Orders, Invoices
- Vendor Bills, Change Orders, T&M Tickets, Purchase Orders
- Time Entries, Documents, Activity Timeline

All the sub-components already exist in `src/components/project-hub/`.

## New Structure: 5 Tabs

```text
[Overview] [Financials] [Documents] [Team] [Activity]
```

| Tab | Contents |
|---|---|
| **Overview** | Project info cards (status, customer, timeline, address, POC, description), Progress bar, Milestones, Rooms |
| **Financials** | Financial Summary, Labor Allocation, Estimates, Job Orders, Invoices, Vendor Bills, Change Orders, T&M Tickets, Purchase Orders, Time Entries |
| **Documents** | Project Documents (existing ProjectDocuments component) |
| **Team** | Rate Brackets, Applicants, Assigned Personnel, Asset Assignments |
| **Activity** | Activity Timeline |

## Implementation Steps

### Step 1: Create tab content components
Extract each tab's content into its own component to keep things clean:

| File | Purpose |
|---|---|
| `src/components/project-hub/tabs/JobHubOverviewTab.tsx` | Project info, progress, milestones, rooms |
| `src/components/project-hub/tabs/JobHubFinancialsTab.tsx` | All financial sections |
| `src/components/project-hub/tabs/JobHubDocumentsTab.tsx` | Document center wrapper |
| `src/components/project-hub/tabs/JobHubTeamTab.tsx` | Personnel, applicants, rate brackets, assets |
| `src/components/project-hub/tabs/JobHubActivityTab.tsx` | Activity timeline |

### Step 2: Refactor ProjectDetail.tsx into tabbed layout
- Keep all existing data fetching hooks at the top (unchanged)
- Replace the vertical stack with a `Tabs` component (Radix, already installed)
- Each `TabsContent` renders the corresponding tab component
- Pass down the already-fetched data as props (no new queries)
- URL hash support: `#financials`, `#team`, etc. so tabs are linkable

### Step 3: Update Jobs list page
- `Jobs.tsx` currently links to `/projects/:id` -- keep this behavior
- Update the sidebar nav to point `/jobs` at the Jobs list page (already done in Phase 4a)

### Step 4: Update the Notion tracker
- Mark Phase 4b tasks as in-progress

## Technical Details

### Data flow (no changes to queries)
All hooks remain in `ProjectDetail.tsx`. Data is passed down to tab components as props. This avoids duplicate fetching and keeps the single-page data model intact.

### Tab persistence
- Default tab: Overview
- Active tab stored in URL hash (`/projects/:id#financials`)
- Switching tabs does not re-fetch data (all fetched on mount)

### Milestone dialog
The milestone create/edit dialog and its state management stay in `ProjectDetail.tsx` since it's triggered from the Overview tab but belongs to the page-level scope.

## Files Created (new)
| File | Purpose |
|---|---|
| `src/components/project-hub/tabs/JobHubOverviewTab.tsx` | Overview tab content |
| `src/components/project-hub/tabs/JobHubFinancialsTab.tsx` | Financials tab content |
| `src/components/project-hub/tabs/JobHubDocumentsTab.tsx` | Documents tab content |
| `src/components/project-hub/tabs/JobHubTeamTab.tsx` | Team tab content |
| `src/components/project-hub/tabs/JobHubActivityTab.tsx` | Activity tab content |

## Files Modified
| File | Change |
|---|---|
| `src/pages/ProjectDetail.tsx` | Replace vertical layout with Tabs; delegate sections to tab components |

## Risk Assessment
**Low risk.** No new data queries, no schema changes, no new routes. All existing sub-components are reused as-is. This is purely a UI reorganization of content that already renders correctly.

