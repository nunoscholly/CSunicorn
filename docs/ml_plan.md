# ML Plan — Dynamic Workforce Forecast

> Detailed spec for Phase 6. Covers ML model, scheduling logic, data, and dashboard integration.

---

## Goal

Predict **how many people are needed each day** of the build week, dynamically adjusted based on task progress. If a task takes longer than expected or gets pushed back, the forecast recalculates downstream impact.

---

## Why two parts?

| Part | What it does | Why |
|---|---|---|
| **Part A — ML** | Predicts task duration given crew size | Genuine regression problem, scores grading criterion #5 |
| **Part B — Scheduling** | Walks dependency graph, computes daily headcount | The actual forecast — deterministic calculation, not ML |

ML alone can't solve this: the dependency graph and deadline constraints are scheduling problems, not pattern recognition. But ML adds value by answering "how long will this task take if we assign N people?" — which feeds the scheduler.

---

## Data Source

**File:** `docs/ml_info/start_summit_volunteer_shifts.csv`

**Structure (per row):**

| Column | Example | Description |
|---|---|---|
| Task | "Hang motors" | Task name |
| Roadblocking | "Assemble Traverse + Build scaffolding" | What this task blocks (dependencies) |
| Day | 2 | Scheduled day (1–9) |
| 2024 People | 25 | Crew size in 2024 |
| 2024 Time (h) | 4 | Duration in hours, 2024 |
| 2025 People | 20 | Crew size in 2025 |
| 2025 Time (h) | 6 | Duration in hours, 2025 |
| 2026 People | 22 | Crew size in 2026 |
| 2026 Time | 4 | Duration in hours, 2026 |

**Key properties:**
- ~44 tasks forming a DAG (directed acyclic graph)
- 3 years of historical data (2024, 2025, 2026)
- Tasks span 9 days: setup (days 1–5), show day (days 6–7), teardown (days 8–9)
- Dependencies encoded via "Roadblocking" column (task A blocks tasks B + C)
- Some tasks have 0 duration (milestones: "Start of event", "End of Showday", etc.)

**Reshaped for ML:** Each task × year becomes one row → ~132 training samples.

---

## Part A — ML Model

### Feature engineering

Reshape the CSV so each row is one task-year observation:

```
task_name | year | people_count | day | is_setup | is_show | is_teardown | duration_hours
```

| Feature | Type | Source |
|---|---|---|
| `people_count` | int | People assigned that year |
| `day` | int | Scheduled day (1–9) |
| `is_setup` | 0/1 | Day 1–5 (manual flag) |
| `is_show` | 0/1 | Day 6–7 |
| `is_teardown` | 0/1 | Day 8–9 |

Target: `duration_hours` (float).

Filter out milestone rows (duration = 0) before training — they're not real tasks.

### Model pipeline

```
1. pd.read_csv() → reshape to long format (~132 rows)
2. Filter milestones (duration = 0)
3. train_test_split(test_size=0.30, random_state=42)
4. StandardScaler on features (fit on train, transform both)
5. LinearRegression().fit(X_train_scaled, y_train)
6. Evaluate: R² on test set, compare to DummyClassifier baseline
7. Print coefficients — interpret: "each additional person reduces duration by ~X hours"
```

### Expected output

- R² score (likely moderate — 3 years is thin, but the people→duration relationship is real)
- Coefficient interpretation (negative coefficient on people_count = more people → shorter task)
- Predicted duration for each 2026 task given its planned crew size

### What's within course scope

Everything: `pd.read_csv`, `train_test_split`, `StandardScaler`, `LinearRegression`, `R²` via `.score()`. All taught in W11. The manual flag columns (is_setup etc.) are just 0/1 integers — no OneHotEncoder needed.

---

## Part B — Scheduling Logic

### Dependency graph

Parse the "Roadblocking" column to build a DAG:

```python
# Beispiel: "Assemble Traverse + Build scaffolding"
# → task "Hang motors" blocks ["Assemble Traverse", "Build scaffolding"]
```

Split on " + " to get multiple downstream tasks. Store as a dict:

```python
blocks = {
    "Hang motors": ["Assemble Traverse", "Build scaffolding"],
    "Prep Wood": ["Assemble Traverse", "Build scaffolding"],
    ...
}
```

