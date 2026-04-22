# Claude Code — Kursrichtlinien

## Kontext

Dieses Dokument ist die **verbindliche Referenz** für Claude Code, wenn du Code für Projekte im Rahmen des Kurses **"Grundlagen und Methoden der Informatik" / "Fundamentals and Methods of Computer Science for Business Studies"** (HSG, Prof. Aier / Dr. Bermeitinger / Prof. Mayer, 11 Wochen) schreibst.

Ich (der Nutzer) schreibe keinen Code selbst — du übernimmst das. Damit der Code aussieht, als hätte ich ihn geschrieben, **verwende ausschliesslich die Konzepte, Bibliotheken und Muster, die unten aufgeführt sind**. Alles andere ist tabu, auch wenn es eine "bessere" oder "modernere" Lösung gäbe.

**Grundregel: Im Zweifel lieber einfacher schreiben als eleganter.** Der Code soll für jemanden mit einem Semester Python-Einführung plausibel sein.

Die Kursmaterialien bestehen aus PowerPoint-Folien. Konkrete Code-Beispiele werden in Jupyter Notebooks (`UnitXX.sectionY.ipynb`) gezeigt, die hier nicht vorliegen — die unten aufgelisteten Konzepte sind jedoch in den Folien explizit als Kurs-Lerninhalte benannt.

---

## Erlaubte Programmiersprache(n)

- **Python 3** (über Anaconda-Distribution, ausgeführt in Jupyter Notebooks oder als `.py`-Dateien aus dem Terminal).
- **SQL** (ab Woche 7, ausschliesslich eingebettet in Python über `sqlite3`; siehe Chinook-Datenbank-Muster).
- **HTML** nur passiv (als Output von HTTP-Requests, nicht selbst geschrieben).

Keine andere Sprache verwenden. Kein TypeScript/JavaScript, kein R, kein Go, kein Rust.

---

## Gelernte Konzepte (Claude Code darf NUR diese verwenden)

### Woche 1 — Computing Basics
- Binäre/hexadezimale Zahlendarstellung (konzeptionell, nicht implementieren)
- ANSI/UTF-Encodings (konzeptionell)
- **Keine Programmierung in dieser Woche** — nur theoretische Grundlage.

### Woche 2 — Python-Grundlagen
- Variablen und Zuweisung (`=`)
- Primitive Datentypen: `int`, `float`, `str`, `bool`
- Arithmetische Operatoren: `+`, `-`, `*`, `/`, `//`, `%`, `**`
- Vergleichsoperatoren: `==`, `!=`, `<`, `<=`, `>`, `>=`
- Logische Operatoren: `and`, `or`, `not`
- Ein-/Ausgabe: `input()`, `print()`
- Typumwandlung: `int()`, `float()`, `str()`, `bool()`
- Kontrollstrukturen: `if`, `if/else`, `if/elif/else`
- Schleifen: `while`, `for ... in range(...)`, `for ... in <sequence>`
- Funktionen: `def name(params): return value`
- Kommentare: `#` (einzeilig)

### Woche 3 — Kontrollfluss & Sequenzen vertieft
- Algorithmen & Pseudocode vor dem Codieren
- Erweiterte Funktionen:
  - Default-Parameter: `def f(x, y=10):`
  - Keyword-Arguments beim Aufruf: `f(x=1, y=2)`
  - Beliebige Argumentlisten: `*args`
- **Lists** (mutable, homogen): `[1, 2, 3]`
  - Methoden: `.append()`, `.extend()`, `.insert()`, `.remove()`, `.pop()`, `.sort()`, `.reverse()`, `.index()`, `.count()`
  - Funktionen auf Listen: `len()`, `sum()`, `min()`, `max()`, `sorted()`
  - Slicing: `lst[start:stop:step]`
- **Tuples** (immutable, heterogen): `(1, "a", 3.0)`
- Iteration: `for item in sequence:`
- Index-Iteration: `for i in range(len(sequence)):`

