# Playwright Exploration Findings — 2026-04-23

## Summary
Explored START CREW logged in as Admin (`admin@startcrew.test`), PM (`pm.aier@startcrew.test`), Team-Lead (`lead.stagea@startcrew.test`), and Volunteer. Desktop plus mobile (390x844). No console errors or failed network requests, and the happy-path flows (login, logout, navigation, role-gated redirects, task uptake, request closing, message-send-and-receive) all work. The app has a coherent visual identity and the role-scoped routing is well-implemented.

However there are four meaningful bugs, mostly around demo-data hygiene and state consistency. Top issues:

1. The user I was asked to log in as (`admin@start.test`) is in the DB as a Volunteer, not an Admin, so the task setup only works with the real seed admin `admin@startcrew.test` / `StartCrew123!`. This was already captured in docs/review_2026-04-23.md but not yet fixed.
2. After a Team-Lead completes the last remaining task, their view shows `2 / 0 besetzt` and OKR "Team-Auslastung 0%" — a division-by-zero/empty-state UX bug.
3. PM "Zuletzt verschickt" feed permanently shows "Noch nichts gesendet" — the RLS SELECT policy on `notifications` only lets receivers read, not the sender, so the PM can never see their own broadcasts even though they arrived at the Lead side.
4. Admin role can hit the `/volunteer` page and actually "Übernehmen" tasks like a volunteer — admin is supposed to be a read-everything/manage role, not a worker.
5. Demo seed data still contains ASCII placeholder strings ("Notausgaenge", "Getraenke", "Gaeste", "Buero", "fuer", "Buehnendeko"), and every demo object still carries a `[DEMO]` suffix that leaks into the UI, which is noisy for a grading demo.

Also a handful of small issues: English leftover on the login page, native HTML5 form validation in English, disabled-button contrast below WCAG AA, mobile table cramping, and missing `autocomplete` on the password field.

## Bugs (Critical → Low)

### BUG-1: `admin@start.test` has role `volunteer`, not `admin` — Severity: High (but already known)
- Location: seed data / `profiles` row for `admin@start.test`
- Steps:
  1. Log in at `/` with `admin@start.test` / `test123`.
  2. Observe redirect lands on `/volunteer`, nav shows "Leon Roth / Volunteer" (name comes from the *previous* session; on a cold session you see "Unbenannt / Volunteer").
  3. Manually navigating to `/admin` redirects back to `/volunteer`.
- Expected: that account is the admin demo account.
- Actual: DB profile row has role `volunteer` and no name, so the route-guard in `src/app/(dashboard)/admin/page.tsx` (lines 41–46) sends them away.
- Evidence: `docs/ux_screenshots/02-admin.png` bottom of user table shows `— admin@start.test Volunteer — Aktiv`. Already documented in `docs/review_2026-04-23.md §1.1`.
- Fix: either promote the row to `role='admin'` and set `name='Admin Demo'`, or delete it; then point the assignment brief at `admin@startcrew.test` / `StartCrew123!` (the real seed admin).

### BUG-2: Team-Lead view shows `2 / 0 besetzt` and OKR "Team-Auslastung 0%" when all shift tasks are complete — Severity: High
- Location: `/lead` — `src/app/(dashboard)/lead/_components/team-roster.tsx` line 63 and `src/app/(dashboard)/lead/page.tsx` around lines 211–234
- Steps:
  1. Log in as `lead.stagea@startcrew.test` / `StartCrew123!`.
  2. In "Tages-Checkliste" check off the one remaining open task ("Sound-Check [DEMO]" at 19:00–21:00).
  3. Observe the middle roster card header changes from `2 / 3 besetzt` → `2 / 0 besetzt` and the OKR "Team-Auslastung" drops from 67% to 0%.
- Expected: when no open tasks remain the card should show an "Alle Aufgaben erledigt" state, or use the historical required count; the OKR label should not imply the team is empty when 2 people are still on the roster.
- Actual: `requiredHeadcount` in `lead/page.tsx` sums `people_needed` only over `status !== 'complete'`, so it collapses to 0 once the shift is done. The roster text then renders `{staffed} / {required}` = `2 / 0`.
- Evidence: `docs/ux_screenshots/11-lead-after-checkbox.png`, `docs/ux_screenshots/12-lead-after-checkbox-full.png`.
- Fix: guard the denominator before rendering (e.g. if `required === 0 && staffed > 0`, show "Schicht abgeschlossen" and clamp the progress bar to 100%), and don't derive "Team-Auslastung" from zero/zero.

