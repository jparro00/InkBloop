# Design system

Ink Bloop's palette and Material Design 2 dark-theme rules. The CSS variables below are defined in `src/index.css`'s `@theme` block and are the source of truth for components.

Style: **bold, edgy, M2 dark theme compliant**. Brand green derives from the tattoo-shop logo (Green Man).

## CSS variables (source of truth)

Defined in `src/index.css`. Prefer these over raw hex in components.

```css
@theme {
  /* Surfaces — M2 elevation overlay system */
  --color-bg: #121212;
  --color-surface: #1E1E1E;
  --color-elevated: #272727;
  --color-input: #2C2C2C;
  --color-border: #333333;
  --color-border-s: #383838;

  /* Text — white at M2 opacity levels */
  --color-text-p: rgba(255, 255, 255, 0.87);   /* high emphasis */
  --color-text-s: rgba(255, 255, 255, 0.60);   /* medium */
  --color-text-t: rgba(255, 255, 255, 0.38);   /* disabled */

  /* Primary accent — brand green (M2 200-tone) */
  --color-accent: #4ADE80;
  --color-accent-dim: #16A34A;
  --color-accent-glow: rgba(74, 222, 128, 0.08);

  /* Secondary accent — warm amber */
  --color-secondary: #FBBF24;
  --color-secondary-dim: #D97706;

  /* Status */
  --color-danger: #CF6679;
  --color-success: #22D3EE;   /* cyan, NOT green (avoids primary conflict) */
  --color-today: #E8453C;     /* current-date indicator */

  /* Shadows — green-tinted glows */
  --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.6);
  --shadow-md: 0 4px 20px rgba(0, 0, 0, 0.7);
  --shadow-lg: 0 12px 40px rgba(0, 0, 0, 0.8);
  --shadow-glow: 0 0 24px rgba(74, 222, 128, 0.10);
  --shadow-glow-strong: 0 0 40px rgba(74, 222, 128, 0.16);
}
```

## M2 color slots (12 roles)

| Slot                  | Hex                           | Usage                                        |
|-----------------------|-------------------------------|----------------------------------------------|
| Primary               | `#4ADE80`                     | Main actions, links, highlights, nav         |
| Primary Variant       | `#16A34A`                     | Pressed/active states, status bar            |
| On Primary            | `#000000`                     | Text/icons on primary green                  |
| Secondary             | `#FBBF24`                     | FABs, selection, secondary accents           |
| Secondary Variant     | `#D97706`                     | Pressed/active for secondary                 |
| On Secondary          | `#000000`                     | Text/icons on amber                          |
| Background            | `#121212`                     | Window/page background                       |
| On Background         | `rgba(255,255,255,0.87)`      | High-emphasis text on background             |
| Surface               | `#121212`                     | Cards, sheets, menus, dialogs (base)         |
| On Surface            | `rgba(255,255,255,0.87)`      | High-emphasis text on surfaces               |
| Error                 | `#CF6679`                     | Error states, destructive actions            |
| On Error              | `#000000`                     | Text/icons on error color                    |

## Elevation overlay system

M2 dark theme expresses elevation as **white overlays on `#121212`** (shadows are invisible on dark). Higher elevation → lighter surface.

**Formula:** `opacity = (4.5 * ln(elevation + 1) + 2) / 100`

| Elevation | Overlay | Resulting hex | Typical components                         |
|-----------|---------|---------------|--------------------------------------------|
| 0dp       | 0%      | `#121212`     | Page background                            |
| 1dp       | 5%      | `#1E1E1E`     | Card (resting), switch                     |
| 2dp       | 7%      | `#232323`     | Button (resting)                           |
| 3dp       | 8%      | `#252525`     | Refresh indicator                          |
| 4dp       | 9%      | `#272727`     | Top app bar                                |
| 6dp       | 11%     | `#2C2C2C`     | Snackbar, FAB (resting), input fields      |
| 8dp       | 12%     | `#2E2E2E`     | Bottom bar, menus, card (dragged), button (pressed) |
| 12dp      | 14%     | `#333333`     | Borders, subtle dividers, FAB (pressed)    |
| 16dp      | 15%     | `#363636`     | Nav drawer, bottom sheet                   |
| 24dp      | 16%     | `#383838`     | Dialog, strong dividers                    |