### Woche 4 — Rekursion, funktionale Elemente, Dicts, Sets, Streamlit
- Rekursive Funktionen (klassisches Beispiel: Fakultät, Fibonacci)
- **Lambda-Funktionen**: `lambda x: x * 2`
- **List Comprehensions**: `[x * 2 for x in lst if x > 0]`
- **Generator Expressions**: `(x * 2 for x in lst)`
- `filter()`, `map()`, `reduce()` (Letzteres via `from functools import reduce`)
- **Dictionaries**: `{"key": "value"}`
  - Methoden: `.keys()`, `.values()`, `.items()`, `.get()`, `.pop()`, `.update()`
  - Iteration: `for key, value in d.items():`
- **Sets**: `{1, 2, 3}`
  - Methoden: `.add()`, `.remove()`, `.union()`, `.intersection()`, `.difference()`
- **Streamlit** für Web-Apps (Basisverwendung):
  - `import streamlit as st`
  - `st.title()`, `st.header()`, `st.write()`, `st.text()`
  - `st.button()`, `st.selectbox()`, `st.slider()`, `st.text_input()`, `st.file_uploader()`
  - `st.dataframe()`, `st.table()`, `st.line_chart()`, `st.bar_chart()`
  - Ausführung: `streamlit run app.py`

### Woche 5 — Objektorientierte Programmierung (OOP)
- **Klasse & Objekt**: `class Name:` / `obj = Name(...)`
- **Konstruktor**: `def __init__(self, ...):`
- **Instanzattribute**: `self.attribute = value`
- **Methoden**: `def method(self, ...):`
- **Vererbung**: `class SubClass(SuperClass):` und `super().__init__(...)`
- **Polymorphie**: Methoden-Überschreibung in Unterklassen
- **Encapsulation**: Attribute nicht direkt manipulieren, sondern über Methoden

### Woche 6 — Netzwerke & APIs
- HTTP-Konzepte: Request/Response, GET, URIs, DNS, TCP/IP (konzeptionell)
- **Web APIs konsumieren** — erlaubte Bibliothek: `requests`
  - `requests.get(url)`, `.status_code`, `.json()`, `.text`
- Keine eigene Netzwerkprogrammierung (keine Sockets, keine Server-Implementierung) ausser via `streamlit`.

### Woche 7 — Relationale Datenbanken & SQL
- Relationales Modell: Tabellen, Zeilen (tuples), Spalten (attributes), Primary Key, Foreign Key
- Normalisierung (1NF, 2NF, 3NF) — beim Datenbankentwurf beachten
- **SQLite über Python-Standardbibliothek**:
  - `import sqlite3`
  - `conn = sqlite3.connect("db.sqlite")`
  - `cursor = conn.cursor()`
  - `cursor.execute("SELECT ...")`
  - `cursor.fetchall()`, `cursor.fetchone()`
  - `conn.commit()`, `conn.close()`
- **SQL-Befehle (basic)**: `SELECT`, `FROM`, `WHERE`, `ORDER BY`, `GROUP BY`, `HAVING`, `JOIN` (INNER/LEFT), `INSERT INTO`, `UPDATE`, `DELETE FROM`, `CREATE TABLE`
- Referenzdatenbank: **Chinook** (in Kurs-Demo verwendet).

### Woche 8 — Data Science Intro (NumPy & Pandas)
- **NumPy**:
  - `import numpy as np`
  - `np.array([...])`, `np.zeros()`, `np.ones()`, `np.arange()`, `np.linspace()`
  - Basisoperationen auf Arrays (vektorisiert): `+`, `-`, `*`, `/`, `.mean()`, `.sum()`, `.std()`, `.min()`, `.max()`
  - Shape/Reshape: `.shape`, `.reshape()`
- **Pandas**:
  - `import pandas as pd`
  - `pd.read_csv("file.csv")`, `pd.DataFrame({...})`
  - Spaltenauswahl: `df["col"]`, `df[["col1", "col2"]]`
  - Zeilenfilterung: `df[df["col"] > 5]`
  - `.head()`, `.tail()`, `.describe()`, `.info()`, `.shape`
  - `.groupby()`, `.sort_values()`, `.drop()`, `.dropna()`, `.fillna()`
  - `.iloc[]`, `.loc[]`

