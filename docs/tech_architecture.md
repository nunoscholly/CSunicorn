# Tech Architecture

## Stack Overview

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 14 (App Router)                 │
│  TypeScript · Tailwind CSS · Supabase client        │
│  Hosting: Vercel (free tier)                        │
│  Pages: Login · PM Dashboard · Team Lead ·          │
│         Volunteer · Admin                           │
├─────────────────────────────────────────────────────┤
│  DATABASE & AUTH — Supabase                         │
│  PostgreSQL · Row Level Security · Supabase Auth    │
│  8 tables · role-based access · CHECK constraints   │
├─────────────────────────────────────────────────────┤
│  ML SERVICE — Python 3                              │
│  scikit-learn · pandas · numpy · matplotlib         │
│  Hosting: Render (free tier, cron job)              │
│  Reads/writes Supabase directly via supabase-py     │
└─────────────────────────────────────────────────────┘
```

## How the Layers Connect

### Next.js <-> Supabase
- Next.js uses `@supabase/ssr` for server-side auth and data fetching
- Client-side uses `@supabase/supabase-js` for real-time-ish reads (page refresh / `router.refresh()`)
- Auth handled entirely by Supabase Auth (email/password sign-in, sign-up)
- Session managed via cookies + middleware for server components

### Python <-> Supabase
- Python ML scripts connect via `supabase-py` client
- Reads training data / current assignments from Supabase tables
- Writes forecast results to the `forecasts` table
- Runs on-demand (triggered manually or via cron), not as a persistent service
- No direct communication between Next.js and Python — they share the Supabase database

### Data Flow

```
Volunteer uses app (Next.js)
  → Supabase Auth validates session
  → Next.js reads tasks/assignments from Supabase
  → Volunteer commits to task → Next.js writes to Supabase
  → Page refresh shows updated state

ML Forecast (Python)
  → Reads historical_shifts.csv + current assignments from Supabase
  → Trains LinearRegression model
  → Writes predictions to forecasts table in Supabase
  → PM Dashboard (Next.js) reads forecasts on page load
