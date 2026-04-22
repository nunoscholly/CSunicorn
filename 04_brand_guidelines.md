# START CREW — Brand Guidelines

> Visual identity, tone of voice, and design system for START CREW.  
> Version 1.0 — locked and ready for implementation.

---

## Brand Name

**START CREW**

The name works on two levels: a construction crew (the people physically building the event) and a starting crew (everyone in position at the starting grid, ready to go). It is always written with a space between START and CREW — never as one word, never in lowercase.

**Acronym (for reference):** Smart Task Allocation & Real-Time Crew/Coordination

**Taglines:**

| Option | Use |
|---|---|
| "Build week runs on START CREW." | Recommended — primary tagline |
| "Every person. Every task. On the crew." | Secondary — longer contexts |
| "From chaos to coordination." | Presentation slides, video intro |

---

## Logo

### The Double-Wedge Wordmark

The START CREW logo consists of two trapezium (wedge) shapes placed side by side, with START in the first and CREW in the second. The shape conveys forward motion, a starting grid, and construction — all simultaneously.

```
╔══════════╗╔══════════╗
║  START   ║║   CREW   ║
╚══════════╝╚══════════╝
  (filled)    (outlined/
               tinted)
```

### Logo Variations

| Variant | Background | START block | CREW block | Use case |
|---|---|---|---|---|
| Primary | Dark (`#111111`) | Yellow fill (`#F5C800`), black text | White/transparent tint, white text | App header, video, primary use |
| Light bg | White / light | Black fill, yellow text | Light tint, black text | Printed docs, light presentations |
| Yellow bg | Signal Yellow | Black fill, yellow text | Transparent tint, black text | Social graphics, stickers |
| Yellow accent | Dark | Yellow fill, black text | White/transparent, yellow text | Dark UI accent variant |

### Formats

- **Full horizontal** — START CREW side by side (primary use)
- **Stacked** — START above CREW (square contexts, avatar)
- **App icon / favicon** — trapeziums stacked vertically in a square (START top, CREW bottom)
- **Compact single-line** — smaller point size, both words inline (nav bar)

### Logo Rules

1. The double-wedge treatment is the identity. Never typeset START CREW in plain text without the block shapes.
2. Never separate START and CREW — they must always appear together in the lockup.
3. Clear space = half the logo height on all four sides. Nothing enters this zone.
4. Never place the logo on a coloured background other than Construction Black, White, or Signal Yellow.
5. Never use gradients, outlines, or drop shadows on the logo.
6. Never stretch or distort the logo. Maintain aspect ratio at all times.

---

## Colour Palette

### Primary Colours

| Name | Hex | RGB | Use |
|---|---|---|---|
| **Signal Yellow** | `#F5C800` | 245, 200, 0 | Primary action, accent, logo block, energy |
| **Construction Black** | `#111111` | 17, 17, 17 | Primary background, dominant surface |

### Extended Palette

| Name | Hex | Use |
|---|---|---|
| Surface | `#1A1A1A` | Cards and containers on dark backgrounds |
| White | `#FFFFFF` | Text on dark backgrounds, light mode base |
| Concrete | `#555555` | Muted text, borders, dividers |

### Semantic Colours (UI only)

| Name | Hex | Used for |
|---|---|---|
| Urgent Red | `#FF4D4D` | Critical staffing alerts, urgent badges |
| Success Green | `#3ECF8E` | Staffed zones, completed tasks, filled requests |
| Warning (reuse Yellow) | `#F5C800` | Partial coverage, pending requests |

### Core Colour Rule

**Yellow is reserved for action and emphasis — not decoration.**

If everything is yellow, nothing is. Yellow appears on: primary buttons, urgent badges, the ML forecast shortage indicator, the logo START block, active nav links, and key metric values. It does not appear as a general background wash, decorative border, or ambient fill.

Black is the dominant surface. White space is earned.

---

## Typography

