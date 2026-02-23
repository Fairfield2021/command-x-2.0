

# Fix Phase 2 Build Error in Sales.tsx

## Problem
`Sales.tsx` line 92-94 still passes `onAddInvoice={() => navigate('/invoices/new')}` to `InvoiceEmptyState`, but that prop was removed during Phase 2 cleanup. The component now accepts an optional `createAction` ReactNode instead.

## Fix
In `src/pages/Sales.tsx`, replace lines 92-94:

```tsx
// FROM:
<InvoiceEmptyState 
  onAddInvoice={() => navigate('/invoices/new')}
/>

// TO:
<InvoiceEmptyState />
```

This is a one-line change. No other modifications needed.

## Phase 2 Status
Notion confirms Phase 2 is fully marked as **Complete**. This is just a leftover build error from the cleanup pass.

