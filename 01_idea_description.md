# START CREW — Idea Description

> **Smart Task Allocation & Real-Time Tracking**  
> A Python Streamlit web application built for the Start Summit build week.  
> *Grundlagen und Methoden der Informatik — Group Project, University of St. Gallen*

---

## The Problem

**Start Global** organises **Start Summit**, one of Europe's largest student entrepreneurship conferences. In the week before the event, hundreds of volunteers and team members converge on the venue to physically construct and set up the event.

During this build week, two critical coordination failures occur simultaneously:

1. **Manpower mismatch** — some volunteers are idle with nothing to do, while other teams are critically understaffed and struggling to meet deadlines. This information asymmetry means willing labour goes unused while urgent work stalls.

2. **Knowledge transfer breakdown** — people don't know who to talk to, where to find them, which team owns which zone, or who is responsible for what. There is no single source of truth for task ownership, shift coverage, or contact information.

The result is a construction week that runs on chaos instead of coordination — wasted time, missed deadlines, and frustrated volunteers.

---

## The Solution

**START CREW** is a web application that acts as the coordination infrastructure for the build week. It brings together task allocation, shift management, real-time staffing visibility, and manpower forecasting in a single tool accessible to everyone on site.

The app solves both problems in parallel:

- Team leads can **post manpower requests** when they are understaffed, specifying the zone, number of people needed, shift time, and required skills.
- Volunteers with nothing to do can **browse open jobs**, see exactly where help is needed on a colour-coded sector map, and commit to a task with a single tap — including direct contact to the team lead.
- A **project management dashboard** gives ops leads a full-day view of staffing levels, ML-predicted demand, zone progress, and outstanding requests — all in real time.
- An **admin layer** handles pre-event setup: importing the construction plan, uploading the venue map, and managing user accounts.

---

## Project Context

| Field | Detail |
|---|---|
| Course | Grundlagen und Methoden der Informatik |
| Institution | University of St. Gallen (HSG) |
| Project type | Group project — graded web application |
| Tech stack | Python · Streamlit · SQLite · scikit-learn · Airtable/Google Sheets API |
| Deliverables | Working app + source code + 4-minute video demo |
| Deadline | Thursday 14 May 2026, 23:59 on Canvas |
| Team size | 5 members |

---

## Grading Criteria Mapping

The project is graded across 8 criteria, each scored 0–3. 16+ points = 100%.

| # | Criterion | How START CREW satisfies it |
|---|---|---|
| 1 | Clear problem definition | Coordination failure and information asymmetry during Start Summit build week — a real, documented use case with named stakeholders |
| 2 | API + Database | Airtable/Google Sheets API for live volunteer and task data; SQLite database stores assignments, requests, and shift history |
| 3 | Data visualisation | ML forecast chart, zone progress bars, staffing stat cards, sector map, outstanding requests dashboard |
| 4 | User interaction | Task commitment, manpower request form, task upload, user management, notification sending, map upload |
| 5 | Machine learning | Demand forecasting model (regression/time-series) predicting manpower needs per team per shift across the full day |
| 6 | Code documentation | All modules commented — data ingestion, matching logic, ML pipeline, UI components |
| 7 | Contribution matrix | Documented matrix mapping each of the 5 team members' roles across all functional areas |
| 8 | 4-minute video demo | Screen recording demonstrating the full workflow — no AI-generated voiceover |

---

## Architecture Overview

The application is structured in four layers:

```
┌─────────────────────────────────────────────────────┐
│  UI LAYER — Streamlit                               │
│  Project Mgmt · Team Lead · Volunteer · Admin       │
├─────────────────────────────────────────────────────┤
│  LOGIC LAYER — Python                               │
│  Matching engine · Shift allocation · Notifications │
├─────────────────────────────────────────────────────┤
│  DATA LAYER                                         │
│  Airtable/Sheets API · SQLite database              │
├─────────────────────────────────────────────────────┤
│  ML LAYER — scikit-learn                            │
│  Demand forecasting · Historical training data      │
└─────────────────────────────────────────────────────┘
```

**Data flow:** Volunteer roster and initial task list are pulled from Airtable/Google Sheets via API (familiar tool for organisers). All real-time activity — assignments, requests, notifications, completions — is written to and read from SQLite. The ML model is trained on historical shift data from past Start Summit editions and generates predictions on page load, stored in a `forecasts` table.

---

## Team Allocation

| Role | Responsibilities |
|---|---|
| TM1 — Project Lead + UI | Overall coordination, Streamlit frontend, volunteer and lead portals, app layout, video recording |
| TM2 — Data Engineer | Airtable API integration, SQLite schema design, data ingestion pipeline, data cleaning |
| TM3 — ML Engineer | Demand forecasting model, feature engineering, model evaluation, forecast visualisation |
| TM4 — Backend Logic | Matching engine, shift allocation logic, request/response flows, dashboard data feeds |
| TM5 — QA + Docs | Testing, code documentation, contribution matrix, Streamlit Cloud deployment |

### Contribution Matrix

| Area | TM1 | TM2 | TM3 | TM4 | TM5 |
|---|---|---|---|---|---|
| Project management | Lead | Support | Support | Support | Contrib |
| Streamlit UI | Lead | — | Support | Contrib | Support |
| API integration | Support | Lead | — | Contrib | — |
| Database (SQLite) | — | Lead | Support | Contrib | — |
| Matching engine | Support | Support | — | Lead | — |
| ML / forecasting | — | Contrib | Lead | — | Support |
| Data visualisation | Contrib | Support | Contrib | Lead | — |
| Testing | — | Support | Support | Support | Lead |
| Documentation | Contrib | Support | Support | Support | Lead |
| Video + presentation | Lead | Support | Support | Support | Contrib |

---

## Key Milestones

| Week | Milestone |
|---|---|
| Week 3 | Group defined, project Q&A |
| Week 5–6 | Optional: present project idea to tutor (10 min) |
| Week 7–8 | Optional: present MVP (first working version) |
| Week 11 | Final upload — video + source code on Canvas by 14 May 2026 |
| Week 11–12 | Mandatory group video presentation in exercise session |
| Week 12 | Top-3 groups present in lecture (21 May 2026) |

---

## Optional Extension

Deploy publicly via **Streamlit Cloud** — makes the app accessible to real Start Summit organisers and creates a compelling story for the video and jury vote. This is the single highest-impact optional feature given the real-world use case.

---

## Why This Project Scores Well

- **Real problem, real users** — not a fictional scenario. The graders will immediately understand the business case because it comes from a real event at their university.
- **ML is motivated** — historical data from past Start Summit editions means the forecasting model has genuine training data, not synthetic data. This is a much stronger argument than most groups will have.
- **All 8 criteria covered naturally** — the problem itself requires an API, a database, visualisations, user interaction, and ML. Nothing feels forced.
- **Optional deployment is achievable** — Streamlit Cloud is free and straightforward, giving the group a live URL to demo.
