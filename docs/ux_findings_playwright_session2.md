# Playwright Exploration Findings — 2026-04-23 · Session 2

Three parallel subagents: two Playwright runs (Admin+Login flow and Lead/PM/Volunteer flow) on a shared browser, plus one static code reviewer. Screenshots in `docs/ux_screenshots/session2/`. Re-verification of the session-1 findings (`docs/ux_findings_playwright.md`) included.

Credentials used:
- `admin@start.test` / `test123` — the login the user asked me to try; still mis-seeded as role `volunteer` (session-1 BUG-1 still present), so this lands on `/volunteer`.
- `admin@startcrew.test` / `StartCrew123!` — real admin for `/admin`.
- `pm.aier@startcrew.test` / `StartCrew123!` — PM for `/project`.
- `lead.stagea@startcrew.test` / `StartCrew123!` — Team-Lead for `/lead`.

Good news since session 1: several fixes have landed (disabled-state guard on Lead roster, server-side role check on volunteer task uptake, brand-token migration for hex colors, login autocomplete, login tagline, upload aria-labels). Bad news: the seed data still carries the pollution that motivated three of the session-1 bugs, and a few new high-severity issues emerged.

Session-wide caveat: `mcp__playwright__browser_tabs` was permission-denied, so the two Playwright agents shared a single browser context and were logging each other out mid-flow. A handful of screenshots (`03`, `05`, `07`) captured the login page instead of the intended view. Agents compensated by re-authenticating via `POST /api/auth/login` and batching DOM checks into single `browser_evaluate` calls. Coverage is complete despite the interference.

---

## Summary — Top issues

1. **BUG-S1 (High, new)** — Lead OKR "Team-Auslastung" can exceed 100% (observed 200%). The session-1 guard only handled the `required === 0` case, not `required < staffed`.
2. **BUG-S2 (High, still present)** — PM "Zuletzt verschickt" never populates — RLS `notifications_select` only allows receivers, blocks senders from reading their own messages. Backend fix unchanged since session 1.
3. **BUG-S3 (High, still present)** — `admin@start.test` still has DB role `volunteer` + no name; logging in lands on `/volunteer` as "Unbenannt". Same as session-1 BUG-1.
4. **BUG-S4 (Medium, new)** — Mobile dashboard header (≤390 px) drops the user-name / role badge — user cannot verify which account they're logged in as before hitting Abmelden.
5. **BUG-S5 (Medium, new)** — `/admin` user table is effectively unusable at 390 px: only Name + E-Mail visible, horizontal scroll unsignposted, no stacked-card fallback.
6. **BUG-S6 (Medium, new)** — `/project` hero paragraph has typo **"Bemanning"** instead of **"Bemannung"**.
7. **Still present seed-data pollution** — ASCII umlauts (BUG-5), `[DEMO]` suffix bleed into UI (BUG-6), residual admin assignment skewing Catering to 5/6 (data side of BUG-4).

## Fixes confirmed since session 1

- BUG-2 (Lead `2 / 0 besetzt` + 0% OKR) — **fixed**. Roster now shows "2 Volunteers · Schicht abgeschlossen" and both bars clamp to 100%. However see BUG-S1 above for the opposite edge (over-100%).
- BUG-4 UI side — **fixed**. Non-volunteers see a disabled "Nur Volunteers" pill instead of "Übernehmen"; `volunteer/actions.ts:56-61` also rejects non-volunteers server-side.
- UX-5 / CODE-1 (English login tagline) — **fixed**. Reads "Die Build Week läuft auf START CREW." (`src/app/page.tsx:47`).
- A11Y-1 (login autocomplete) — **fixed**. `src/app/_components/login-form.tsx:76,89` has `autoComplete="email"` / `"current-password"`.
- CODE-2 / CODE-3 (raw hex colors) — **fixed**. Status badges use `bg-lead-purple/20 text-lead-purple-soft` tokens; forecast chart uses `var(--chart-…)` / `var(--signal-yellow)` / `var(--urgent-red)`.
- CODE-4 / CODE-5 (upload aria-labels) — **fixed**. `batch-task-upload.tsx:276` and `venue-map-upload.tsx:100` both carry descriptive German aria-labels.
- UX-2 (success confirmation on PM broadcast) — **partly fixed**. A "Nachricht verschickt." toast now fires next to the button. The underlying "Zuletzt verschickt" list is still empty because BUG-3 is upstream (see BUG-S2).

