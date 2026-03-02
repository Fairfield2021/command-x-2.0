

# Replace T&M Section in JobHubFinancialsTab

## What Changes

Replace line 409 (`<ProjectTMTicketsList .../>`) with a full collapsible T&M section matching the Change Orders pattern above it.

## Implementation (single file: `JobHubFinancialsTab.tsx`)

### New imports
- `useTMTicketsByProject` from `@/integrations/supabase/hooks/useTMTickets`
- `CreateTMTicketDialog` from `@/components/project-hub/tm/CreateTMTicketDialog`
- `TMTicketCard` from `@/components/project-hub/tm/TMTicketCard`

### New state & data
- `const [tmSectionOpen, setTmSectionOpen] = useState(true)`
- `const [tmDialogOpen, setTmDialogOpen] = useState(false)`
- `const { data: tmTicketsData } = useTMTicketsByProject(projectId)` — replaces the prop-based `tmTickets`

### Sorted tickets
Sort `tmTicketsData` by status priority: `cap_reached` first, then `open`, then `approved`, then everything else.

### Summary stats
- Total hours: sum of `hours_logged` across all tickets
- Total amount: sum of `total` across all tickets
- Open count: tickets with status `open`

### Attention indicator
Amber dot next to heading if any ticket has `status === 'cap_reached'`.

### Replace line 409 with collapsible section
Follows the exact Change Orders pattern (lines 275-375):
- `Collapsible` wrapper with `tmSectionOpen` state
- Header: `Receipt` icon + "T&M Tickets" + count `Badge` + amber dot if cap_reached + chevron + "+ New T&M Ticket" button
- Summary line: "Total Hours: X | Total Amount: $Y | Z tickets open"
- `CollapsibleContent`: map sorted tickets to `<TMTicketCard ticket={t} currentUserId={currentUserId} />`, or empty state card
- `<CreateTMTicketDialog>` at the bottom with `summary?.contract_id`

### Props cleanup
The `tmTickets` prop and `onAddTMTicket` prop are still accepted (no interface change) but ignored in favor of the hook-fetched data and local dialog state. No other files are modified.

