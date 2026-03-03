

# Quick Actions Enhancement — Already Implemented

The Overview tab **already has** the Quick Actions section (lines 123-142) with 3 buttons: Add Note, Upload Photo, and Log Time. They use `handleNavigateTab` to switch tabs via URL hash — the exact pattern requested.

The only changes needed are:

## Modify `src/components/project-hub/tabs/JobHubOverviewTab.tsx`

1. **Add 4th button**: "New Document" with `FileUp` icon, navigating to `#documents`
2. **Change layout to 2x2 grid on mobile**: Replace `flex flex-wrap` with a grid layout (`grid grid-cols-2 md:grid-cols-4`) so buttons show as a 2x2 grid on mobile and a single row on desktop
3. **Update "Log Time" to navigate to financials tab** instead of opening the time entry dialog (per the user's request: "Opens the Financials tab (#financials)"). Keep the dialog as a secondary option or remove it.

Actually, re-reading the request: they want Log Time to go to `#financials`, but the current implementation opens a time entry form dialog which is arguably better UX. The request says "Opens the Financials tab (#financials) scrolled to the time entries section." I'll change it to navigate to `#financials` as requested.

## Changes (single file)

- Add `FileUp` to lucide imports
- Change Quick Actions container from `flex flex-wrap` to `grid grid-cols-2 md:grid-cols-4 gap-3`
- Remove the "Quick Actions" label span (save space)
- Add 4th button: New Document → `handleNavigateTab("documents")`
- Change Log Time from opening dialog to `handleNavigateTab("financials")`
- Remove unused `timeEntryOpen` state and `EnhancedTimeEntryForm` if Log Time no longer opens it