## Still present from session 1

- **BUG-1** admin@start.test role=volunteer (see BUG-S3)
- **BUG-3** PM notifications RLS blocks sender-read (see BUG-S2)
- **BUG-4 data residue** — admin `assignments` row still occupies Catering slot
- **BUG-5** seed text contains "Notausgaenge", "Nachmittags-Gaeste", "Getraenke", "Buehnendeko", "Buero", "fuer" — commit `e0367b3` did not cover these strings
- **BUG-6** `[DEMO]` suffix bleeds into page H1s, H2s, task chips, message bodies
- **UX-1** native HTML5 validation popups in English (confirmed on AddTaskForm, AddUserForm, Leute-anfordern form)
- **UX-3** admin on `/lead` sees "wende dich an einen Admin"
- **UX-4** Bauplan-Import description still reads English column names + "All-or-nothing"
- **UI-1 / A11Y-2** disabled-button contrast ≈2.4:1 (`src/components/ui/button.tsx:24`) — now also affects the new "Nur Volunteers" disabled pill
- **UI-3** Offene Personal-Anfragen table cramps on mobile 390 px
- **UI-4** inline-edit row Status cell shows "—" instead of the Aktiv pill (`user-management.tsx:416-420`)
- **A11Y-3** forecast chart has no tabular fallback for screenreaders

---

## New bugs discovered in session 2

### BUG-S1: Lead "Team-Auslastung" can exceed 100% (observed 200%) — High
- Location: `src/app/(dashboard)/lead/_components/team-roster.tsx`, `src/app/(dashboard)/lead/page.tsx` (same OKR math as the session-1 BUG-2 fix, but the new guard only clamped the `0` denominator case).
- Steps (as Luca Hoffmann, `lead.stagea@startcrew.test`):
  1. Most tasks already "Erledigt"; add one new 09:00–12:00 task with `people_needed=1`.
  2. Two existing volunteers are still rostered on that shift.
  3. Roster header shows **"2 / 1 besetzt"**, OKR tile shows **"Team-Auslastung 200%"**, progress bar overflows the card.
- Expected: Team-Auslastung clamps at 100% or uses a fixed contracted-headcount denominator.
- Actual: `staffed / requiredHeadcount` = `2/1` = 200%.
- Evidence: `docs/ux_screenshots/session2/lead-01-dashboard.png`.
- Fix: clamp `utilization = min(staffed / required, 1)` OR switch the denominator to the static team roster size rather than "required on still-open tasks".

### BUG-S2 (was BUG-3): PM "Zuletzt verschickt" never populates — High (unchanged from session 1)
- Location: `src/app/(dashboard)/project/page.tsx:105` + `supabase/migrations/004_auth_and_profiles.sql:349-356` (`notifications_select` RLS policy).
- Steps: as PM, send a broadcast. Toast fires ("Nachricht verschickt." — new, good). Reload `/project`. "Zuletzt verschickt" remains "Noch nichts gesendet." The Lead side receives the message correctly.
- Root cause: RLS SELECT policy allows `to_user_id = auth.uid() OR to_role = <my role>`. PM sending to role `lead` matches neither branch for the sender.
- Evidence: `docs/ux_screenshots/session2/pm-04-after-broadcast.png` + `lead-01-dashboard.png` (message at top of Updates).
- Fix: extend RLS SELECT policy with `OR from_user_id = auth.uid()`.

### BUG-S3 (was BUG-1): `admin@start.test` is still a Volunteer in the DB — High (unchanged)
- Location: `profiles` row for `admin@start.test`.
- `POST /api/auth/login` with the assignment-brief credentials returns `{ role: "volunteer" }`. Navigating to `/admin` is redirected by the guard at `src/app/(dashboard)/admin/page.tsx:41-46` → `/` → `/volunteer`.
- Admin user table confirms: bottom rows show `— admin@start.test Volunteer — Aktiv` and `— felix.lorenz@startglobal.org Volunteer — Aktiv` (a second name-less volunteer created mid-project).
- Evidence: `docs/ux_screenshots/session2/04-admin-overview.png`.
- Fix: SQL one-liner — `UPDATE profiles SET role='admin', name='Admin Demo' WHERE email='admin@start.test';` OR point the assignment brief at `admin@startcrew.test`.