**Primary font: Avenir Next**  
Fallback stack: `'Avenir Next', Avenir, 'Helvetica Neue', sans-serif`

Avenir Next is used for all text in the application. It is clean, geometric, and professional — matching the efficient, high-performance tone of the brand.

### Weight Rules

| Weight | Usage |
|---|---|
| 900 (Heavy) | ALL CAPS wordmarks and labels only — logo, section dividers, status badges in CAPS |
| 700 (Bold) | Headings, subheadings, button text, metric values |
| 500 (Medium) | Sub-labels, secondary wordmark text (e.g. "CREW" in the nav) |
| 400 (Regular) | Body text, descriptions, form labels, general UI |

**Critical rule:** Weight 900 is reserved exclusively for ALL CAPS text. Never apply Heavy weight to sentence-case or mixed-case text — it reads as aggressive and inconsistent.

### Type Scale

| Level | Size | Weight | Usage |
|---|---|---|---|
| Display | 36px+ | 900 | Hero text, video titles, large section headers in ALL CAPS |
| Heading 1 | 24px | 700 | Page titles |
| Heading 2 | 17–18px | 700 | Section headers |
| Body | 15px | 400 | Descriptions, form fields, general content |
| Label | 11px | 700 | ALL CAPS · tracking 0.1em · uppercase UI tags |

### Tracking

- ALL CAPS display text: `letter-spacing: 0.06–0.10em`
- Normal headings: `letter-spacing: -0.01em` (slightly tight)
- Body: default (no tracking adjustment)
- Labels/tags: `letter-spacing: 0.08–0.12em`

---

## Tone of Voice

START CREW is entrepreneurial, pragmatic, efficient, high-performance, and energetic. The voice reflects the urgency of a live construction operation — not a corporate software product.

### Principles

**Direct, not vague.**  
Every piece of copy tells the user exactly what to do or exactly what is happening. No hedging, no passive constructions.

**Specific, not general.**  
Use real numbers, real times, real zones. "Stage B needs 4 people at 13:00" is better than "some areas may need additional support."

**Active, not apologetic.**  
The system doesn't apologise. It acts. If something is wrong, it tells you clearly and tells you what to do about it.

**Confident, not arrogant.**  
Short sentences. Strong verbs. No filler words like "please be aware that" or "it is worth noting that."

**Human, not robotic.**  
This is used by real people in a stressful live environment. Keep UI copy tight and warm, not clinical.

---

### Do / Don't Examples

| Situation | DO | DON'T |
|---|---|---|
| Staffing alert | "3 people needed. Stage B. Now." | "It seems like there might be some availability issues in certain areas." |
| Task assigned | "Task assigned. Report to Stage B at 14:00." | "Your task assignment request has been processed successfully." |
| Request posted | "Request posted. Team lead notified." | "Your manpower request form has been submitted for review." |
| App tagline | "Build week runs on START CREW." | "Welcome to your collaborative coordination journey!" |
| Error state | "Login failed. Check your email and password." | "Sorry, we were unable to authenticate your credentials at this time." |
| No tasks available | "No open tasks right now. Check back soon." | "Unfortunately there don't appear to be any available task opportunities at the moment." |

---

## UI Design Principles

### Visual Style

- **Flat, not glossy.** No gradients, drop shadows, or glow effects. Clean flat surfaces.
- **Dark-first.** The primary UI is dark (`#111` background, `#1A1A1A` cards). Yellow pops against dark; it disappears on white.
- **Minimum decoration.** Every visual element earns its place. If it doesn't communicate information, remove it.
- **Generous white space.** Dense layouts feel overwhelming in a stressful live environment. Give content room to breathe.

### Component Patterns

**Buttons:**
- Primary action: Signal Yellow (`#F5C800`) background, Construction Black text, bold
- Secondary action: Transparent background, yellow border, yellow text
- Disabled: Grey `#1A1A1A` background, `#333` text