### BUG-3: PM "Zuletzt verschickt" feed never shows sent broadcasts (RLS hides them from the sender) — Severity: High
- Location: `/project` — `src/app/(dashboard)/project/page.tsx` lines 103–107 and `supabase/migrations/004_auth_and_profiles.sql` lines 349–356
- Steps:
  1. Log in as `pm.aier@startcrew.test` / `StartCrew123!`.
  2. In "Nachricht an Team-Leads" with recipient "Alle Team-Leads" type any non-empty message, click Verschicken.
  3. Reload `/project`.
  4. Observe "Zuletzt verschickt" still shows "Noch nichts gesendet."
  5. Log in as `lead.stagea@startcrew.test` → the broadcast is there in the Updates feed, so the write succeeded.
- Expected: the PM sees their last 5 sent messages listed under "Zuletzt verschickt".
- Actual: `notifications_select` RLS allows only `to_user_id = auth.uid() OR to_role = <my role>`. For a PM (role `pm`) sending to role `lead`, neither branch matches, so the `.eq("from_user_id", user.id)` query in `project/page.tsx` comes back empty.
- Evidence: see the screenshots above; DB-level — the Luca-Lead listing in my evaluator output shows `von Stefan Aiervor 2 Min.Test` and `von Stefan Aiervor 3 Min.Test broadcast - PM kann Nachrichten senden.`.
- Fix: extend the SELECT policy with `OR from_user_id = auth.uid()` so senders can always read their own notifications.

### BUG-4: Admin role can "Übernehmen" tasks on the volunteer board — Severity: Medium
- Location: `/volunteer`, task action server action
- Steps:
  1. Log in as `admin@startcrew.test` / `StartCrew123!`.
  2. Navigate to `/volunteer`.
  3. Click "Übernehmen" on any open task.
  4. Observe the task is taken (status moves to "Eingeteilt" for Ada Admin, the task card flips to "Schon eingeteilt", sektor-map count goes up).
- Expected: either the page should not show the "Übernehmen" buttons to non-volunteers (consistent with the Lead page showing "Dir ist aktuell kein Team zugeordnet" for admin), or the server action should reject non-volunteers with a role check.
- Actual: admin can create an assignment on themselves and now occupies a slot meant for a real volunteer, skewing the sector-map numbers the volunteers use.
- Evidence: `docs/ux_screenshots/09-volunteer-after-uebernehmen.png` — header now says "Eingeteilt · Mittagsservice [DEMO]" and "Jonas Weber anrufen" button appears; Catering goes from 4/6 (67%) to 5/6 (83%) because an admin is occupying one slot.

### BUG-5: Seed task/message text still contains ASCII-transliterated umlauts — Severity: Low
- Location: `supabase/migrations/008_seed_demo_data.sql` (despite commit `e0367b3 chore(seed): restore German umlauts in demo data`)
- Visible in the volunteer feed: "Notausgaenge markieren", "Nachmittags-Gaeste empfangen", "Getraenke", and on the Lead feed: "Buehnendeko montieren", "im Buero", "fuer 17:00 gesucht".
- Expected: "Notausgänge", "Gäste", "Getränke", "Bühnendeko", "Büro", "für".
- Evidence: `docs/ux_screenshots/08-volunteer-as-admin.png`, `docs/ux_screenshots/10-lead-real.png`, `docs/ux_screenshots/13-lead-message-read.png`.

### BUG-6: `[DEMO]` suffix bleeds into visible UI everywhere — Severity: Low
- Example strings: the team is literally titled `[DEMO] Stage A Crew · Stage A` as a page header; task chips read "Sound-Check [DEMO]"; message bodies open with "[DEMO]".
- Expected for a grading demo: either strip `[DEMO]` for the built-in demo seed, or limit it to developer-only columns.
- Evidence: `docs/ux_screenshots/10-lead-real.png` (page heading), `docs/ux_screenshots/12-lead-after-checkbox-full.png` (checklist), `docs/ux_screenshots/17-project-as-pm.png`.

## UX Issues

### UX-1: Native HTML5 form validation falls back to English — Severity: Medium
- Submitting the "Task hinzufügen" form with an empty "Task-Name" (all German UI) pops up the browser's English "Please fill in this field." bubble.
- Evidence: `docs/ux_screenshots/18-task-empty-submit.png`.
- Fix: either add `required` + a `title`/`pattern` with a German message, or validate client-side and show a German hint in-page. Simpler: add `noValidate` to the form and check on submit.

