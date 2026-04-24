# ML Forecast — Review & Improvement Plan

> Critical review of `ml/forecast.py` by three independent agents (statistical rigor, scheduling correctness, course compliance). Findings consolidated and prioritised.

---

## CRITICAL — Must fix before submission

### 1. Data Leakage: Training on 2026 to predict 2026

The model trains on all three years (2024–2026), then "predicts" 2026 durations. The 2026 ground-truth values are already in the training set. The R² of 0.44 is artificially inflated and the predictions are not genuine out-of-sample forecasts.

**Fix:** Train exclusively on 2024+2025. Use 2026 only for prediction. Report R² on a held-out subset of 2024+2025 (e.g., hold out 2025 as validation). Compare predictions against 2026 actuals as a true out-of-sample evaluation.

### 2. Self-referencing cycle silently drops "End of event"

CSV row: `End of event,End of event,9,...` — the task lists itself in the Roadblocking column. This creates a cycle in the dependency graph. Kahn's topological sort silently drops tasks involved in cycles. "End of event" (136 people) vanishes from the schedule with no warning.

**Fix:** In `parse_dependencies`, filter out self-references: `if downstream != blocker`. Add cycle detection after topological sort: if `len(sorted_tasks) < len(all_tasks)`, print a warning listing dropped tasks.

### 3. Forbidden Python constructs (grading risk)

The following are **not in the allowed list** per `docs/course_constraints.md`:

| Construct | Location | Replacement |
|---|---|---|
| `from dotenv import load_dotenv` | line 12 | `os.environ.get()` directly, or add to beyond-scope with German comment block |
| `zip()` | line 125 | `for i in range(len(feature_cols))` |
| `.iterrows()` | lines 41, 146, 170 | `for i in range(len(df))` with `.iloc[i]` |
| `.clip()` | line 143 | `df_2026.loc[df_2026["predicted_duration"] < 0.5, "predicted_duration"] = 0.5` |
| `.copy()` | lines 79, 135 | Remove (accept in-place) or use `pd.DataFrame(df[...])` |
| `", ".join(...)` | lines 332, 395 | Build string with `+` in a for-loop |

**Each forbidden construct is a potential grading deduction.** `dotenv` specifically needs either removal or a beyond-scope German comment block AND an entry in `course_constraints.md`.

---

## MAJOR — Significantly impacts correctness or credibility

### 4. Schedule ignores original day assignments

The forward pass computes `earliest_start` purely from dependency chains, starting unconstrained tasks at hour 0. A task originally on day 5 gets scheduled at hour 0 (day 1) if it has no long predecessor chains. The entire schedule compresses into ~8 days, making **day 9 output 0 people** — despite the CSV having 7+ tasks on day 9.

**Fix:** Anchor each task's `earliest_start` to at minimum `(original_day - 1) * WORKDAY_HOURS`. This respects the original plan while still allowing downstream tasks to be pushed later by delays.

### 5. Showday tasks are not pinned

`docs/ml_plan.md` line 152: *"Tasks between 'Start of showday' and 'End of showday' are fixed — they cannot move."* The code has no mechanism for this. "Start of showday" is freely repositioned by the forward pass.

**Fix:** Hard-pin `earliest_start["Start of showday"] = 5 * WORKDAY_HOURS` and `earliest_start["End of Showday"] = 6 * WORKDAY_HOURS`. Propagate these as constraints before the forward pass.

### 6. Status logic always flags the peak day as "behind"

`determine_status` uses `ratio = people / max(daily_people)`. The day with the highest headcount always gets `ratio = 1.0 > 0.90`, so it's structurally guaranteed to be "behind" — even if the schedule is perfectly on track. This is semantically wrong.

**Fix:** Status should compare computed schedule end-times against fixed deadlines (showday must start by day 6; event must end by day 9). A day is "behind" if tasks have been pushed past their deadline, "at_risk" if they're within a threshold.

### 7. Model learns phase averages, not task-specific patterns

With features `[people_count, day, is_setup, is_show, is_teardown]`, the phase flags are deterministic functions of `day` — they're perfectly collinear. The model cannot distinguish tasks on the same day with similar crew sizes. All setup tasks cluster at ~4h, all showday tasks at ~16h. It's learning `mean(duration | phase)` with a minor crew-size adjustment, not genuine task-specific patterns.

