# START CREW

Real-time coordination app for the Start Summit build week. University of St. Gallen — group project.

## Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **ML service:** Python 3 — scikit-learn, pandas, numpy, matplotlib (course-constrained, see docs/course_constraints.md)
- **DB & Auth:** Supabase (hosted PostgreSQL + Supabase Auth)
- **API layer:** Next.js API routes for frontend data; Python writes ML results directly to Supabase via `supabase-py`
- **Hosting:** Vercel (Next.js) · Render cron job (Python ML) · Supabase (DB + Auth). Dev: always localhost. Details in docs/tech_architecture.md.

## Commands

- `npm run dev` — start Next.js dev server
- `python ml/forecast.py` — run ML forecast, writes predictions to Supabase `forecasts` table
- `python ml/seed_supabase.py` — seed demo data into Supabase

Non-obvious notes:
- Before any Supabase migration or seed script, VERIFY you are targeting the dev project, not production.
- Prefer running single test files, not the full suite.
- Python scripts run from the `ml/` directory: `cd ml && python forecast.py`

## Rules

- IMPORTANT: Every Supabase table query filters by role/team explicitly (defense in depth, even with RLS).
- Credentials never hardcoded — use `.env.local` for Next.js, `.env` for Python. Neither committed.
- ML code uses **only** course-taught Python concepts and libraries (see docs/course_constraints.md). The ML code must look like a student with one semester of Python wrote it.
- Next.js frontend has no such restriction — use modern TypeScript, proper patterns, Tailwind.
- **German UI text and German code comments.** All user-facing labels, buttons, headings, error messages, and empty states in German (informal Du). All code comments and docstrings in German. Variable names, function names, and file names stay English.
- Every non-trivial code block gets a German comment explaining the why. This is a grading requirement ("well documented by comments"). Use the `commenter` agent before committing.
- Brand identity: dark-first UI, Signal Yellow (`#F5C800`) accent. See docs/brand_guidelines.md.
- No Supabase Realtime (WebSockets) — use page refresh / `router.refresh()` instead.
- No Supabase Storage or Edge Functions — files stored locally, logic stays in Next.js/Python.
- `random_state=42` whenever randomness is involved in Python ML code.
- Parametrized queries only — never string concatenation in SQL or Supabase filters.
- IMPORTANT: If unsure whether a Python concept/library is allowed: check docs/course_constraints.md. If it's not explicitly listed as allowed, it is **forbidden** (conservative default).

## Workflow

- IMPORTANT: Always read the relevant docs/ file before implementing a feature.
- Use subagents for heavy work: `planner` before multi-file features, `architect` for design decisions, `commenter` before committing.
- Quality sequence: implement → `commenter` agent → review diff → commit.
- One feature per session. /compact before auto-compaction.
- Never push to main. Create a PR via GitHub CLI.

## Don't

- Don't use libraries not in docs/course_constraints.md for the Python ML code.
- Don't hardcode Supabase credentials. Use environment variables.
- Don't skip reading docs/course_constraints.md before writing any Python.
- Don't commit without running the `commenter` agent first. Grading penalises undocumented code.
- Don't put implementation details here. Use docs/ for specs, agents for patterns.
- Don't write to .env files. Add env vars manually.
- Don't use Supabase Realtime, Storage, or Edge Functions.
- Don't run `npm update` or upgrade dependencies without explicit intent.

## Reference

Read these docs when you need detail — don't rely on memory alone.

- docs/course_constraints.md — allowed/forbidden Python concepts and libraries (exam-critical)
- docs/database_schema.md — all tables, enums, RLS patterns
- docs/brand_guidelines.md — colors, typography, component patterns, logo
- docs/tech_architecture.md — stack rationale, how Next.js and Python connect
- docs/user_profiles.md — four user roles, permissions, route guards
- docs/visualizations.md — page-by-page UI specs and data sources
- docs/execution_plan.md — phased build roadmap
- docs/ml_plan.md — ML forecast + scheduling spec (Phase 6 detail)
- docs/idea_description.md — project context, grading criteria, team allocation

## Compact Instructions

When compacting, always preserve: which feature/module is being worked on, which files were modified, all architectural decisions made this session, and any unresolved issues or next steps.
