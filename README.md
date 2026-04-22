# START CREW

> Smart Task Allocation & Real-Time Tracking for the Start Summit build week.

**Stack:** Next.js 14 · TypeScript · Tailwind · Supabase · Python (ML)

---

## Setup für Teammitglieder

### 1. Repo klonen

```bash
git clone https://github.com/nunoscholly/CSunicorn.git
cd CSunicorn
```

### 2. Next.js (Frontend)

```bash
npm install
cp .env.example .env.local
# → Supabase URL und Anon Key in .env.local eintragen (siehe Supabase Dashboard)
npm run dev
# → http://localhost:3000
```

### 3. Python (ML Service)

```bash
cd ml
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# → Supabase URL und Service Role Key in .env eintragen
```

### 4. Supabase

Die Supabase-Zugangsdaten bekommt ihr vom Projektverantwortlichen:
- `NEXT_PUBLIC_SUPABASE_URL` — Projekt-URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Anon Key (für Frontend)
- `SUPABASE_KEY` — Service Role Key (nur für Python ML Scripts)

**Wichtig:** `.env.local` und `ml/.env` werden NICHT committed. Jeder trägt die Werte lokal ein.

---

## Projektstruktur

```
CSunicorn/
├── CLAUDE.md                  # Projektregeln für Claude Code
├── .claude/                   # Claude Code Konfiguration
│   ├── settings.json          # Permissions, Hooks
│   └── agents/                # 7 spezialisierte Agenten
├── docs/                      # Projektdokumentation
│   ├── course_constraints.md  # Erlaubte/verbotene Python-Konzepte
│   ├── database_schema.md     # Alle Tabellen und RLS
│   ├── brand_guidelines.md    # Farben, Typografie, Komponenten
│   ├── tech_architecture.md   # Stack-Entscheidungen
│   ├── user_profiles.md       # 4 Rollen und Berechtigungen
│   ├── visualizations.md      # Seitenweise UI-Specs
│   ├── execution_plan.md      # Phasenplan
│   └── idea_description.md    # Projektkontext, Bewertungskriterien
├── src/                       # Next.js Frontend
│   └── app/                   # App Router Pages
├── ml/                        # Python ML Service
│   ├── requirements.txt
│   ├── .env.example
│   └── sample_data/
├── supabase/
│   └── migrations/            # SQL Migrationsdateien
└── public/
    └── maps/                  # Hochgeladene Venue-Maps
```

---

## Mit Claude Code arbeiten

Jeder kann unabhängig mit Claude Code an Features arbeiten. Die Konfiguration in `.claude/` und `CLAUDE.md` sorgt dafür, dass Claude die Projektregeln kennt.

**Wichtige Regeln:**
- **Deutsche UI-Texte und deutsche Code-Kommentare** überall
- **Python-Code** darf nur kurserlaubte Konzepte verwenden → `docs/course_constraints.md` lesen
- **Next.js-Code** hat keine solche Einschränkung — modernes TypeScript erlaubt
- **Vor jedem Commit** den `commenter` Agenten laufen lassen (Bewertungskriterium!)
- **Nie direkt auf main pushen** — immer PR erstellen

**Verfügbare Agenten:**
- `planner` — Feature in Aufgaben aufteilen
- `architect` — Architekturentscheidungen bewerten
- `db-architect` — Supabase Schema und Migrationen
- `component-builder` — Next.js UI-Komponenten bauen
- `ml-engineer` — Python ML-Features (kurskonform)
- `code-reviewer` — Code vor Commit prüfen
- `commenter` — Deutsche Kommentare hinzufügen

---

## Bewertungskriterien

| # | Kriterium | Status |
|---|---|---|
| 1 | Klare Problemdefinition | ✅ In docs/idea_description.md |
| 2 | API + Datenbank | ⬜ Supabase + Google Sheets API |
| 3 | Datenvisualisierung | ⬜ ML-Forecast, Fortschrittsbalken, Sektorkarte |
| 4 | Benutzerinteraktion | ⬜ Task-Commit, Anfragen, Upload |
| 5 | Machine Learning | ⬜ Personalbedarfs-Vorhersage |
| 6 | Code-Dokumentation | ⬜ Deutsche Kommentare überall |
| 7 | Beitragsmatrix | ⬜ In docs/idea_description.md |
| 8 | 4-Minuten Video | ⬜ Noch ausstehend |

**Deadline:** 14. Mai 2026, 23:59 auf Canvas

---

## Hosting

| Service | Plattform | Zweck |
|---|---|---|
| Frontend | **Vercel** (free) | Next.js — automatisches Deploy bei git push |
| ML Service | **Render** (free) | Python Cron Job — Forecast-Skript alle 2h |
| Datenbank & Auth | **Supabase** (free) | PostgreSQL + Auth + RLS |

Während der Entwicklung läuft alles lokal (`npm run dev` + `python ml/forecast.py`). Deployment erst am Ende — Details in `docs/tech_architecture.md`.
