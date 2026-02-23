

# Phase 4b Fix — Add Schedule and Field Tabs to Job Hub

## Problem
The current Job Hub has 5 tabs: **Overview, Financials, Documents, Team, Activity**. This doesn't match the spec, which calls for **Schedule** and **Field** tabs. Specifically:

- **Milestones** are buried in the Overview tab instead of a dedicated Schedule tab with calendar/timeline views
- **No Schedule tab** exists with Gantt-style timeline or calendar view of personnel schedules and milestones
- **No Field tab** exists for daily logs, site photos, or field-level reporting
- "Documents" and "Activity" tabs are fine to keep but don't replace the missing Schedule and Field tabs

## Proposed Change: Expand from 5 Tabs to 7 Tabs

```text
[Overview] [Financials] [Schedule] [Field] [Documents] [Team] [Activity]
```

| Tab | Contents |
|---|---|
| **Overview** | Project info, progress bar, rooms (milestones MOVE OUT) |
| **Financials** | Financial summary, labor allocation, estimates, job orders, invoices, vendor bills, change orders, T&M, POs, time entries |
| **Schedule** | Milestones (moved from Overview), Personnel schedules calendar, Timeline/Gantt view |
| **Field** | Daily logs (new), Site photos (new), Weather logs (existing table), Inspections (existing table) |
| **Documents** | Project documents (unchanged) |
| **Team** | Rate brackets, applicants, personnel, assets (unchanged) |
| **Activity** | Activity timeline (unchanged) |

## What Already Exists (reusable)

- `personnel_schedules` table + `usePersonnelSchedulesByProject` hook -- ready to use
- `ScheduleManager` component (admin) -- can adapt for project-scoped view
- `weather_logs` table -- can surface per-project
- `roof_inspections` table -- can surface per-project
- Milestone CRUD hooks (`useMilestonesByProject`, `useAddMilestone`, etc.) -- already in ProjectDetail

## What Needs to Be Built (net-new)

### Database: 2 new tables
1. **`daily_field_logs`** -- date, project_id, created_by, weather_conditions, crew_count, work_performed (text), safety_incidents (text), delays (text), notes, status (draft/submitted/approved)
2. **`field_photos`** -- project_id, daily_log_id (nullable), uploaded_by, storage_path, caption, location_tag, taken_at

### New Components
1. **`JobHubScheduleTab.tsx`** -- Milestones timeline + personnel schedule calendar for the project
2. **`JobHubFieldTab.tsx`** -- Daily log list/form + photo gallery + weather/inspection summaries
3. **`DailyFieldLogForm.tsx`** -- Form to create/edit a daily field log entry
4. **`FieldPhotoGallery.tsx`** -- Grid of uploaded site photos with captions

### Modified Files
- **`ProjectDetail.tsx`** -- Add 2 new tab triggers and content panels; move milestone props from Overview to Schedule tab
- **`JobHubOverviewTab.tsx`** -- Remove milestones section (moved to Schedule)

## Implementation Steps

### Step 1: Database migration
Create `daily_field_logs` and `field_photos` tables with RLS policies scoped to authenticated users.

### Step 2: Create hooks
- `useDailyFieldLogs(projectId)` -- CRUD for daily logs
- `useFieldPhotos(projectId)` -- CRUD for site photos with storage upload

### Step 3: Build Schedule tab
- Move milestones from Overview into new `JobHubScheduleTab`
- Add project-scoped personnel schedule view (reuse `usePersonnelSchedulesByProject`)
- Display milestones as a timeline and schedules as a day/week calendar grid

### Step 4: Build Field tab
- Daily log list with add/edit capability
- Photo upload gallery using existing storage bucket
- Weather and inspection summary cards

### Step 5: Wire into ProjectDetail.tsx
- Add `schedule` and `field` to `VALID_TABS`
- Add `TabsTrigger` and `TabsContent` for both
- Pass milestone data to Schedule tab instead of Overview tab
- Update Overview tab to remove milestones section

### Step 6: Update plan.md and Notion tracker

## Risk Assessment
**Low-medium risk.** The Schedule tab is mostly reorganizing existing data (milestones + schedules). The Field tab introduces 2 new tables and a photo upload flow, but follows established patterns (storage bucket, RLS, CRUD hooks). No existing functionality is removed -- milestones move tabs but remain fully functional.

## Technical Notes

- All new tables use `project_id` foreign key and RLS enforced at database level
- Photo uploads use the existing Supabase storage integration pattern (same as personnel photos)
- No new routes needed -- everything lives within the Job Hub tabs
- Daily logs use append-only pattern with status workflow (draft -> submitted -> approved) to maintain data integrity

