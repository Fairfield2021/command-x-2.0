

# Create ConvertTMToChangeOrder + Wire into TMTicketCard

## New file: `src/components/project-hub/tm/ConvertTMToChangeOrder.tsx`

AlertDialog component that:
- Takes `ticket`, `projectId`, `contractId`, `onConvert` props
- Shows summary: hours, rate, materials, total
- On confirm:
  1. Insert `change_orders` record (reason = "T&M Conversion: " + description, change_type = 'additive', co_value = total, status/approval_status = 'draft')
  2. Insert `change_order_line_items` — one for labor (qty = hours_logged, unit_price = hourly_rate), and if materials_cost > 0, a second line for materials (qty = 1, unit_price = materials_cost)
  3. Update `tm_tickets` set status = 'converted_to_co', change_order_id = new CO id
  4. Toast with ticket number and CO number
  5. Call `onConvert()` and invalidate queries

Uses `AlertDialog` from shadcn/ui, direct Supabase inserts, and `useQueryClient` for cache invalidation.

## Modified: `src/components/project-hub/tm/TMTicketCard.tsx`

- Import `ConvertTMToChangeOrder`
- Add `projectId` and `contractId` to props interface
- Add `convertDialogOpen` state
- Replace the placeholder "Convert to Change Order" button (line 340-342) to set `convertDialogOpen = true`
- Render `<ConvertTMToChangeOrder>` at the bottom of the component
- For `converted_to_co` status, optionally show the linked CO reference

## Technical Details

```
ConvertTMToChangeOrder.tsx (new ~100 lines)
├── AlertDialog with summary text
├── useMutation:
│   ├── INSERT change_orders → get id + number
│   ├── INSERT change_order_line_items (labor + optional materials)
│   ├── UPDATE tm_tickets SET status='converted_to_co', change_order_id
│   └── invalidate ['change_orders'], ['tm-tickets'], ['change-orders-by-contract']
└── Toast on success

TMTicketCard.tsx (modify)
├── Add props: projectId, contractId
├── Add state: convertDialogOpen
├── Wire "Convert to Change Order" button → open dialog
└── Render <ConvertTMToChangeOrder> component
```