### Woche 9 — Data Wrangling & Visualization
- Datenbereinigung mit Pandas (missing values, duplicates, outliers)
- Visualisierung mit **matplotlib**:
  - `import matplotlib.pyplot as plt`
  - `plt.plot()`, `plt.scatter()`, `plt.bar()`, `plt.hist()`
  - `plt.xlabel()`, `plt.ylabel()`, `plt.title()`, `plt.legend()`, `plt.show()`
- Optional über Pandas: `df.plot()`, `df.plot.scatter()`, `df.plot.hist()`

### Woche 10 — Machine Learning 1 (scikit-learn)
- **Ausschliesslich `scikit-learn`** als ML-Bibliothek. Das Modul heisst `sklearn`.
- Train/Test-Split: `from sklearn.model_selection import train_test_split`
  - `X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.30, random_state=42)`
- **Klassifikator**: **K-Nearest Neighbors (KNN)**
  - `from sklearn.neighbors import KNeighborsClassifier`
  - `clf = KNeighborsClassifier(n_neighbors=k)`
  - `clf.fit(X_train, y_train)`
  - `clf.predict(X_user)`
- **Decision Tree** (im Import-Beispiel erwähnt):
  - `from sklearn.tree import DecisionTreeClassifier`
- **Lineare Regression** (konzeptionell):
  - `from sklearn.linear_model import LinearRegression`
- **Datenskalierung**:
  - `from sklearn.preprocessing import MinMaxScaler`
- **K-Fold Cross-Validation** (konzeptionell; ab W11)

### Woche 11 — Machine Learning 2 (Evaluation)
- **Metriken**: Accuracy, Precision, Recall, F1-Score (per-class, sowie macro/micro/weighted)
- Confusion Matrix: `from sklearn.metrics import ConfusionMatrixDisplay`
  - `ConfusionMatrixDisplay.from_predictions(y_true=y_test, y_pred=y_pred, display_labels=unique_names)`
- Classification Report: `from sklearn.metrics import classification_report`
  - `print(classification_report(y_true=y_test, y_pred=y_pred, target_names=unique_names))`
- Einzelne Metrik-Funktionen: `accuracy_score`, `precision_score`, `recall_score`, `f1_score` (alle aus `sklearn.metrics`)
- Underfitting vs. Overfitting (konzeptionell berücksichtigen)

---

## Erlaubte Syntax & Muster

### Imports
Jedes `import`-Statement gehört an den Dateianfang. Verwende genau diese Aliase:

```python
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import streamlit as st
import sqlite3
import requests

from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.tree import DecisionTreeClassifier
from sklearn.linear_model import LinearRegression
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import ConfusionMatrixDisplay, classification_report, accuracy_score, precision_score, recall_score, f1_score
from functools import reduce
```

Importiere niemals Bibliotheken, die in der Konzept-Liste oben nicht vorkommen.

### Daten laden & splitten (aus W10, Folie 59)

```python
import pandas as pd
from sklearn.model_selection import train_test_split

fruits = pd.read_csv("fruit_data_with_colors.csv")
X = fruits[["height", "width", "mass", "color_score"]]
y = fruits["fruit_label"]

X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.30, random_state=42)
```

### Klassifikator-Workflow (aus W10/W11)

```python
clf = KNeighborsClassifier(n_neighbors=5)
clf.fit(X_train, y_train)
y_pred = clf.predict(X_test)
```

### Modell-Evaluation (aus W11, Folie 18 & 20)

```python
from sklearn.metrics import ConfusionMatrixDisplay, classification_report

ConfusionMatrixDisplay.from_predictions(
    y_true=y_test,
    y_pred=y_pred,
    display_labels=unique_names,
)

print(classification_report(y_true=y_test, y_pred=y_pred, target_names=unique_names))
```

### OOP (aus W5, Account-Klassenbeispiel)

```python
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        self.balance += amount

    def withdraw(self, amount):
        if amount <= self.balance:
            self.balance -= amount


my_account = Account("Johnny", 8000)
my_account.deposit(15)
my_account.withdraw(65)
```

### Streamlit-Grundmuster (W4/W7)

```python
import streamlit as st

st.title("Meine App")
name = st.text_input("Dein Name:")
if st.button("Sag Hallo"):
    st.write(f"Hallo, {name}!")
```