### BUG-S4: Mobile (≤390 px) dashboard header drops the user-name / role badge — Medium
- Location: dashboard header (likely `src/components/nav-bar.tsx` / nav-header).
- Steps: log in as any role, viewport 390×844. Header shows logo + nav link + "Abmelden" only. No name, no role badge.
- Impact: on a shared device the user cannot verify which account they're on before Abmelden.
- Evidence: `docs/ux_screenshots/session2/pm-06-mobile-header.png`, `11-admin-mobile.png`.
- Fix: at `sm:` breakpoint, keep an avatar-only pill (first initial + role dot) so identity stays visible.
- Related: `src/components/nav-bar.tsx:49` has no `flex-wrap`, so on narrow viewports the 4 admin nav items + user block also risk overflow — add `flex-wrap` or collapse into a burger menu at `md:hidden`.

### BUG-S5: `/admin` user table is effectively unusable at 390 px — Medium
- Location: `src/app/(dashboard)/admin/_components/user-management.tsx:109-206`.
- At 390 px, only Name + E-Mail columns fit. Wrapper has `overflow-x-auto` (scrollWidth 793 / clientWidth 292), so horizontal scroll technically works — but no gradient fade, no "← scrollen →" affordance, and nesting horizontal scroll inside vertical scroll on iOS is awkward.
- Evidence: `docs/ux_screenshots/session2/11-admin-mobile.png`.
- Fix: at `sm:hidden`, collapse the table to stacked cards (same pattern used on `/volunteer` Offene Aufgaben). Minimum: add a right-edge fade and a visible "→ scrollen" hint.

### BUG-S6: Typo "Bemanning" should be "Bemannung" on `/project` hero — Medium
- Location: `src/app/(dashboard)/project/page.tsx:237`.
- Exact copy: *"Echtzeit-Übersicht über **Bemanning**, Aufgaben und ML-Prognosen."* — the word beneath (the chart H2) correctly reads "Bemannung heute".
- Evidence: `docs/ux_screenshots/session2/pm-01-project-overview.png`.
- Fix: replace "Bemanning" → "Bemannung".

### BUG-S7 (was BUG-4 data side): Admin still holds a volunteer assignment in the DB — Medium
- Location: `assignments` table. UI side of session-1 BUG-4 is fixed — the server action in `volunteer/actions.ts:56-61` rejects non-volunteers and the UI disables the pill — but the row that was written during the session-1 experiment is still in the DB.
- Effect: `/volunteer` as admin still shows "Dein aktiver Task · Mittagsservice [DEMO]" with "Jonas Weber anrufen" button; Catering sektor reads **5/6 (83%)** instead of the intended **4/6 (67%)**.
- Evidence: `docs/ux_screenshots/session2/08-volunteer-as-admin.png`, `vol-01-as-admin.png`.
- Fix: one-shot SQL — `DELETE FROM assignments WHERE volunteer_id IN (SELECT id FROM profiles WHERE role != 'volunteer');` — or re-run the seed.

### BUG-S8: AddUserForm inputs have no `id`, no `name`, no `autocomplete` — Medium
- Location: `src/app/(dashboard)/admin/_components/user-management.tsx:246-286` + `src/components/ui/input.tsx:24-34`.
- `document.querySelectorAll('form input,form select')` returns six fields with `id: null, name: null, autocomplete: null`.
- Impact: password managers can't offer "save new password" on the create-user flow; screenreader exposure is weaker; and because `Input` wraps control in `<label htmlFor={id}>` with `id` undefined, axe flags a warning.
- Fix: add `autoComplete="new-password"` on the password field, `autoComplete="email"` on the email field, and either pass explicit `id` props or make `Input` fall back to `React.useId()`.

### BUG-S9: Stage A Sektor-Karte renders "0% · 0 / 0" in red — Low
- Location: `src/app/(dashboard)/volunteer/_components/sector-map.tsx:35-66`.
- When a zone has no open slots at all, the tile is painted with the ≤50% red urgency treatment, reading as "totally unstaffed" when it actually means "nothing is being requested".
- Evidence: `docs/ux_screenshots/session2/08-volunteer-as-admin.png` (left-most Stage A card), `vol-01-as-admin.png`, `vol-02-as-volunteer.png`.
- Fix: special-case `total === 0` → neutral tile "—" or label "Keine offenen Plätze".

