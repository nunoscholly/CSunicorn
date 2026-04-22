# Course Constraints — Python / ML Code Only

> **Scope:** These constraints apply to all Python code in the project (ML service, data scripts, seed scripts).
> They do NOT apply to the Next.js frontend (TypeScript).
>
> Source: "Grundlagen und Methoden der Informatik" / HSG, Prof. Aier / Dr. Bermeitinger / Prof. Mayer, 11 weeks.
> The user does not write code — Claude does. The code must look like a student with one semester of Python wrote it.

**Default rule:** If a concept/library isn't explicitly listed as allowed below, it is forbidden.

---

## Allowed Libraries

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import requests
from supabase import create_client

from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import (
    ConfusionMatrixDisplay, classification_report,
    accuracy_score, precision_score, recall_score, f1_score
)
from functools import reduce
```

Use exactly these import aliases. No other libraries.

---

## Allowed Python Concepts (by course week)

### W2 — Basics
- Variables, primitive types (`int`, `float`, `str`, `bool`)
- Arithmetic, comparison, logical operators
- `input()`, `print()`, type conversion (`int()`, `float()`, `str()`)
- `if/elif/else`, `while`, `for ... in range()`, `for ... in <sequence>`
- Functions: `def name(params): return value`

### W3 — Control Flow & Sequences
- Default parameters, keyword arguments, `*args`
- Lists (mutable): all methods (`.append()`, `.sort()`, `.pop()`, etc.), slicing
- Tuples (immutable)
- `len()`, `sum()`, `min()`, `max()`, `sorted()`

### W4 — Functional, Dicts, Sets
- Recursion, lambda, list comprehensions, generator expressions
- `filter()`, `map()`, `reduce()` (via `functools`)
- Dictionaries: `.keys()`, `.values()`, `.items()`, `.get()`, `.pop()`, `.update()`
- Sets: `.add()`, `.remove()`, `.union()`, `.intersection()`, `.difference()`

### W5 — OOP
- `class`, `__init__`, `self`, instance attributes, methods
- Single inheritance, `super().__init__()`, polymorphism

### W6 — APIs
- `requests.get(url)`, `.status_code`, `.json()`, `.text`

### W7 — Databases
- SQL concepts (tables, keys, normalization, JOINs)
- Supabase via `supabase-py`: `.table().select()`, `.insert()`, `.update()`, `.delete()`, `.eq()`, `.gt()`, `.lt()`
- Supabase Auth: `.auth.sign_up()`, `.auth.sign_in_with_password()`

### W8 — NumPy & Pandas
- `np.array()`, vectorized ops, `.mean()`, `.sum()`, `.std()`, `.shape`, `.reshape()`
- `pd.read_csv()`, `pd.DataFrame()`, column selection, row filtering
- `.head()`, `.describe()`, `.groupby()`, `.sort_values()`, `.dropna()`, `.fillna()`, `.iloc[]`, `.loc[]`

### W9 — Visualization
- `plt.plot()`, `plt.scatter()`, `plt.bar()`, `plt.hist()`
- `plt.xlabel()`, `plt.ylabel()`, `plt.title()`, `plt.legend()`, `plt.show()`

### W10–W11 — Machine Learning
- `train_test_split(test_size=0.30, random_state=42)`
- KNN, Decision Tree, Linear Regression (fit/predict)
- `MinMaxScaler` (fit_transform / transform)
- Confusion matrix, classification report, accuracy/precision/recall/F1
- Underfitting vs. overfitting (conceptual)

---

## Forbidden — Do Not Use

### Python Features
- Type hints / annotations
- Walrus operator (`:=`)
- Match/case statements
- Decorators (`@staticmethod`, `@property`, custom)
- `with` statement (except `with open()` for files)
- `yield` generators
- Dataclasses, enums
- `async/await`, threading, multiprocessing
- Dunder methods except `__init__`
- `try/except` (only if unavoidable, e.g., network errors)
- Multiple inheritance, mixins
- Nested comprehensions, dict/set comprehensions
- `collections` module (Counter, defaultdict, etc.)
- `itertools` (except `functools.reduce`)
- `pathlib` — use strings for paths
- `*`-unpacking beyond `*args`

### Libraries
- Deep learning: TensorFlow, PyTorch, Keras, JAX
- Alternative data: polars, dask, modin
- Alternative plotting: seaborn, plotly, bokeh, altair
- Alternative ML: xgboost, lightgbm, statsmodels, scipy.stats
- Web frameworks: Flask, FastAPI, Django (Python side — Next.js handles the web)
- ORMs: SQLAlchemy, Django ORM, peewee
- HTTP clients: httpx, aiohttp (use `requests` only)
- Test frameworks: pytest, unittest (unless explicitly asked)

### ML/Data Science
- Neural networks, deep learning
- Ensemble methods (RandomForest, GradientBoosting)
- Hyperparameter tuning (GridSearchCV, RandomizedSearchCV)
- Pipelines (`sklearn.pipeline`)
- PolynomialFeatures, PCA, t-SNE, UMAP
- Advanced cross-validation beyond basic train/test split

---

## Coding Conventions (Python only)

- **Variables/functions:** `snake_case`
- **Classes:** `PascalCase`
- **Constants:** `UPPER_SNAKE_CASE`
- **Indentation:** 4 spaces, no tabs
- **Strings:** double quotes `"..."`
- **Line length:** ~100 chars soft limit
- **Imports:** top of file, stdlib → third-party → local
- **Comments:** in German, on every non-trivial block (grading requirement: "well documented by comments")
- **Docstrings:** one-sentence German docstring for every function
- **File headers:** one-line German comment at top of every file explaining its purpose
- **Simplicity over cleverness:** a for-loop with `.append()` is fine
- **Always set** `random_state=42`
- **Parametrized queries** for any SQL (never string concatenation)
- **Credentials** via environment variables, never hardcoded

---

## Code Examples

### ML Classification (W10–W11 pattern)

```python
# ML-Klassifikation: Früchte anhand von Merkmalen erkennen (Kursbeispiel W10-W11)