### SQL in Python (W7)

```python
import sqlite3

conn = sqlite3.connect("chinook.db")
cursor = conn.cursor()
cursor.execute("SELECT Name FROM Artist WHERE ArtistId = ?", (1,))
rows = cursor.fetchall()
for row in rows:
    print(row)
conn.close()
```

Verwende **immer parametrisierte Queries** (Fragezeichen-Platzhalter), niemals String-Konkatenation in SQL.

### Web API (W6)

```python
import requests

response = requests.get("https://example.com/api/data")
if response.status_code == 200:
    data = response.json()
    print(data)
```

---

## Verbotene Konzepte (noch nicht gelernt)

Verwende **keines** der folgenden Konstrukte, Muster oder Bibliotheken — unabhängig davon, wie elegant oder idiomatisch sie wären. Falls eine Aufgabe sie zu erfordern scheint, löse sie mit den oben erlaubten Mitteln oder frage nach.

### Python-Sprachfeatures — verboten
- **Type Hints / Annotationen** (`def f(x: int) -> str:`, `list[int]`, `Optional`, `Union`, `typing`-Modul)
- **f-strings sind ERLAUBT** (`f"Hallo {name}"`), aber kein komplexes Format-Mini-Sprache-Zeug wie `f"{x:>10.2f}"`
- **Walrus-Operator** (`:=`)
- **Match-Statement** (`match/case` — Python 3.10+)
- **Decorators** (`@staticmethod`, `@classmethod`, `@property`, eigene Decorators)
- **Context Manager / `with`-Statement** — **Ausnahme**: `with open(...)` für Dateien ist erlaubt, wenn es tatsächlich vorkommt, ansonsten `open()` + explizites `close()`
- **Generators mit `yield`** (Generator Expressions dagegen sind erlaubt)
- **Dataclasses** (`@dataclass`)
- **Enums** (`from enum import Enum`)
- **async / await, asyncio**
- **Threading, multiprocessing, concurrent.futures**
- **Metaclasses, `__slots__`, ABCs (`abc.ABC`)**
- **Double-underscore/Dunder-Methoden** ausser `__init__`. Keine `__str__`, `__repr__`, `__eq__`, `__len__` usw., ausser der User verlangt es explizit.
- **Privatmarkierungen** mit `_name` oder `__name` — stattdessen durch Encapsulation-Methoden kommunizieren
- **Exception Handling mit `try/except`** — **nur wenn der User es explizit verlangt oder die Aufgabe ohne es nicht lösbar ist**. Ansonsten: einfach geradeaus programmieren.
- **Multiple Inheritance**, **Mixins**
- **Komplexe Comprehensions** (mehrfach verschachtelte List Comprehensions, Dict/Set Comprehensions mit mehreren Quellen) — im Zweifel klassische `for`-Schleife
- **`collections`-Modul** (`Counter`, `defaultdict`, `namedtuple`, `OrderedDict`, `deque`)
- **`itertools`, `functools`** — **Ausnahme**: `functools.reduce` ist in W4 explizit erlaubt.
- **Pathlib** (`from pathlib import Path`) — stattdessen Strings für Pfade
- **Walrus in Comprehensions, Ternary-Ausdrücke in Comprehensions**
- **`*`-Unpacking jenseits von `*args`** (kein `[*a, *b]`, kein `{**d1, **d2}`)

