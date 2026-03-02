

# Create `src/components/project-hub/tm/TMTicketCard.tsx`

New file only — no existing files modified.

## Component Structure

An expandable card using `Collapsible` from shadcn/ui that displays a T&M ticket with time entry logging.

### Props
- `ticket`: uses the DB row type from `tm_tickets` (with `cap_hours`, `hours_logged`, `hourly_rate`, `materials_cost`, `total_amount`, `before_photo_url`, `after_photo_url`, `approved_by`, `approval_date`, `status`)
- `currentUserId: string | null`

### Header (always visible)
- **Ticket number** (bold) + **description** (1-line truncated)
- **Custom status badge** (not using `StatusBadge` since it lacks `cap_reached`/`converted_to_co`/`invoiced`):
  - `open` → blue
  - `cap_reached` → amber, "Cap Reached - Approval Required"
  - `pending_approval` → amber
  - `approved` → green
  - `invoiced` → teal
  - `converted_to_co` → purple
- **Hours progress bar** using `Progress` component with dynamic color:
  - Green `<80%`, amber `80-99%`, red `≥100%`
  - Label: `"X / Y hrs"`
- **Total amount** + **hourly rate** (`@ $XX/hr`)

### Expanded Content (Collapsible)
- Full description
- Materials cost (inline editable via `useUpdateTMTicket` if status is `open`)
- Before/after photo thumbnails (display if URL exists, placeholder otherwise)
- **Time entries section**:
  - List from `useTMTicketEntries(ticket.id)` — date, hours, description
  - Inline "Log Hours" form: date picker, hours (step 0.25), description, Add button
  - Form **disabled** when status is `cap_reached`, `converted_to_co`, or `invoiced` with message
- **Action buttons** by status:
  - `cap_reached`: "Approve & Extend (+10 hrs)" green button → `useApproveTMTicket`, "Convert to Change Order" purple button (placeholder)
  - `approved`: show approval info text

### Hooks Used
- `useTMTicketEntries` + `useCreateTMTicketEntry` + `useDeleteTMTicketEntry` from `src/hooks/useTMTicketEntries.ts`
- `useApproveTMTicket` from `src/integrations/supabase/hooks/useTMTickets.ts`
- `useUpdateTMTicket` from same file (for inline materials cost edit)

### UI Components
- `Card`, `Collapsible`/`CollapsibleTrigger`/`CollapsibleContent`, `Progress`, `Badge`, `Button`, `Input`, `Label`, date picker via `Popover` + `Calendar`

### File
- `src/components/project-hub/tm/TMTicketCard.tsx` (new, ~300 lines)

