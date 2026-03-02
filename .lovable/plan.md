

# Create `src/components/project-hub/tm/CreateTMTicketDialog.tsx`

New file, no existing files modified.

## Implementation

A simple form dialog following the `AddRoomDialog` pattern:
- Uses `useAddTMTicket` from `src/integrations/supabase/hooks/useTMTickets.ts` to insert
- Insert payload: `project_id`, `contract_id`, `description`, `hourly_rate`, `cap_hours`, `materials_cost`, `status: 'open'`, plus minimal required fields for the existing mutation (`ticket_number: ''`, `work_date: today`, `customer_id` from project lookup, `lineItems: []`, `tax_rate: 0`)
- On success: show toast with ticket number from response, reset form, close dialog
- Four fields: Description (textarea, required), Hourly Rate (number input, step 0.01, required), Hour Cap (number input, default 10, min 1), Initial Materials Estimate (number input, default 0)

**Note:** The existing `useAddTMTicket` mutation requires `customer_id`, `work_date`, `lineItems`, and `tax_rate`. Since the new dialog is for a simpler T&M workflow (hourly + materials, no line items), I'll insert directly via Supabase instead of using `useAddTMTicket`, then invalidate `['tm-tickets']` manually. This avoids coupling to the line-item-based flow.

## Technical Details

```
src/components/project-hub/tm/CreateTMTicketDialog.tsx (new)
├── Props: projectId, contractId, open, onOpenChange
├── State: description, hourlyRate, capHours (default 10), materialsCost (default 0)
├── Submit: supabase.from('tm_tickets').insert({...}).select().single()
│   → ticket_number: '' (auto by trigger)
│   → status: 'open'
│   → project_id, contract_id, description, hourly_rate, cap_hours, materials_cost
├── On success: toast("T&M Ticket {ticket_number} created"), invalidate queries, close
└── UI: Dialog > form > Textarea + 3 Inputs + Cancel/Create buttons
```

