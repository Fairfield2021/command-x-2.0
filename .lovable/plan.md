

# Polish Sprint — Overview Quick Actions, QBO Deep Links, Team Tab Contacts

Three independent additions to the Job Hub, all purely additive with no schema changes.

---

## 1. Quick Action Buttons on Overview Tab

**File modified:** `src/components/project-hub/tabs/JobHubOverviewTab.tsx`

Add a "Quick Actions" card between the Progress card and the Project Info grid. Three buttons:

| Button | Action |
|---|---|
| Add Note | Opens a small inline dialog/textarea that appends to `project_notes` table (or the existing project activity log) |
| Upload Photo | Navigates to `#field` tab (where FieldPhotoGallery already exists) |
| Log Time | Opens the existing `EnhancedTimeEntryForm` dialog with `defaultProjectId` pre-filled |

The Log Time and Upload Photo buttons reuse existing components directly. "Add Note" will use the existing project activity/notes infrastructure if available, or simply switch to the Activity tab.

**Props change:** The `JobHubOverviewTab` already receives `project` which includes `project.id`. No new props needed — the `EnhancedTimeEntryForm` dialog state is managed locally within the component.

---

## 2. QBOPopupLink in Financials Tab DataTable Rows

**File modified:** `src/components/project-hub/tabs/JobHubFinancialsTab.tsx`

For each of the three DataTable sections (Estimates, Invoices, Purchase Orders), add a "QBO" action column:

1. Call `useQBMappingForList(entityIds, docType)` for each entity type (estimates, invoices, POs) to get a `Map<localId, qbTxnId>`
2. Add a final column to each DataTable's column array with a render function that checks the mapping and renders a `QBOPopupLink` (edit variant) if a QB mapping exists
3. The column render stops click propagation so the QBO popup doesn't conflict with the row's `onRowClick` navigation

```text
Estimates table columns:
  Estimate # | Customer | Status | Total | Created | [QBO icon]

Invoices table columns:
  Invoice # | Status | Amount | Due Date | [QBO icon]
```

The `useQBMappingForList` hook already handles the "only fetch when QB is connected" logic, so no additional guards needed.

---

## 3. Customer Contacts & Job-Linked Vendors on Team Tab

**File modified:** `src/components/project-hub/tabs/JobHubTeamTab.tsx`

**New file:** `src/components/project-hub/ProjectCustomerContactSection.tsx`
**New file:** `src/components/project-hub/ProjectLinkedVendorsSection.tsx`

### Customer Contact Section

The `customers` table has `name`, `email`, `phone`, `company` columns but no `customer_contacts` sub-table exists. The project already has a `customer_id` foreign key. This section:

- Receives the project's `customerId` as a prop (passed from `ProjectDetail.tsx` which already fetches the customer)
- Queries the single customer record and displays their contact info (name, email, phone, company)
- Also shows the project's POC fields (`poc_name`, `poc_phone`, `poc_email`) which are already on the project record
- Displayed as a Card with contact details and click-to-call/email links

**Props change to `JobHubTeamTab`:** Add `customerId` and `project` (or just the POC fields). `ProjectDetail.tsx` already has both `project` and `customer` data, so we pass `customerId={project.customer_id}` and the POC fields.

### Job-Linked Vendors Section

Vendors linked to a project are determined by `purchase_orders` (which have both `vendor_id` and `project_id`). This section:

- Queries `purchase_orders` filtered by `project_id`, selects distinct `vendor_id` + `vendor_name`
- Displays each vendor as a card/row with name and link to `/vendors/:id`
- Shows the count of POs per vendor for context
- Uses existing `usePurchaseOrders` hook filtered by project, or a lightweight inline query

### Updated Team Tab layout:

```text
Team Tab
  ├── Customer Contact (new)
  ├── Linked Vendors (new)
  ├── Rate Brackets (existing)
  ├── Applicants (existing)
  ├── Personnel (existing)
  └── Asset Assignments (existing)
```

---

## Implementation Steps

1. **JobHubOverviewTab.tsx** — Add Quick Actions card with Log Time (EnhancedTimeEntryForm), Upload Photo (hash navigate to #field), Add Note (hash navigate to #activity)
2. **JobHubFinancialsTab.tsx** — Add `useQBMappingForList` calls for estimates, invoices, POs; add QBO column to each DataTable
3. **ProjectCustomerContactSection.tsx** — New component showing customer + POC contact details
4. **ProjectLinkedVendorsSection.tsx** — New component querying POs for distinct vendors on the project
5. **JobHubTeamTab.tsx** — Add the two new sections; update props to accept `customerId` and POC data
6. **ProjectDetail.tsx** — Pass additional props (`customerId`, POC fields) to `JobHubTeamTab`

## Risk: None

All changes are additive UI. No database changes. Existing components and hooks are reused. No financial data mutation.