### UX-2: "Zuletzt verschickt" empty state is misleading — Severity: Medium (tied to BUG-3)
- Even if BUG-3 is fixed at the RLS level, the copy "Noch nichts gesendet." appears immediately after the user just sent a message, which is confusing. A short toast like "Nachricht an alle Team-Leads verschickt" would help.

### UX-3: "Dir ist aktuell kein Team zugeordnet" on `/lead` for Admin — Severity: Low
- Admin visiting `/lead` hits the Lead page with an empty state that says "wende dich an einen Admin". That reads odd — the admin *is* the admin.
- Fix: block Admin from `/lead` (force redirect to `/admin`) or special-case the copy for admin role.

### UX-4: "Bauplan-Import" description uses developer terminology — Severity: Low
- Label text reads `CSV mit Spalten: zone, task_name, shift_start, shift_end, people_needed, skills, description, priority. All-or-nothing.` That's a CS-student-friendly wording, but the field names are English and "All-or-nothing" is jargon.

### UX-5: "Build week runs on START CREW." tagline on the login page is English — Severity: Low
- Everywhere else in the app is strict German (informal Du). Either translate to "Die Build Week läuft auf START CREW." or just drop it.
- Evidence: `docs/ux_screenshots/01-login.png`.

## UI / Visual Issues

### UI-1: Disabled "Verschicken" button is almost invisible — Severity: Medium
- Class `disabled:bg-surface disabled:text-concrete` computes to `bg=rgb(26,26,26) color=rgb(85,85,85)` on the dark surface. Fails WCAG AA contrast (≈ 2.4:1).
- On first render of the PM page the message button looks like plain text, not a button at all.
- Evidence: `docs/ux_screenshots/05-project.png`, `docs/ux_screenshots/06-project-message.png`, `docs/ux_screenshots/18-task-empty-submit.png`.
- Fix: use a subtle outlined look for disabled (e.g. `disabled:border disabled:border-concrete/40 disabled:text-concrete` on transparent bg) so it still reads as a button.

### UI-2: "Ist vs. Prognose"-Chart legend keys are hard to read — Severity: Low
- Legend shows "IST" (solid yellow), "PROGNOSE" (yellow outline), "FEHLBEDARF" (solid red). Visually IST and PROGNOSE are confusingly similar, and on days when IST is near zero the chart looks like it has "two overlapping red bars" which is actually red = FEHLBEDARF. Adding a small pattern or using different hues for IST vs PROGNOSE would help.
- Evidence: `docs/ux_screenshots/05-project.png`, `docs/ux_screenshots/17-project-as-pm.png`.

### UI-3: Offene Personal-Anfragen table is cramped on mobile (390px) — Severity: Low
- On narrow viewports the "Schicht" column wraps each date line and the "Schliessen" action is pushed under the status badge.
- Evidence: `docs/ux_screenshots/19-project-mobile.png`.
- Fix: on mobile, collapse the table to stacked cards (the pattern already used for Sektor-Karte / Offene Aufgaben works well).

### UI-4: Status column for the inline edit row in admin shows "—" — Severity: Low
- When editing a user inline, the Status cell loses its badge and renders just a dash, while every other row has a green "Aktiv" pill.
- Evidence: `docs/ux_screenshots/04-admin-edit-user.png`.

## Accessibility Observations

### A11Y-1: Password field lacks `autocomplete="current-password"` — Severity: Low
- Chrome DevTools verbose: `[DOM] Input elements should have autocomplete attributes (suggested: "current-password")`.
- Fix: add `autoComplete="email"` / `autoComplete="current-password"` on the login form inputs.

### A11Y-2: Disabled button contrast (see UI-1) — Severity: Medium
- Same issue viewed through the WCAG lens.

### A11Y-3: "Bemannungs-Prognose pro 2h-Slot" chart is a single `<img>` with that alt text, no table fallback — Severity: Low
- Screenreaders get the alt but no data. Because this is a forecast chart that's genuinely decision-relevant for the PM, a nearby `<details><summary>Werte ansehen</summary><table>…` or `aria-describedby` pointing at a text summary would help.