import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, ConfusionMatrixDisplay

# Trainingsdaten aus CSV laden
fruits = pd.read_csv("fruit_data_with_colors.csv")
X = fruits[["height", "width", "mass", "color_score"]]
y = fruits["fruit_label"]

# Daten aufteilen: 70% Training, 30% Test (fester Seed für Reproduzierbarkeit)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.30, random_state=42
)

# Features skalieren, damit alle Merkmale gleich gewichtet werden
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# KNN-Modell mit k=5 trainieren
clf = KNeighborsClassifier(n_neighbors=5)
clf.fit(X_train_scaled, y_train)

# Vorhersage auf Testdaten und Evaluation ausgeben
y_pred = clf.predict(X_test_scaled)
unique_names = sorted(y.unique().astype(str))
print(classification_report(y_true=y_test, y_pred=y_pred, target_names=unique_names))
```

### Supabase in Python

```python
# Supabase-Verbindung: Daten lesen und schreiben via REST-API

from supabase import create_client
import os

# Zugangsdaten aus Umgebungsvariablen laden (niemals hartcodieren)
SUPABASE_URL = os.environ["SUPABASE_URL"]
SUPABASE_KEY = os.environ["SUPABASE_KEY"]
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Alle Aufgaben in Zone "Stage A" abfragen
response = supabase.table("tasks").select("*").eq("zone", "Stage A").execute()
tasks = response.data

# Vorhersage in die Datenbank schreiben (upsert = einfügen oder aktualisieren)
supabase.table("forecasts").upsert({
    "zone": "Stage A",
    "shift_slot": "09:00",
    "predicted_count": 12,
}).execute()
```