### Forward pass: compute schedule

For each task, compute `earliest_start` and `earliest_end`:

```
earliest_start[task] = max(earliest_end[predecessor] for predecessor in predecessors[task])
earliest_end[task] = earliest_start[task] + predicted_duration[task]
```

This is basic topological sort + forward pass — standard scheduling, no extra libraries needed.

### Daily aggregation

Sum up people needed per day:

```
For each day (1–9):
    daily_people[day] = sum(people_count for task if task is active on that day)
```

A task is "active on day D" if `earliest_start <= D * 12 < earliest_end` (12h workday default).

### Delay simulation

If a task's actual duration exceeds predicted:
1. Update that task's `earliest_end`
2. Recompute all downstream tasks (forward pass again)
3. Recalculate daily headcount
4. Flag if any task now pushes past the showday deadline

### Constraints

- Tasks between "Start of showday" and "End of showday" are **fixed** — they cannot move.
- Default workday = 12 hours. Work CAN exceed 12h to meet deadlines (showday, end of showday).
- All other tasks can be pushed back or moved around.

### What's within course scope

All basic Python: dicts, lists, for-loops, sorting. No graph libraries needed — the DAG is small enough (~44 nodes) that a simple topological sort with a loop is sufficient. This is W2–W4 level Python.

---

## Output: forecasts table

The scheduler writes results to Supabase. Updated schema for the `forecasts` table:

| Column | Type | Example | Description |
|---|---|---|---|
| `id` | UUID | auto | PK |
| `day` | INTEGER | 3 | Build week day (1–9) |
| `predicted_people` | INTEGER | 85 | ML-predicted total people needed |
| `status` | TEXT | "on_track" | `on_track` / `at_risk` / `behind` |
| `tasks_active` | TEXT | "Hang motors, Cable management" | Comma-separated active tasks |
| `generated_at` | TIMESTAMPTZ | auto | When forecast was generated |

Note: this replaces the original `zone` + `shift_slot` + `predicted_count` schema. Migration needed.

---

## PM Dashboard visualization

### Daily Workforce Forecast Chart

- **Type:** Bar chart (one bar per day, days 1–9)
- **Y-axis:** People needed
- **Color:** Green = on track, yellow = at risk (within 10% of capacity), red = behind schedule
- **Overlay:** Horizontal line showing available volunteer pool
- **Hover/detail:** List of active tasks for that day

### Task Timeline (stretch goal)

- Gantt-style view showing task dependencies
- Predicted duration bars with critical path highlighted
- Tasks that shifted due to delays shown in red

---

## File structure

```
ml/
├── forecast.py              # Main script: ML + scheduling + write to Supabase
├── requirements.txt         # Already exists
├── sample_data/
│   └── (empty — using docs/ml_info CSV directly)
└── .env                     # SUPABASE_URL, SUPABASE_KEY (gitignored)
```

`forecast.py` is a single script (keeps it simple, student-level). No module splitting.

---

## Implementation order

0. **DB migration:** The current `forecasts` table has `zone` + `shift_slot` + `predicted_count`. The new plan needs `day` + `predicted_people` + `status` + `tasks_active`. Migration must run before any ML code writes to Supabase.
1. **Data wrangling:** Load CSV, reshape to long format, filter milestones
2. **ML model:** Train LinearRegression, evaluate, print results
3. **Dependency graph:** Parse roadblocking column, build DAG
4. **Forward pass:** Compute schedule with predicted durations
5. **Daily aggregation:** Sum people per day, determine status
6. **Supabase write:** Upsert forecast rows
7. **Dashboard chart:** Next.js reads forecasts table, renders bar chart
8. **Comments:** German comment pass (commenter agent)

---

## Risks

| Risk | Mitigation |
|---|---|
| R² is low (too few data points) | Expected and honest — document in comments. The value is in the scheduling, not the model accuracy. |
| Dependency parsing edge cases | CSV structure is consistent — " + " separator works for all rows |
| forecasts table schema change | Need migration to replace zone/shift_slot columns with day/predicted_people |
| Grader questions "why LinearRegression for durations?" | Comment block explains: course-taught model, data is continuous, relationship is approximately linear |