```

## Why This Architecture

### Why Next.js instead of Streamlit?
The professor flagged that Streamlit struggles with user accounts and multi-user real-time sync. Next.js solves both:
- Proper client-side routing and auth via Supabase
- Server-side rendering for fast page loads
- Multiple users accessing the same app with proper session management
- No Streamlit session_state limitations

### Why keep Python for ML?
The ML code is graded against course-taught concepts (scikit-learn, pandas, numpy). It must demonstrate course learning. Using Python ML libraries from Next.js API routes would require running Python from Node.js — unnecessary complexity. Instead, Python scripts run independently and write results to Supabase.

### Why Supabase?
Per professor feedback: need cloud-hosted database with built-in auth for multi-user demo. Supabase provides PostgreSQL + Auth + RLS in one service, matching the course's relational database concepts (W7).

## Target File Layout

```
CSunicorn/
├── CLAUDE.md
├── .claude/
│   ├── settings.json
│   └── agents/
├── docs/
│   ├── course_constraints.md
│   ├── tech_architecture.md
│   ├── database_schema.md
│   ├── brand_guidelines.md
│   ├── user_profiles.md
│   ├── visualizations.md
│   ├── execution_plan.md
│   └── idea_description.md
├── app/                            # Next.js App Router
│   ├── layout.tsx
│   ├── page.tsx                    # Login
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Auth guard + nav bar
│   │   ├── project/page.tsx        # PM Dashboard
│   │   ├── lead/page.tsx           # Team Lead view
│   │   ├── volunteer/page.tsx      # Volunteer view
│   │   └── admin/page.tsx          # Admin panel
│   └── auth/
│       └── callback/route.ts
├── components/
│   ├── ui/                         # Shared UI primitives
│   ├── nav-bar.tsx
│   ├── status-badge.tsx
│   └── sector-map.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser client
│   │   ├── server.ts               # Server client
│   │   └── types.ts                # Generated types
│   └── utils.ts
├── ml/                             # Python ML service
│   ├── forecast.py                 # Train + predict + write to Supabase
│   ├── seed_supabase.py            # Seed demo data
│   ├── requirements.txt            # supabase, pandas, numpy, scikit-learn, matplotlib, requests
│   └── sample_data/
│       ├── historical_shifts.csv
│       └── volunteers_roster.csv
├── supabase/
│   └── migrations/                 # SQL migration files
├── public/
│   └── maps/                       # Uploaded venue maps
├── .env.local                      # Next.js env (NEXT_PUBLIC_SUPABASE_URL, etc.) — gitignored
├── ml/.env                         # Python env (SUPABASE_URL, SUPABASE_KEY) — gitignored
├── next.config.js
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .gitignore
```

## Auth Pattern

### Supabase Auth Flow
1. User enters email + password on login page
2. Next.js calls `supabase.auth.signInWithPassword()`
3. Supabase validates and returns a session (JWT)
4. Middleware refreshes the session cookie on each request
5. Server components read the session to determine role
6. Client is routed to role-appropriate page

### Route Protection
- Middleware checks session on all `/dashboard/*` routes
- Server components verify role before rendering content
- Client-side redirects as fallback

### Role-Based Access
| Route | Allowed Roles |
|---|---|
| `/project` | admin, pm |
| `/lead` | admin, lead |
| `/volunteer` | admin, volunteer |
| `/admin` | admin |

---

## Hosting & Deployment

### Lokal (Entwicklung)

Während der Entwicklung läuft alles lokal — kein Deployment nötig:

- **Next.js:** `npm run dev` → `http://localhost:3000`
- **Python:** `cd ml && python forecast.py` (manuell bei Bedarf)
- **Supabase:** Cloud-Instanz (gleiche für dev und prod, oder separate Projekte)

### Produktion (für Demo und Abgabe)

| Service | Plattform | Tier | Zweck |
|---|---|---|---|
| Frontend | **Vercel** | Free | Next.js Hosting, automatisches Deploy bei git push |
| ML Service | **Render** | Free | Python Cron Job, führt Forecast-Skript regelmässig aus |
| Datenbank & Auth | **Supabase** | Free | PostgreSQL, Auth, RLS — bereits eingerichtet |

### Vercel (Next.js Frontend)

**Warum Vercel:** Vercel ist der Hersteller von Next.js — zero-config Deploy, automatische Previews für PRs, kostenloser Free Tier ausreichend.

**Setup:**
1. Vercel-Account erstellen auf vercel.com (mit GitHub anmelden)
2. "New Project" → GitHub-Repo `nunoscholly/CSunicorn` importieren
3. Framework wird automatisch als "Next.js" erkannt
4. Environment Variables setzen:
   - `NEXT_PUBLIC_SUPABASE_URL` → Supabase Projekt-URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → Supabase Anon Key
5. "Deploy" klicken — fertig

**Automatisches Deploy:** Jeder Push auf `main` löst ein neues Deployment aus. PRs bekommen automatisch eine Preview-URL.

**Custom Domain (optional):** Im Vercel Dashboard unter "Domains" eine eigene Domain oder die `*.vercel.app` Subdomain verwenden.

### Render (Python ML Service)

**Warum Render:** Eingebaute Cron Jobs im Free Tier, einfaches Deployment via Git, keine Docker-Kenntnisse nötig.

**Setup:**
1. Render-Account erstellen auf render.com (mit GitHub anmelden)
2. "New +" → "Cron Job" wählen
3. GitHub-Repo verbinden, Root Directory auf `ml` setzen
4. Build Command: `pip install -r requirements.txt`
5. Start Command: `python forecast.py`
6. Schedule: `0 */2 * * *` (alle 2 Stunden) oder `0 6 * * *` (täglich um 6 Uhr) — je nach Bedarf
7. Environment Variables setzen:
   - `SUPABASE_URL` → Supabase Projekt-URL
   - `SUPABASE_KEY` → Supabase **Service Role Key** (nicht Anon Key — braucht Schreibrechte auf `forecasts`)
8. "Create Cron Job" klicken

**Manueller Trigger:** Im Render Dashboard kann der Job jederzeit manuell ausgelöst werden — nützlich für Demos.

**Für die Demo:** Vor dem Video den Cron Job manuell triggern, damit frische Vorhersagen in der Datenbank stehen. Der PM Dashboard liest die Daten dann live.

### render.yaml (optional)

Für Infrastructure-as-Code kann eine `render.yaml` im Repo-Root liegen:

```yaml
services:
  - type: cron
    name: start-crew-forecast
    runtime: python
    rootDir: ml
    buildCommand: pip install -r requirements.txt
    startCommand: python forecast.py
    schedule: "0 */2 * * *"
    envVars:
      - key: SUPABASE_URL
        sync: false
      - key: SUPABASE_KEY
        sync: false
```

### Zusammenspiel in Produktion

```
Nutzer öffnet App
  → Vercel liefert Next.js Frontend aus
  → Browser verbindet sich mit Supabase (Auth + Daten)
  → Alle Lese-/Schreibzugriffe gehen direkt an Supabase

Render Cron Job (alle 2h oder manuell)
  → Führt ml/forecast.py aus
  → Liest Trainingsdaten + aktuelle Assignments aus Supabase
  → Trainiert LinearRegression Modell
  → Schreibt Vorhersagen in forecasts-Tabelle
  → PM Dashboard zeigt beim nächsten Laden die neuen Werte

Kein direkter Traffic zwischen Vercel und Render — beide sprechen nur mit Supabase.
```

### Kosten

Alles im Free Tier:
- **Vercel Free:** 100 GB Bandwidth/Monat, automatische Deploys — mehr als genug
- **Render Free:** 750h Cron-Runtime/Monat — ein 30-Sekunden-Forecast 12x/Tag = ~6h/Monat
- **Supabase Free:** 500 MB DB, 50.000 Auth-User, 2 GB Bandwidth — weit mehr als nötig
