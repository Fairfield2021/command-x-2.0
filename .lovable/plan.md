

# Add 10 Color Themes (Mix of Light and Dark)

## Problem
Current presets are layout-focused (Compact, Spreadsheet, 2K1) with only 2 color presets, both dark. Users want simple, light, approachable themes.

## Plan

### Replace `PRESET_THEMES` in `DashboardThemeEditor.tsx` (lines 40-107)

**10 themes — 5 light, 3 dark, 2 mixed:**

| # | Name | Type | Card BG | Card Text | Accent | Sidebar BG | Sidebar Text |
|---|------|------|---------|-----------|--------|------------|--------------|
| 1 | **Clean Light** | Light | `#ffffff` | `#1a1a2e` | `#3b82f6` | `#f8fafc` | `#334155` |
| 2 | **Soft Gray** | Light | `#f9fafb` | `#111827` | `#6366f1` | `#f3f4f6` | `#374151` |
| 3 | **Warm Cream** | Light | `#fffbf5` | `#422006` | `#d97706` | `#fef3c7` | `#78350f` |
| 4 | **Cool Mint** | Light | `#f0fdfa` | `#134e4a` | `#14b8a6` | `#ccfbf1` | `#115e59` |
| 5 | **Sky Blue** | Light | `#f0f9ff` | `#0c4a6e` | `#0284c7` | `#e0f2fe` | `#075985` |
| 6 | **Default Dark** | Dark | (undefined) | (undefined) | (undefined) | (undefined) | (undefined) |
| 7 | **Midnight** | Dark | `#1e293b` | `#f1f5f9` | `#6366f1` | `#0f172a` | `#e2e8f0` |
| 8 | **Emerald Dark** | Dark | `#1a2e1a` | `#d1fae5` | `#10b981` | `#0a1f0a` | `#a7f3d0` |
| 9 | **Sunset** | Mixed | `#1c1917` | `#fef3c7` | `#f59e0b` | `#292524` | `#fcd34d` |
| 10 | **Nord** | Mixed | `#2e3440` | `#eceff4` | `#88c0d0` | `#3b4252` | `#d8dee9` |

All text/background combos verified at WCAG AA (4.5:1+ contrast ratio).

### UI Enhancement
Add a colored dot swatch next to each preset button name showing the accent color, so users can visually scan. Light themes get a light border on the button to distinguish them.

### Files Modified
- `src/components/dashboard/customization/DashboardThemeEditor.tsx` — Replace `PRESET_THEMES` array (lines 40-107) and update the preset button rendering (lines 160-175) to include color swatches.

### No database changes needed.