### Bibliotheken — verboten
- **Alle Deep-Learning-Bibliotheken**: TensorFlow, PyTorch, Keras, JAX
- **Alternative Data-Science-Bibliotheken**: polars, dask, modin, xarray
- **Alternative Plotting-Bibliotheken**: seaborn, plotly, bokeh, altair (nur `matplotlib.pyplot` ist erlaubt, Pandas-Plots bauen darauf auf)
- **Alternative ML-Bibliotheken**: xgboost, lightgbm, catboost, statsmodels, scipy.stats
- **Web-Frameworks ausser Streamlit**: Flask, FastAPI, Django, bottle
- **ORMs**: SQLAlchemy, Django ORM, peewee, tortoise — nur roher `sqlite3`
- **HTTP-Clients ausser `requests`**: httpx, aiohttp, urllib (ausser urllib ist explizit gewünscht)
- **Test-Frameworks**: pytest, unittest — schreibe keine Tests, ausser der User verlangt es explizit
- **Linter/Formatter-Konfiguration**: kein `.pylintrc`, kein `pyproject.toml` mit Black/Ruff-Konfig
- **Environment-Management**: keine `requirements.txt`-Erweiterungen mit Version-Pins, keine `poetry`/`pipenv`-Dateien, kein `setup.py`
- **`os`, `sys`, `subprocess`** — nur falls zwingend nötig (z. B. `os.path.join` bei Dateipfaden); keine Subprocess-Aufrufe
- **`json`-Modul** nur für Datei-I/O mit JSON; lieber `response.json()` aus `requests` nutzen
- **`datetime`, `time`** nur für triviale Zeitstempel, keine Timezone-Arithmetik

### ML/Data-Science — verboten
- **Neural Networks / Deep Learning** jeder Art
- **Ensemble-Methoden** (Random Forest, Gradient Boosting), ausser der Kurs zeigt sie später explizit
- **Hyperparameter-Tuning mit `GridSearchCV` / `RandomizedSearchCV`**
- **Pipelines** (`sklearn.pipeline.Pipeline`)
- **Feature-Engineering-Tools** (`PolynomialFeatures`, One-Hot-Encoding jenseits manueller Dict-Konversionen)
- **Dimensionalitätsreduktion** (PCA, t-SNE, UMAP)
- **Cross-Validation** jenseits dessen, was in W10/W11 explizit eingeführt wird

### Datenbanken — verboten
- Andere DBMS als SQLite: PostgreSQL, MySQL, MongoDB, Redis
- Stored Procedures, Triggers, Views (ausser der User verlangt es explizit)
- Transaktions-Isolation-Level-Konfiguration

### Web — verboten
- Authentifizierung, Sessions, Cookies (ausser der User verlangt es explizit)
- Eigene HTTP-Server (kein Flask, kein FastAPI)
- WebSockets

---

## Codierungskonventionen aus dem Kurs

### Namensgebung
- **Variablen und Funktionen**: `snake_case` — z. B. `my_variable`, `compute_average()`
- **Klassen**: `PascalCase` — z. B. `Account`, `CombustionEngineCar`
- **Konstanten**: `UPPER_SNAKE_CASE`, sparsam verwenden
- **Sprechende Namen bevorzugen**: `fruit_label` statt `fl`, `balance` statt `b`
- Im ML-Kontext folge den etablierten Konventionen: `X`, `y`, `X_train`, `X_test`, `y_train`, `y_test`, `y_pred`, `clf`

### Struktur
- **Einrückung**: genau **4 Leerzeichen**, keine Tabs
- **Zeilenlänge**: weich bis ~100 Zeichen
- **Leerzeilen**: eine Leerzeile zwischen Funktionen, zwei zwischen Klassen
- **Imports**: ganz am Anfang der Datei, zuerst Standardbibliothek, dann Drittanbieter, dann eigene Module (einfache Reihenfolge ohne isort-Komplexität)

### Kommentare & Dokumentation
- **Deutsche oder englische Kommentare** — orientiere dich am Rest des Codes/Kontexts. Wenn keiner vorhanden ist, wähle Englisch.
- Kommentare erklären das **Warum**, nicht das Was.
- **Kurze Docstrings** (ein Satz) für Funktionen sind willkommen, aber **keine Sphinx/NumPy/Google-Style-Docstrings** mit Parameter-Blöcken.
- Für das Gruppenprojekt: Quellcode soll **"well documented by comments"** sein (Zitat aus der Projektanforderung). Also: Jeder nicht-triviale Block bekommt eine kurze Erklärung.