### BUG-S10: Lead Updates "ungelesen"-badge off by one — Low
- Location: `src/app/(dashboard)/lead/_components/updates-feed.tsx` (unread counter source).
- Steps: log in as Lead. Updates panel lists 6 messages, badge reads **"5 ungelesen"**. Clicking the first unread → "4 ungelesen" (off-by-one persists).
- Likely cause: one message is already read but is not visually differentiated in the list.
- Evidence: `docs/ux_screenshots/session2/lead-01-dashboard.png`.
- Fix: either tint the already-read row (opacity-60 + no bold + no dot) OR recompute the badge from `messages.filter(m => !m.is_read).length`.

### BUG-S11 (static): `.or()` filter string-concats `user.id` — Medium
- Location: `src/app/(dashboard)/lead/page.tsx:79` — ``.or(`to_role.eq.lead,to_user_id.eq.${user.id}`)``.
- The value is a UUID so injection is inert in practice, but the project rule in `CLAUDE.md` is explicit: "Parametrized queries only — never string concatenation in SQL or Supabase filters."
- Fix: split into two `.or()` branches or use an RPC.

---

## UX issues (new)

### UX-S1 (was UX-1, new surface): German validation missing on the AddUserForm
- Location: `/admin` → "User anlegen". `form.reportValidity()` returns `"Please fill in this field."` for every required input.
- Fix: add `noValidate` on the `<form>` and surface a German inline hint, or set `onInvalid` with `setCustomValidity("Bitte ausfüllen.")`.

### UX-S2 (was UX-1, new surface): German validation missing on Lead "Leute anfordern"
- Location: `/lead` → Leute anfordern → Schicht-Start datetime-local. Bubble reads "Please fill in this field."
- Evidence: `docs/ux_screenshots/session2/lead-03-anfrage-empty.png`.
- Same root cause as UX-1 / UX-S1 — every `required` input is affected. One fix for all surfaces: add a small `useGermanValidation()` helper that wires `onInvalid`.

### UX-S3: Invalid-email bubble on login is English too
- Location: `src/app/_components/login-form.tsx:71` — typing "foo" into the email field and submitting pops "Please include an '@' in the email address."
- Fix: same custom-validity handler as UX-S1 / UX-S2.

### UX-S4 (was UI-4): Inline-edit Status cell shows lone "—" instead of the Aktiv pill
- Location: `src/app/(dashboard)/admin/_components/user-management.tsx:416-420`. Comment in-source explicitly opted out of rendering a badge in edit mode; visual inconsistency is confusing.
- Fix: keep the existing `<StatusBadge>` rendered (read-only) during edit.

### UX-S5: Bauplan-Import description is dev-jargon (was UX-4, still present)
- `src/app/(dashboard)/admin/_components/batch-task-upload.tsx:256` — renders `CSV mit Spalten: zone, task_name, shift_start, shift_end, people_needed, skills, description, priority. All-or-nothing.`
- Fix: list the column names as a separate `<code>` block, translate "All-or-nothing" → "Entweder alle Zeilen oder keine — bei Fehlern wird nichts importiert."

### UX-S6: "Zuletzt verschickt" misleading empty-state (was UX-2, still present)
- Tied to BUG-S2. Even after a successful broadcast + success toast, the list below reads "Noch nichts gesendet." If the RLS fix is deferred, replace the list with a toast-only confirmation and drop the static empty-state copy.

### UX-S7: `[DEMO]` bleed-through (was BUG-6, enumerated surfaces)
- `/lead` page H1: **"[DEMO] Stage A Crew · Stage A"**; roster H2 repeats it.
- Checklist rows: "Sound-Check [DEMO]", "Traverse aufbauen [DEMO]", "Strom verkabeln [DEMO]", "Buehnendeko montieren [DEMO]".
- Volunteer tiles: "Mittagsservice [DEMO]", "Streaming-Check [DEMO]", "Nachmittags-Empfang [DEMO]", "Green Room einrichten [DEMO]", "Moderatorenpult [DEMO]".
- PM Offene Anfragen cards.
- Fix: move `[DEMO]` to a `is_demo` boolean column and stop concatenating it into `name`.

### UX-S8: Admin at `/lead` sees "Wende dich an einen Admin" (was UX-3)
- Admin IS the admin; the copy is absurd for that role. Fix: redirect admin → `/admin` from `/lead`, OR branch the empty-state copy on `role === 'admin'`.

### UX-S9: Mis-seeded "Unbenannt" display-name for `admin@start.test`
- Location: `/volunteer` user badge. Because `profiles.name` is NULL, the avatar initials become "U" and the top card title is the literal word "Unbenannt". Fixes on the data side along with BUG-S3.
- Evidence: `docs/ux_screenshots/session2/vol-02-as-volunteer.png`.