**Fix:** Accept and document this honestly as a limitation. Add a comment explaining that with only 5 features and ~80 training samples, the model captures macro-patterns (phase + crew size effect) rather than per-task predictions. This is actually a reasonable thing to explain to a grader — honesty about model limitations scores better than pretending the model is more powerful than it is.

### 8. Baseline R² calculation is wrong

`ss_tot` uses `y_test.mean()` but `ss_res_baseline` uses `y_train.mean()`. These different reference points make the baseline R² mathematically incorrect. The baseline shows R² = -0.007, which is misleadingly close to zero.

**Fix:** Either use `y_test.mean()` consistently for both terms, or simply note that R² = 0 **is** the mean-baseline by definition (that's literally what R² measures). The manual baseline calculation can be removed entirely — just print: "R² = 0 entspricht dem Mittelwert als Vorhersage."

### 9. Advanced code patterns look too sophisticated for a first-semester student

| Pattern | Issue |
|---|---|
| `os.path.join(os.path.dirname(__file__), ...)` | `os.path` manipulation not taught |
| `{coef:+.4f}`, `{name:20s}`, `{day:4d}` | Advanced format specs (alignment, forced sign) |
| `max(earliest_end[p] for p in preds)` | Generator inside `max()` |
| `str(row["Roadblocking"])` to handle NaN | Should use `pd.isna()` |

**Fix:** Simplify each to basic constructs. Use relative path strings, plain f-strings, explicit for-loops tracking max values.

---

## MINOR — Polish, edge cases, best practices

### 10. Milestone filter threshold too aggressive

Filter is `duration_hours >= 0.5`, but "Get containers Delivered" has 2026 duration = 0.2h — a real task that gets incorrectly filtered out. The ML plan says "filter milestones (duration = 0)."

**Fix:** Use `duration_hours > 0` or explicitly name milestones (tasks with "Start of" / "End of" in the name).

### 11. No error handling on Supabase network calls

`.delete().execute()` and `.insert(rows).execute()` have no error handling. The course constraints allow `try/except` for "unavoidable" cases like network errors. A Supabase call is exactly that case.

**Fix:** Wrap Supabase calls in `try/except` with a German error message.

### 12. 16h showday tasks on 12h workday grid

Tasks like "Driving" (16h) and "Service points" (16h) exceed the 12h workday. A 16h task starting at the beginning of day 7 spans into day 8, double-counting showday volunteers as teardown staff.

**Fix:** Either use longer workdays for showday, or split the overlap accounting so showday staff aren't counted as teardown staff.

### 13. Missing MAE/RMSE reporting

R² alone doesn't tell you "predictions are off by X hours on average." MAE is directly actionable for scheduling. `mean_absolute_error` is not in the allowed imports, but `np.mean(np.abs(y_test - y_pred))` uses only allowed numpy.

**Fix:** Add manual MAE calculation and print it alongside R².

### 14. `random_state=42` comment should reference course constraint

The comment says "fester Seed für Reproduzierbarkeit" but should explicitly note this is a course requirement, not just good practice.

### 15. Supabase delete lacks role/team filter

Per CLAUDE.md: "every Supabase table query filters by role/team explicitly." The delete call uses `.gte("day", 1)` with no role filter. The insert has no filter either. For `forecasts` this is arguably fine (ML service uses service_role key), but should be documented.

---

## Summary

| Severity | Count | Key theme |
|---|---|---|
| CRITICAL | 3 | Data leakage, silent graph bug, forbidden constructs |
| MAJOR | 6 | Schedule ignores days, showday not pinned, status logic broken, model limitations undocumented |
| MINOR | 6 | Filter threshold, error handling, workday mismatch, missing metrics |

**Priority order for fixes:**
1. Fix data leakage (train on 2024+2025 only) — undermines all ML claims
2. Fix self-reference cycle + add cycle detection — "End of event" is silently lost
3. Replace all forbidden constructs — direct grading risk
4. Anchor schedule to original days + pin showday — Part B output is currently unreliable
5. Fix status logic — always-behind is visually misleading
6. Fix baseline calculation or remove it
7. Everything else