**Cards:**
- Background: `#1A1A1A` (on dark) or `#FFFFFF` (on light)
- Border: `0.5px solid` — subtle, not heavy
- Border radius: `8px` (components), `12px` (larger cards)

**Badges / pills:**
- ALL CAPS, weight 700, tracking 0.05em
- Colour-coded by semantic meaning (see semantic colours above)
- Never use colour alone — pair with text label

**Progress bars:**
- Track: `#222222`
- Fill: colour-coded (green / yellow / red)
- Height: 5–6px
- Border radius: full pill

**Forms:**
- Input border: `0.5px solid #2A2A2A` (dark) — highlight to yellow on focus
- Label: 9–10px, weight 700, uppercase, muted colour
- Active / highlighted field border: Signal Yellow

**Data tables:**
- Header row: dark background, muted text
- Alternating rows: slight contrast variation
- No heavy borders — use background alternation instead

### Spacing System

| Token | Value | Usage |
|---|---|---|
| xs | 4px | Icon padding, tight gaps |
| sm | 8px | Component-internal gaps |
| md | 12–16px | Between related elements |
| lg | 20–24px | Between sections within a card |
| xl | 32–40px | Between major page sections |

---

## Application of Brand in Streamlit

Streamlit has limited native styling. Apply the brand through these practical methods:

### CSS Injection

```python
st.markdown("""
<style>
  .stApp { background-color: #111111; }
  .stButton > button {
    background-color: #F5C800;
    color: #111111;
    font-weight: 700;
    border: none;
    border-radius: 6px;
    font-family: 'Avenir Next', Avenir, sans-serif;
  }
  .stButton > button:hover { background-color: #e0b800; }
  h1, h2, h3 { font-family: 'Avenir Next', Avenir, 'Helvetica Neue', sans-serif; color: #FFFFFF; }
  .stTextInput > div > div > input { background: #1A1A1A; color: #FFFFFF; border: 0.5px solid #2A2A2A; }
  .stSelectbox > div > div { background: #1A1A1A; color: #FFFFFF; }
</style>
""", unsafe_allow_html=True)
```

### Logo in Nav

```python
st.markdown("""
<div style="display:inline-flex;align-items:stretch;">
  <span style="background:#F5C800;color:#111;font-family:'Avenir Next',Avenir,sans-serif;font-weight:900;font-size:16px;padding:4px 10px;letter-spacing:0.05em;">START</span>
  <span style="background:rgba(255,255,255,0.1);color:#fff;font-family:'Avenir Next',Avenir,sans-serif;font-weight:900;font-size:16px;padding:4px 10px;letter-spacing:0.05em;">CREW</span>
</div>
""", unsafe_allow_html=True)
```

### Status Badges

```python
def badge(label, bg, fg):
    return f'<span style="background:{bg};color:{fg};font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px;letter-spacing:0.05em;">{label}</span>'

# Usage
st.markdown(badge("URGENT", "#3a0000", "#ff4d4d"), unsafe_allow_html=True)
st.markdown(badge("STAFFED", "#0a2a1a", "#3ecf8e"), unsafe_allow_html=True)
st.markdown(badge("WARNING", "#3a3000", "#F5C800"), unsafe_allow_html=True)
```

---

## Brand Checklist

Before submitting, verify the following:

- [ ] App background is Construction Black (`#111111`), not Streamlit default white
- [ ] START CREW logo appears in the nav bar using the double-wedge treatment
- [ ] Signal Yellow is used only for primary actions, urgent badges, and key metric values
- [ ] Weight 900 / Heavy is used only on ALL CAPS text
- [ ] All buttons follow the primary (yellow) / secondary (ghost) pattern
- [ ] Status badges are colour-coded consistently across all views
- [ ] No gradients, drop shadows, or decorative effects anywhere in the UI
- [ ] Font is Avenir Next (or fallback Avenir / Helvetica Neue) throughout
- [ ] Tagline "Build week runs on START CREW." appears in the video
- [ ] Logo is never stretched, distorted, or placed on an off-brand background colour