## Views Tested
- [x] `/` (login, desktop + mobile)
- [x] `/admin` — user table, User-anlegen modal, Bearbeiten inline edit, Venue-Map section, Bauplan-Import section (not actually uploaded)
- [x] `/project` — stat cards, Bemannungs-Prognose chart, Fortschritt je Zone, Offene Personal-Anfragen (Schliessen on Backstage succeeded), Task hinzufügen form (empty-submit triggers browser validation), Nachricht an Team-Leads (broadcast verified arriving on lead side)
- [x] `/lead` (as admin — empty-state), `/lead` (as `lead.stagea@startcrew.test` — full view: Updates click-to-read works, Tages-Checkliste checkbox flips state and triggers BUG-2, OKRs update live, Leute anfordern form rendered)
- [x] `/volunteer` (as admin — can take tasks, BUG-4), `/volunteer` (as volunteer — no edit needed, viewed previously with Leon Roth)
- [x] Role-gated redirects: `/admin` → `/` when logged out, `/admin` → `/volunteer` when logged in as volunteer-role user
- [x] Logout button on all four dashboards
- [x] Mobile viewport (390x844) on `/`, `/volunteer`, `/lead`, `/project`

---

## Static Code-Analysis Findings
(parallel pass by a code-reading agent; not all items overlap with the runtime findings above)

### Critical

- **CODE-1: English tagline on the login page** — `src/app/page.tsx:47` contains the literal "Build week runs on START CREW." CLAUDE.md mandates German informal Du for all user-visible text. (Same root cause as UX-5.)

### Likely Bugs / Brand Violations

- **CODE-2: Raw hex colors in status-badge** — `src/components/status-badge.tsx:23-24` uses arbitrary `#a855f7` and `#c084fc` for the lead/volunteer pills instead of Tailwind design tokens. Contradicts the recent commit `ffe1ed6 chore: … drop raw hex colors` and the brand guidelines.
- **CODE-3: Raw hex colors in the forecast chart SVG** — `src/app/(dashboard)/project/_components/forecast-chart.tsx:90, 98, 131, 143, 156, 165, 179` still hardcodes `#2a2a2a`, `#888`, `#F5C800`, `#FF4D4D`, `#bbb`, `#444`. Should reference CSS variables or Tailwind tokens so theme/brand changes propagate.

### Polish / Accessibility

- **CODE-4: Missing `aria-label` on CSV-upload affordance** — `src/app/(dashboard)/admin/_components/batch-task-upload.tsx:272-285`. The `<label>` element is styled as a button with `role="button"` and keyboard handlers but has no `aria-label`. Suggested: `aria-label="CSV-Datei für Tasks auswählen"`.
- **CODE-5: Same gap on the venue-map uploader** — `src/app/(dashboard)/admin/_components/venue-map-upload.tsx` has the same label-as-button pattern without an accessible name.

### Verified OK (static-analysis pass)

- Role-based access control is implemented consistently across all four dashboard pages — each calls an `assertAdmin()` / `assertLead()` / equivalent guard before rendering.
- Server-action error handling reads `.error` on every Supabase call and surfaces it through an `ActionResult` return type (no silent swallows found).
- German-language copy is otherwise consistent across form labels, buttons, toasts, and empty states — the English leftovers are just the login tagline and the native browser validation popup (UX-1).
- Tailwind design tokens are used correctly almost everywhere in `globals.css` and component className attrs (`bg-signal-yellow`, `text-urgent-red`, etc.). The hex-color escapes above are the only exceptions.
- No mock/placeholder data arrays remain in user-facing code.
- No `href="#"`, `href="/todo"`, or other broken-link stubs.

---

## Recommended fix order

1. BUG-1 (seed admin) + BUG-3 (RLS for sender) — these are **correctness** issues, easy win.
2. BUG-2 (division-by-zero OKR) — cheap guard, high visible-quality gain.
3. BUG-4 (admin can occupy volunteer slots) — either hide the button or reject in the server action.
4. BUG-5 + BUG-6 (seed umlauts + `[DEMO]` bleed) — one SQL migration fixes both.
5. CODE-2 + CODE-3 (hex colors) — 10-minute search-and-replace to restore the brand-token invariant.
6. UI-1 / A11Y-2 (disabled-button contrast) — Tailwind class swap.
7. CODE-4 + CODE-5 (missing aria-labels), A11Y-1 (autocomplete), UX-1 (German browser validation) — accessibility polish.
8. Remaining Low-severity items.
