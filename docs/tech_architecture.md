# Tech Architecture

## Stack Overview

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 14 (App Router)                 │
│  TypeScript · Tailwind CSS · Supabase client        │
│  Pages: Login · PM Dashboard · Team Lead ·          │
│         Volunteer · Admin                           │
├─────────────────────────────────────────────────────┤
│  DATABASE & AUTH — Supabase                         │
│  PostgreSQL · Row Level Security · Supabase Auth    │
│  8 tables · role-based access · CHECK constraints   │
├─────────────────────────────────────────────────────┤
│  ML SERVICE — Python 3                              │
│  scikit-learn · pandas · numpy · matplotlib         │
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