### UX-S10: German-formatted date silently rejected by `<input type="datetime-local">`
- Location: Lead Leute-anfordern + PM Task-hinzufügen.
- Repro: type `23.04.2026 09:00` into the Schicht-Start field; console logs `[WARNING] The specified value "23.04.2026 09:00" does not conform to the required format. The format is "yyyy-MM-ddThh:mm"`. Field silently clears; no German hint.
- Fix: either add a datetime *picker* (so typing isn't the primary input), or pre-fill a German-format placeholder and convert client-side on blur.

### UX-S11: "Nachricht verschickt." toast fires next to the button (positive finding from session 1's UX-2)
- New feedback loop is in place. The remaining misleading copy is only the "Zuletzt verschickt" list itself.

---

## UI / Visual issues (new)

### UI-S1: "Nur Volunteers" disabled pill fails WCAG AA
- Location: `/volunteer` open-jobs tiles for non-volunteer visitors; computed styles `color: rgb(85,85,85)` on bg `rgb(26,26,26)` ≈ 2.4:1 contrast ratio.
- Same root cause as UI-1: `src/components/ui/button.tsx:24` — `disabled:bg-surface disabled:text-concrete`.
- Fix: `disabled:bg-transparent disabled:border disabled:border-concrete/60 disabled:text-concrete/90` — keeps the button legible as "not clickable".

### UI-S2: Mobile `/project` chart legend overlaps the chart area
- At 390 px the "IST · PROGNOSE · FEHLBEDARF" legend floats into the top-right of the plotting area and the x-axis time labels disappear (only the "0" Y-tick remains).
- Evidence: `docs/ux_screenshots/session2/pm-05-project-mobile.png`.
- Fix: at `sm:` viewport, move legend below the chart and shrink tick density.

### UI-S3: "User anlegen" button wraps to two lines at 390 px
- Location: `src/app/(dashboard)/admin/_components/user-management.tsx:69-77`. Cosmetic.
- Fix: add `whitespace-nowrap` on the Button's className or shrink horizontal padding.

### UI-S4: `/admin` user-table columns collapse past recognition at 390 px
- Details under BUG-S5.

### UI-S5: Nav-bar has no `flex-wrap`
- Location: `src/components/nav-bar.tsx:49`.
- Admin has 4 nav items + user-name + Abmelden block; narrow viewports risk horizontal overflow.
- Fix: `flex-wrap` on the outer container or collapse to a burger menu at `md:hidden`.

### UI-S6: Raw `<img>` (not `next/image`) on avatar strips
- `src/app/(dashboard)/lead/_components/team-roster.tsx:123` and `src/app/(dashboard)/volunteer/_components/profile-strip.tsx:33`.
- Not a functional bug; will cause CLS / no optimization in prod. Low priority — migrate once avatars are real assets.

---

## Accessibility observations

- **A11Y-S1**: AddUserForm password input lacks `autoComplete="new-password"` (tied to BUG-S8). Low.
- **A11Y-S2**: AdminUserTable has no `<caption>` or `aria-label` (`user-management.tsx:110`). Screenreaders announce "table, 6 columns" without context. Low — add a visually-hidden caption.
- **A11Y-S3**: `/lead` empty-state paragraph for Admin is just a `<p>`. Wrap in `role="status"` / `aria-live="polite"`. Low.
- **A11Y-S4**: `/lead` "Leute anfordern" Zone uses a disabled text input to display "Stage A". Screenreader says "Zone, Stage A, disabled edit". Better pattern: a `<dl>` or read-only `<div>` with label "Zone · Stage A". Low.
- **A11Y-S5**: Inline-edit inputs (Name, Rolle, Telefon) at `user-management.tsx:386-414` have no `aria-label` and no visible `<label>` — only the column header and placeholder `—` convey meaning. Medium — add `aria-label="Name" | "Rolle" | "Telefon"`.
- **A11Y-S6**: `Input`/`Select`/`Textarea` in `src/components/ui/input.tsx:24-34` reference `htmlFor={id}` without callers passing `id` → `htmlFor` is `undefined`. Low — fall back to `React.useId()`.
- **A11Y-S7**: Forecast-chart SVG has `role="img"` + `aria-label` but no tabular fallback (A11Y-3 still present). `src/app/(dashboard)/project/_components/forecast-chart.tsx:73-183`. Low — add a visually-hidden `<table>` or `aria-describedby`.
- **A11Y-S8**: Volunteer Sektor-Map tiles convey status only via border/bg color (`sector-map.tsx:35-66`). Low — add `aria-label={zone + ": " + pct + " Prozent besetzt"}`.
- **A11Y-S9**: `/project` outstanding-requests "Schliessen" button has no row-context aria-label (`outstanding-requests.tsx:132-139`). Low — `aria-label={`Anfrage ${req.zone} schliessen`}`.
- **A11Y-S10**: Lead updates-feed unread state relies on dot + font-weight only (`updates-feed.tsx:55-93`). Low — add `aria-label={n.is_read ? "Gelesen" : "Ungelesen"}`.

---

## German-UI copy consistency

- `src/components/nav-bar.tsx:24` — **"Projekt-Mgmt"** mixes German + English abbreviation. Low — use "Projekt" or "Projektleitung".
- `src/app/(dashboard)/admin/_components/user-management.tsx:25` — role option label **"Project Manager"** is English while siblings are German ("Admin" / "Team-Lead" / "Volunteer"). Low — use "Projekt-Management".
- `src/app/(dashboard)/project/_components/outstanding-requests.tsx:34` — status label "Kritisch" applied to `open` state may mislead. Low — consider "Offen" and reserve "Kritisch" for aged requests.

---

## Console / network notes

- **404** on `GET http://localhost:3000/api/auth/logout` — clicking "Abmelden" fires a request the server has no route for. Logout still works (client-side `router.replace('/')` + Supabase `signOut()`), but the stray 404 is noisy for a grading demo. Fix: add the route as a thin pass-through, or remove the stale `fetch` from the logout handler.
- **Warning** on `datetime-local` inputs when typed in German format — see UX-S10.
- **Non-issue**: Next.js dev-mode CSS `preload but not used` warning — harmless, ignore.
- No runtime `console.error` / exceptions across `/`, `/admin`, `/project`, `/lead`, `/volunteer`.

---

## Views tested this session

- [x] `/` login — desktop + mobile 390×844; email/password validation bubbles (English); autocomplete confirmed.
- [x] `/admin` — user table (desktop + mobile 390px), "User anlegen" form (all 5 fields inspected; validation triggered), inline edit row (Status cell inspected), Bauplan-Import section, Venue-Map-Upload section; role redirects `admin → /lead/volunteer/project`.
- [x] `/project` — stat cards, forecast chart (desktop + mobile 390px), Fortschritt je Zone, Offene Personal-Anfragen (Schliessen), Task hinzufügen (empty submit + valid submit), Nachricht an Team-Leads (broadcast sent + received on Lead side).
- [x] `/lead` — Updates feed (unread count off-by-one), Tages-Checkliste (checked off last task → "Schicht abgeschlossen"), Team-Auslastung (pre-complete 200% overshoot), Leute-anfordern form (empty submit + valid submit).
- [x] `/volunteer` — as volunteer AND as admin (residual assignment visible), Sektor-Karte (Stage A 0%/0 red anomaly), Offene Aufgaben (disabled "Nur Volunteers" pill for non-volunteers), role redirects `volunteer → /admin/project/lead → /volunteer`.
- [x] Logout from all four dashboards; mobile viewport (390×844) on `/`, `/admin`, `/project`, `/lead`, `/volunteer`.

---

## Recommended fix order

1. **BUG-S3** (seed admin) + **BUG-S2** (RLS sender-read). Two SQL updates. Unblock the assignment brief and unblock the "Zuletzt verschickt" feed in one go.
2. **BUG-S1** (Team-Auslastung > 100%). One `Math.min(…, 1)` line.
3. **BUG-S7** (residual admin assignment). One DELETE statement.
4. **BUG-S6** (Bemanning typo). One character.
5. **BUG-S5** + **BUG-S4** (mobile header + user table). Card-fallback layout below `sm:`.
6. **BUG-5** + **BUG-6** (seed umlauts + `[DEMO]` bleed). One seed-data migration.
7. **UX-S1 / S2 / S3 / S10** (German form validation + datetime handling). Shared `onInvalid` helper.
8. **UI-1 / UI-S1** (disabled-button contrast). Tailwind class swap in `button.tsx:24`.
9. **BUG-S8** (AddUserForm id/name/autocomplete) + A11Y-S1.
10. Remaining Low-severity polish.
