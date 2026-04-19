# Material Design 2 — Dark Theme Color Scheme & Styling Rules

Reference: https://m2.material.io/design/color/dark-theme.html

## Base Surface Color

- **`#121212`** — the recommended dark surface color (dark grey, not pure black)

## Elevation Overlay System

Instead of shadows (which are invisible on dark backgrounds), M2 uses **white overlays on surfaces** to communicate elevation. Higher elevation = lighter surface.

| Elevation | White Overlay Opacity | Resulting Hex (approx) |
|-----------|-----------------------|------------------------|
| 0dp       | 0%                    | `#121212`              |
| 1dp       | 5%                    | `#1E1E1E`              |
| 2dp       | 7%                    | `#232323`              |
| 3dp       | 8%                    | `#252525`              |
| 4dp       | 9%                    | `#272727`              |
| 6dp       | 11%                   | `#2C2C2C`              |
| 8dp       | 12%                   | `#2E2E2E`              |
| 12dp      | 14%                   | `#333333`              |
| 16dp      | 15%                   | `#363636`              |
| 24dp      | 16%                   | `#383838`              |

**Formula:** `opacity = (4.5 * ln(elevation + 1) + 2) / 100`

## Text & Icon Opacity (on dark surfaces)

| Emphasis        | Color     | Opacity |
|-----------------|-----------|---------|
| High emphasis   | `#FFFFFF` | 87%     |
| Medium emphasis | `#FFFFFF` | 60%     |
| Disabled        | `#FFFFFF` | 38%     |

## Primary / Accent Color Rules

- **Use desaturated (lighter) tones** of brand colors — saturated colors visually vibrate against dark backgrounds and are hard to read.
- Recommended: use the **200 tonal value** of your primary color palette (instead of 500 used in light theme).
- Body text must pass **WCAG AA** contrast of at least **4.5:1** against the lightest elevated surface.

## Key Design Principles

1. **Dark grey over pure black** — `#121212` reduces eye strain and lets elevation overlays remain visible.
2. **Limited color** — large surfaces should use dark colors; bright/saturated colors are reserved for accents only.
3. **Conserve energy** on OLED screens while maintaining usability.
4. **Accessibility** — all text must meet contrast ratios against the lightest surface they appear on (24dp elevation).

## Component Elevation Reference

Common component elevations for applying the overlay table above:

- **Nav drawer / Bottom sheet:** 16dp
- **Dialog:** 24dp
- **FAB:** 6dp (resting), 12dp (pressed)
- **Card:** 1dp (resting), 8dp (dragged)
- **Bottom app bar:** 8dp
- **Top app bar:** 4dp
- **Snackbar:** 6dp
- **Menu / Sub menu:** 8dp
- **Button:** 2dp (resting), 8dp (pressed)
- **Switch:** 1dp

## CSS Custom Properties (example usage)

```css
:root {
  /* Surface colors by elevation */
  --md-surface-0dp: #121212;
  --md-surface-1dp: #1E1E1E;
  --md-surface-2dp: #232323;
  --md-surface-3dp: #252525;
  --md-surface-4dp: #272727;
  --md-surface-6dp: #2C2C2C;
  --md-surface-8dp: #2E2E2E;
  --md-surface-12dp: #333333;
  --md-surface-16dp: #363636;
  --md-surface-24dp: #383838;

  /* Text on dark surfaces */
  --md-on-surface-high: rgba(255, 255, 255, 0.87);
  --md-on-surface-medium: rgba(255, 255, 255, 0.60);
  --md-on-surface-disabled: rgba(255, 255, 255, 0.38);
}
```
