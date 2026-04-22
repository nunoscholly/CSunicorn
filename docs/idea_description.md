# START CREW — Idea Description

> **Smart Task Allocation & Real-Time Tracking**
> A web application built for the Start Summit build week.
> *Grundlagen und Methoden der Informatik — Group Project, University of St. Gallen*

---

## The Problem

**Start Global** organises **Start Summit**, one of Europe's largest student entrepreneurship conferences. During the build week before the event, hundreds of volunteers converge on the venue.

Two coordination failures occur simultaneously:

1. **Manpower mismatch** — some volunteers idle while other teams are critically understaffed. Information asymmetry means willing labour goes unused while urgent work stalls.

2. **Knowledge transfer breakdown** — people don't know who to talk to, where to find them, which team owns which zone. No single source of truth for task ownership, shift coverage, or contacts.

Result: chaos instead of coordination.

---

## The Solution

**START CREW** is the coordination infrastructure for build week. It brings together task allocation, shift management, staffing visibility, and manpower forecasting.

- Team leads **post manpower requests** when understaffed
- Volunteers **browse open jobs** on a color-coded sector map and commit with one tap
- PM dashboard shows **real-time staffing, ML-predicted demand, zone progress**
- Admin layer handles **pre-event setup**: construction plan import, venue map, user management

---

## Project Context

| Field | Detail |
|---|---|
| Course | Grundlagen und Methoden der Informatik |
| Institution | University of St. Gallen (HSG) |
| Project type | Group project — graded web application |
| Tech stack | Next.js (frontend) · Python/scikit-learn (ML) · Supabase (PostgreSQL + Auth) |
| Deliverables | Working app + source code + 4-minute video demo |
| Deadline | Thursday 14 May 2026, 23:59 on Canvas |
| Team size | 5 members |

---

## Grading Criteria Mapping

Scored 0–3 per criterion. 16+ points = 100%.

| # | Criterion | How START CREW satisfies it |
|---|---|---|
| 1 | Clear problem definition | Real coordination failure at Start Summit — named stakeholders |
| 2 | API + Database | Google Sheets API for roster; Supabase for all data; Supabase Auth |
| 3 | Data visualisation | ML forecast chart, zone progress bars, stat cards, sector map |
| 4 | User interaction | Task commit, request form, task upload, user mgmt, notifications, map upload |
| 5 | Machine learning | Linear regression forecasting manpower needs per zone per shift |
| 6 | Code documentation | All Python modules commented (grading requirement) |
| 7 | Contribution matrix | 5-member matrix across all functional areas |
| 8 | 4-minute video demo | Full workflow demo — no AI voiceover |

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  FRONTEND — Next.js 14                              │
│  PM Dashboard · Team Lead · Volunteer · Admin       │
├─────────────────────────────────────────────────────┤
│  DATABASE & AUTH — Supabase                         │
│  PostgreSQL · RLS · Supabase Auth                   │
├─────────────────────────────────────────────────────┤
│  ML SERVICE — Python                                │
│  scikit-learn · pandas · numpy · matplotlib         │
│  Writes predictions to Supabase directly            │
└─────────────────────────────────────────────────────┘
```

---

## Team Allocation

| Role | Responsibilities |
|---|---|
| TM1 — Project Lead + UI | Coordination, Next.js frontend, portals, layout, video |
| TM2 — Data Engineer | API integration, Supabase schema, data ingestion, cleaning |
| TM3 — ML Engineer | Forecast model, evaluation, visualization |
| TM4 — Backend Logic | Matching engine, shift allocation, dashboard data |
| TM5 — QA + Docs | Testing, documentation, contribution matrix, deployment |

### Contribution Matrix

| Area | TM1 | TM2 | TM3 | TM4 | TM5 |
|---|---|---|---|---|---|
| Project management | Lead | Support | Support | Support | Contrib |
| Next.js UI | Lead | — | Support | Contrib | Support |
| API integration | Support | Lead | — | Contrib | — |
| Database (Supabase) | — | Lead | Support | Contrib | — |
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
| Week 5–6 | Optional: present project idea to tutor |
| Week 7–8 | Optional: present MVP |
| Week 11 | Final upload — video + source code on Canvas by 14 May 2026 |
| Week 11–12 | Mandatory group video presentation |
| Week 12 | Top-3 groups present in lecture (21 May 2026) |

---

## Professor Feedback

> One bottleneck could be streamlit's ability to provide and handle user accounts; and real-time sync. This use case screams for a distributed system in which you demo it with multiple users. Streamlit is a bit hard to bend that way to make it work; perhaps you need a bit of a more sophisticated backend that actually runs in the cloud or on the local network.

**Response:** Replaced Streamlit with Next.js for the frontend. Supabase handles the distributed database and auth. Python remains for ML (course requirement). This directly addresses the professor's concern about multi-user capability.
