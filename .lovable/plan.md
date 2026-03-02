

# T&M Hooks + Enum Migration

## 1. Database migration — extend `tm_ticket_status` enum
Add values: `open`, `cap_reached`, `pending_approval`, `converted_to_co` to existing `tm_ticket_status` enum.

## 2. Create `src/hooks/useTMTicketEntries.ts` (new file)
- **`useTMTicketEntries(ticketId)`** — select from `tm_ticket_entries` where `tm_ticket_id = ticketId`, order by `entry_date DESC, created_at DESC`, key `['tm-ticket-entries', ticketId]`
- **`useCreateTMTicketEntry()`** — insert mutation; pre-fetch ticket status, reject with toast if `cap_reached`; invalidate `['tm-ticket-entries']` and `['tm-tickets']`
- **`useDeleteTMTicketEntry()`** — delete mutation; invalidate same keys

## 3. Enhance `useApproveTMTicket` in `src/integrations/supabase/hooks/useTMTickets.ts`
- Accept `{ id, approved_by }` 
- Set `approved_by`, `approval_date`, increment `cap_hours` by 10, reset status to `open`
- Invalidate `['tm-tickets']`, `['tm-ticket']`, **and `['tm-ticket-entries']`** so entry form disabled state refreshes

## Files
- New migration SQL
- `src/hooks/useTMTicketEntries.ts` (new)
- `src/integrations/supabase/hooks/useTMTickets.ts` (modify `useApproveTMTicket` only)