### Stil
- **Einfachheit vor Cleverness**: eine `for`-Schleife mit `.append()` ist okay, auch wenn eine List Comprehension kürzer wäre.
- **Keine vorzeitige Optimierung**: keine Caches, kein Memoization ausserhalb konzeptueller Rekursion.
- **Keine abstrakten Schichten einbauen**: wenn die Aufgabe ein Skript verlangt, schreibe ein Skript — keine Factory Patterns, keine Dependency Injection.
- **Feste Zufallssamen** (`random_state=42`) immer setzen, wenn Zufall im Spiel ist — analog zum Kursbeispiel.
- **Vergleiche mit `None`** explizit mit `is None` / `is not None`, nicht mit `==`.
- **Strings**: bevorzugt doppelte Anführungszeichen `"..."` — so auch in den Kursbeispielen (`"fruit_data_with_colors.csv"`, `"height"`, `"width"`).

### Dateistruktur
- Ein `.py`-Skript pro Aufgabe, ausgeführt per `python datei.py` oder `streamlit run datei.py`.
- Für Klassen-/Wiederverwendung: bei Bedarf ein zweites `.py`-Modul im gleichen Ordner — nicht übertreiben.
- Keine Paket-Strukturen mit `__init__.py`, keine `src/`-Layout-Konventionen.

---

## Beispiele aus dem Kurs

### Beispiel 1: End-to-End ML-Klassifikation (zusammengesetzt aus W10–W11)

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.neighbors import KNeighborsClassifier
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import classification_report, ConfusionMatrixDisplay

# Daten laden
fruits = pd.read_csv("fruit_data_with_colors.csv")
X = fruits[["height", "width", "mass", "color_score"]]
y = fruits["fruit_label"]

# Split
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.30, random_state=42
)

# Skalierung
scaler = MinMaxScaler()
X_train_scaled = scaler.fit_transform(X_train)
X_test_scaled = scaler.transform(X_test)

# Training
clf = KNeighborsClassifier(n_neighbors=5)
clf.fit(X_train_scaled, y_train)

# Vorhersage & Evaluation
y_pred = clf.predict(X_test_scaled)
unique_names = sorted(y.unique().astype(str))

print(classification_report(y_true=y_test, y_pred=y_pred, target_names=unique_names))
ConfusionMatrixDisplay.from_predictions(
    y_true=y_test,
    y_pred=y_pred,
    display_labels=unique_names,
)
```

### Beispiel 2: OOP mit Encapsulation (W5, aus Account-Beispiel der Distributed-Systems-Präsentation)

```python
class Account:
    def __init__(self, owner, balance):
        self.owner = owner
        self.balance = balance

    def deposit(self, amount):
        # Eingehende Überweisung
        self.balance += amount

    def withdraw(self, amount):
        # Abhebung nur wenn genug Guthaben
        if amount <= self.balance:
            self.balance -= amount
        else:
            print("Nicht genug Guthaben")


my_bank_account = Account("Johnny", 8000)
my_bank_account.deposit(15)
my_bank_account.withdraw(65)
print(my_bank_account.balance)
```

### Beispiel 3: Streamlit-App mit CSV-Upload und Chart (W4 / Projektanforderung)

```python
import streamlit as st
import pandas as pd

st.title("Daten-Explorer")

uploaded = st.file_uploader("CSV-Datei hochladen", type="csv")

if uploaded is not None:
    df = pd.read_csv(uploaded)
    st.write("Erste Zeilen:")
    st.dataframe(df.head())

    columns = df.columns.tolist()
    chosen = st.selectbox("Spalte für Visualisierung:", columns)

    if st.button("Diagramm anzeigen"):
        st.line_chart(df[chosen])
```

---

## Abschliessende Entscheidungsregel

Wenn du unsicher bist, ob ein Konzept/eine Bibliothek erlaubt ist:

1. Steht es **explizit in der Liste der erlaubten Konzepte**? → erlaubt.
2. Steht es **explizit in der Verbotsliste**? → verboten.
3. Weder noch? → **verboten** (konservative Default-Regel). Kommentiere das kurz im Chat, bevor du eine alternative Lösung schreibst.

**Sonderfall Projektidee:** Der Nutzer baut eine App, die Sportdaten orchestriert. Sport-APIs werden also konsumiert (W6-Muster mit `requests`), Daten in SQLite gespeichert (W7), mit Pandas analysiert (W8/W9), ggf. per scikit-learn vorhergesagt (W10/W11), und über Streamlit präsentiert (W4). Das deckt den kompletten Kursbogen ab — halte dich konsequent an dieses Set.



Rücken an der Wand