## Text & icon opacity

| Emphasis | Value                       | Usage                       |
|----------|-----------------------------|-----------------------------|
| High     | `rgba(255, 255, 255, 0.87)` | Primary body text, headings |
| Medium   | `rgba(255, 255, 255, 0.60)` | Secondary text, captions    |
| Disabled | `rgba(255, 255, 255, 0.38)` | Disabled text, placeholders |

## Status colors

| Status  | Hex        | Notes                                                |
|---------|------------|------------------------------------------------------|
| Success | `#22D3EE`  | Cyan — NOT green. Avoids conflict with primary brand. |
| Error   | `#CF6679`  | M2-standard dark error                               |
| Warning | `#FFB74D`  | Amber/orange                                         |
| Today   | `#E8453C`  | Bright red current-date indicator                    |

## Contrast verification (WCAG AA ≥ 4.5:1)

| Foreground  | Background        | Ratio   | Pass |
|-------------|-------------------|---------|------|
| `#4ADE80`   | `#121212` (0dp)   | ~9.2:1  | Yes  |
| `#4ADE80`   | `#383838` (24dp)  | ~6.8:1  | Yes  |
| `#FBBF24`   | `#121212`         | ~10.5:1 | Yes  |
| `#FBBF24`   | `#383838`         | ~8.2:1  | Yes  |
| `#000000`   | `#4ADE80` (on-p)  | ~9.2:1  | Yes  |
| `#000000`   | `#FBBF24` (on-s)  | ~10.5:1 | Yes  |
| `#CF6679`   | `#121212`         | ~5.5:1  | Yes  |
| White 87%   | `#121212`         | ~14:1   | Yes  |
| White 60%   | `#121212`         | ~8:1    | Yes  |

## Design rationale

- **Primary green `#4ADE80`**: logo green shifted to M2 200-tone — slightly lighter and cooler to prevent visual vibration on `#121212`. Bold and still recognizable as the Green Man brand.
- **Secondary amber `#FBBF24`**: warm complement to cool green. Evokes tattoo-culture energy (gold, warmth, fire) and creates strong visual contrast for secondary actions.
- **Bold & edgy**: higher-than-typical saturation on primary, green glow effects on elevated elements, strong dark shadows. Pushes M2 toward maximum vibrancy while staying within contrast requirements.

## Implementation notes

1. **Success is cyan, not green.** Since primary is green, using green for success would be ambiguous. Cyan (`#22D3EE`) is visually distinct while still reading as "positive".
2. **Secondary vs warning proximity.** `#FBBF24` (secondary) and `#FFB74D` (warning) are close. If both appear near each other in UI, consider darkening warning to `#F57C00` or shifting secondary toward gold (`#EAB308`).
3. **Desaturate brand colors for dark.** M2 recommends the 200 tonal value rather than the 500 used in light themes — saturated colors visually vibrate against dark surfaces.
4. **Body text targets WCAG AA (4.5:1)** against the **lightest** elevated surface it can appear on (usually 24dp). The current variable set is already verified above.
5. **Prefer variables over raw hex in components.** `var(--color-accent)` not `#4ADE80`. Makes palette tweaks a one-file change.

## Component elevation reference

Common component elevations for applying the overlay table above:

- Nav drawer / bottom sheet: 16dp
- Dialog: 24dp
- FAB: 6dp (resting), 12dp (pressed)
- Card: 1dp (resting), 8dp (dragged)
- Bottom app bar: 8dp
- Top app bar: 4dp
- Snackbar: 6dp
- Menu / sub-menu: 8dp
- Button: 2dp (resting), 8dp (pressed)
- Switch: 1dp

## Palette preview

A live palette preview page exists at `public/palette-preview.html` for visual reference during design work. Also see `src/pages/Theme.tsx` (route `/theme`) for an in-app palette viewer.

## Reference

Material Design 2 dark theme spec: https://m2.material.io/design/color/dark-theme.html
