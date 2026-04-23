# START CREW — Brand Guidelines

> Visual identity, tone of voice, and design system for START CREW.

---

## Brand Name

**START CREW** — always with a space, never as one word, never lowercase.

**Acronym:** Smart Task Allocation & Real-Time Crew/Coordination

**Taglines:**

| Option | Use |
|---|---|
| "Build week runs on START CREW." | Primary tagline |
| "Every person. Every task. On the crew." | Longer contexts |
| "From chaos to coordination." | Presentation slides, video intro |

---

## Logo — The Double-Wedge Wordmark

Two trapezium shapes side by side: START (filled) + CREW (outlined/tinted).

```
╔══════════╗╔══════════╗
║  START   ║║   CREW   ║
╚══════════╝╚══════════╝
  (filled)    (outlined/tinted)
```

### Variants

| Variant | START block | CREW block | Use case |
|---|---|---|---|
| Primary (dark bg) | Yellow fill (#F5C800), black text | White/transparent tint, white text | App header, video |
| Light bg | Black fill, yellow text | Light tint, black text | Docs, presentations |
| Yellow bg | Black fill, yellow text | Transparent tint, black text | Social, stickers |

### Rules
1. Never typeset START CREW in plain text without the block shapes
2. START and CREW always appear together
3. Clear space = half logo height on all sides
4. Never stretch, distort, add gradients or shadows

---

## Colour Palette

### Primary

| Name | Hex | Use |
|---|---|---|
| **Signal Yellow** | `#F5C800` | Primary action, accent, logo, energy |
| **Construction Black** | `#111111` | Primary background, dominant surface |

### Extended

| Name | Hex | Use |
|---|---|---|
| Surface | `#1A1A1A` | Cards and containers on dark backgrounds |
| Track | `#222222` | Progress-bar tracks, subtle dividers between rows |
| White | `#FFFFFF` | Text on dark backgrounds |
| Concrete | `#555555` | Muted text, borders, dividers |

### Semantic (UI only)

| Name | Hex | Used for |
|---|---|---|
| Urgent Red | `#FF4D4D` | Critical alerts, urgent badges |
| Success Green | `#3ECF8E` | Staffed zones, completed tasks |
| Warning | `#F5C800` | Partial coverage (reuses Signal Yellow) |

### Core Rule

**Yellow is reserved for action and emphasis — not decoration.** If everything is yellow, nothing is. Yellow appears on: primary buttons, urgent badges, ML forecast shortage indicator, logo START block, active nav links, key metric values. Never as background wash or decorative fill.

---

## Typography

**Primary font:** Avenir Next
**Fallback:** `'Avenir Next', Avenir, 'Helvetica Neue', sans-serif`

### Weights

| Weight | Usage |
|---|---|
| 900 (Heavy) | ALL CAPS only — logo, section dividers, status badges |
| 700 (Bold) | Headings, button text, metric values |
| 500 (Medium) | Sub-labels, secondary text |
| 400 (Regular) | Body text, descriptions, form labels |

**Rule:** Weight 900 is only for ALL CAPS text. Never Heavy on sentence-case.

### Scale

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | 36px+ | 900 | Hero text, video titles (ALL CAPS) |
| H1 | 24px | 700 | Page titles |
| H2 | 17–18px | 700 | Section headers |
| Body | 15px | 400 | General content |
| Label | 11px | 700 | ALL CAPS tags, tracking 0.1em |

---

## Tone of Voice

Direct, specific, active, confident, human.

| DO | DON'T |
|---|---|
| "3 people needed. Stage B. Now." | "It seems like there might be some availability issues." |
| "Task assigned. Report to Stage B at 14:00." | "Your task assignment request has been processed." |
| "Login failed. Check your email and password." | "Sorry, we were unable to authenticate your credentials." |
| "No open tasks right now. Check back soon." | "Unfortunately there don't appear to be any available opportunities." |

---

## UI Design Principles

- **Flat, not glossy.** No gradients, drop shadows, glow effects.
- **Dark-first.** `#111111` background, `#1A1A1A` cards. Yellow pops on dark.
- **Minimum decoration.** Every element earns its place.
- **Generous spacing.** Dense layouts overwhelm in stressful live environments.

### Components

**Buttons:**
- Primary: Signal Yellow bg, black text, bold
- Secondary: transparent bg, yellow border, yellow text
- Disabled: `#1A1A1A` bg, `#333` text

**Cards:** `#1A1A1A` bg, `0.5px solid` border, `8px` radius

**Badges:** ALL CAPS, weight 700, tracking 0.05em, semantic colors

**Progress bars:** `#222` track, semantic fill color, 5–6px height, full pill radius

**Forms:** `0.5px solid #2A2A2A` border, Signal Yellow on focus

### Spacing

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Icon padding |
| sm | 8px | Component gaps |
| md | 12–16px | Between related elements |
| lg | 20–24px | Between sections |
| xl | 32–40px | Between major sections |

---

## Tailwind Configuration

```typescript
// tailwind.config.ts
import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        "signal-yellow": "#F5C800",
        "signal-yellow-hover": "#e0b800",
        "construction-black": "#111111",
        "surface": "#1A1A1A",
        "track": "#222222",
        "concrete": "#555555",
        "urgent-red": "#FF4D4D",
        "success-green": "#3ECF8E",
      },
      fontFamily: {
        sans: ['"Avenir Next"', 'Avenir', '"Helvetica Neue"', 'sans-serif'],
      },
    },
  },
} satisfies Config;
```

---

## Status Badges

| Badge | Color | Used for |
|---|---|---|
| Critical / Urgent | Red | Understaffed zones, < 50% coverage |
| Warning | Yellow | 50–89% coverage |
| Staffed / OK | Green | Fully staffed |
| Available | Yellow pill | Volunteer has no active task |
| Assigned | Green pill | Volunteer committed |
| Taken | Grey | Slot full |

---

## Brand Checklist

- [ ] Background is Construction Black (#111111)
- [ ] Logo uses double-wedge treatment in nav
- [ ] Signal Yellow only for actions, badges, metrics
- [ ] Weight 900 only on ALL CAPS text
- [ ] Buttons follow primary/secondary pattern
- [ ] Status badges color-coded consistently
- [ ] No gradients, shadows, or decorative effects
- [ ] Font is Avenir Next throughout
