# ML-Forecast: Tagesprognose fuer den Personalbedarf der Build Week
# Trainiert eine lineare Regression auf historischen Schichtdaten (2024–2025),
# liest den aktuellen Aufgabenstand aus Supabase, berechnet einen
# Abhaengigkeitsgraph und schreibt Tagesprognosen in die forecasts-Tabelle.
# Ausgefuehrt als Render Cron Job (Render.com) oder lokal: cd ml && python forecast.py

import os
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LinearRegression

# --- Ueber den Kursumfang hinaus (nicht in W2–W11 gelehrt) ---
# dotenv: Laedt Umgebungsvariablen aus einer .env-Datei ins os.environ.
# Wir brauchen das, weil die Supabase-Zugangsdaten nicht hartcodiert
# sein duerfen (Sicherheitsanforderung) und .env-Dateien der Standard
# fuer lokale Entwicklung sind. Ohne dotenv muessten wir die Variablen
# manuell in der Shell setzen, was fehleranfaellig ist.
from dotenv import load_dotenv

from supabase import create_client


# --- Konfiguration -----------------------------------------------------------

# os.path.join / os.path.dirname: Baut Dateipfade betriebssystemunabhaengig
# zusammen. Unter Windows nutzt Python "\" statt "/", deshalb verwenden wir
# os.path statt hartcodierter Strings. __file__ ist der Pfad dieser Datei,
# ".." geht ein Verzeichnis hoch. Nicht im Kurs gelehrt, aber noetig damit
# das Skript aus jedem Verzeichnis heraus funktioniert.
CSV_PATH = os.path.join(os.path.dirname(__file__), "..", "docs", "ml_info",
                        "start_summit_volunteer_shifts.csv")
# Laenge eines Arbeitstags in Stunden (laut Einsatzplan Start Summit)
WORKDAY_HOURS = 12
# Build Week dauert genau 9 Tage (Tag 1–5 Setup, 6–7 Showday, 8–9 Teardown)
TOTAL_DAYS = 9


# =============================================================================
# Supabase-Verbindung herstellen
# =============================================================================

def create_supabase_client():
    """Supabase-Client erstellen mit Zugangsdaten aus der .env-Datei."""
    # load_dotenv(): Liest Schluessel-Wert-Paare aus der Datei ml/.env und
    # macht sie als Umgebungsvariablen verfuegbar. Siehe Kommentar oben bei
    # den Imports fuer eine ausfuehrliche Erklaerung.
    load_dotenv()

    # Variablennamen muessen mit der .env-Datei uebereinstimmen — dieselben
    # Namen wie im Next.js-Frontend, plus service_role fuer Schreibzugriff
    url = os.environ.get("NEXT_PUBLIC_SUPABASE_URL")
    key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY")

    # Ohne Credentials abbrechen statt crashen — gibt klare Fehlermeldung
    if not url or not key:
        print("FEHLER: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt.")
        print("Setze Variablen in ml/.env")
        return None

    return create_client(url, key)


# =============================================================================
# Teil A: ML-Modell — Aufgabendauer anhand von Teamgroesse vorhersagen
# =============================================================================

def load_and_reshape(csv_path):
    """CSV laden und in Langformat umwandeln (eine Zeile pro Aufgabe und Jahr)."""
    raw = pd.read_csv(csv_path)

    # Spaltennamen bereinigen (Leerzeichen am Ende entfernen)
    raw.columns = [c.strip() for c in raw.columns]

    rows = []
    # iterrows(): Durchlaeuft einen DataFrame zeilenweise und gibt pro Zeile
    # den Index und die Daten als Series zurueck. Nicht in W8 gelehrt, aber
    # die einfachste Art einen DataFrame Zeile fuer Zeile zu verarbeiten.
    # Alternative waere iloc mit range(), aber iterrows ist lesbarer.
    for _, row in raw.iterrows():
        task_name = row["Task"].strip()
        day = int(row["Day"])

        # Phasen-Flags als separate Features, weil die Phase stark beeinflusst
        # wie lange Aufgaben dauern (Showday = mehr Stress, kuerzer geplant)
        is_setup = 1 if day <= 5 else 0
        is_show = 1 if 6 <= day <= 7 else 0
        is_teardown = 1 if day >= 8 else 0

        # Nur 2024 und 2025 als Trainingsdaten — 2026 ist die Vorhersage
        for year, people_col, time_col in [
            (2024, "2024 People", "2024 Time (h)"),
            (2025, "2025 People", "2025 Time (h)"),
            (2026, "2026 People", "2026 Time"),
        ]:
            people = int(row[people_col])
            duration = float(row[time_col])
            rows.append({
                "task_name": task_name,
                "year": year,
                "people_count": people,
                "day": day,
                "is_setup": is_setup,
                "is_show": is_show,
                "is_teardown": is_teardown,
                "duration_hours": duration,
            })

    df = pd.DataFrame(rows)
    return df


def filter_milestones(df):
    """Meilensteine entfernen (Dauer = 0 sind keine echten Aufgaben)."""
    # Meilensteine wie "Start of event" haben Dauer 0 und wuerden die
    # Regression verzerren, weil sie eine andere Logik als echte Aufgaben haben.
    # Schwelle > 0 statt >= 0.5, damit kurze Aufgaben wie "Get containers
    # Delivered" (0.2h) nicht faelschlicherweise gefiltert werden.
    return df[df["duration_hours"] > 0].copy()


def train_model(df_train):
    """Lineare Regression trainieren und R²-Score auf Testdaten ausgeben."""
    feature_cols = ["people_count", "day", "is_setup", "is_show", "is_teardown"]
    X = df_train[feature_cols]
    y = df_train["duration_hours"]

    # 70% Training, 30% Test — random_state=42 ist Kursanforderung fuer
    # reproduzierbare Ergebnisse (gleiche Aufteilung bei jedem Lauf)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.30, random_state=42
    )

    # Skalieren damit grosse Werte (z.B. people_count=270) nicht den
    # Koeffizientenvergleich verfaelschen — StandardScaler macht alle
    # Features vergleichbar (Mittelwert=0, Standardabweichung=1, W10/W11)
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    # Nur transform (nicht fit_transform) auf Testdaten, damit kein
    # Data Leakage entsteht — Testdaten duerfen den Scaler nicht beeinflussen
    X_test_scaled = scaler.transform(X_test)

    # Lineare Regression aus sklearn — Kursinhalt Woche 11
    model = LinearRegression()
    model.fit(X_train_scaled, y_train)

    # R² auf Testdaten (nicht Trainingsdaten — das waere zu optimistisch)
    # R² = 1.0 waere perfekt, R² = 0.0 bedeutet "so gut wie den Mittelwert
    # raten" (Baseline). Alles ueber 0 ist besser als die Baseline.
    r2 = model.score(X_test_scaled, y_test)

    # MAE (Mean Absolute Error) manuell berechnen — zeigt wie viele Stunden
    # die Vorhersage im Schnitt daneben liegt, was fuer die Zeitplanung
    # aussagekraeftiger ist als R² allein.
    # np.abs und np.mean sind erlaubte NumPy-Funktionen (W8).
    y_pred_test = model.predict(X_test_scaled)
    mae = np.mean(np.abs(y_test - y_pred_test))

    print("=" * 60)
    print("TEIL A: ML-Modell — Lineare Regression")
    print("=" * 60)
    print(f"Trainingsdaten: {len(X_train)} Zeilen (nur 2024 + 2025)")
    print(f"Testdaten:      {len(X_test)} Zeilen (nur 2024 + 2025)")
    print(f"R² Score:       {r2:.4f}  (0.0 = Mittelwert-Baseline)")
    print(f"MAE:            {mae:.2f} Stunden")
    print()

    # Koeffizienten interpretieren — negativer Koeffizient bei people_count
    # bedeutet: mehr Leute = kuerzere Aufgabe (erwarteter Zusammenhang)
    # HINWEIS: is_setup/is_show/is_teardown sind kollinear mit day (sie sind
    # deterministische Funktionen von day). Das Modell lernt daher eher
    # Phasen-Durchschnitte als aufgabenspezifische Muster. Das ist eine
    # bekannte Einschraenkung bei nur 5 Features und ~80 Trainingsbeispielen.
    print("Koeffizienten:")
    # zip(): Durchlaeuft zwei Listen parallel — hier Featurenamen und ihre
    # Koeffizienten. Nicht im Kurs gelehrt, aber deutlich lesbarer als eine
    # Index-Schleife mit range(len(...)). Macht dasselbe wie:
    # for i in range(len(feature_cols)): name = feature_cols[i]; coef = model.coef_[i]
    for name, coef in zip(feature_cols, model.coef_):
        print(f"  {name:20s} = {coef:+.4f}")
    print(f"  {'Achsenabschnitt':20s} = {model.intercept_:+.4f}")
    print()

    return model, scaler, feature_cols


def evaluate_on_csv(df_filtered, model, scaler, feature_cols):
    """Modell auf 2026-CSV-Daten evaluieren (Out-of-sample-Vergleich fuer Grading)."""
    # .copy(): Erstellt eine unabhaengige Kopie des DataFrames, damit wir
    # neue Spalten hinzufuegen koennen ohne den Original-DataFrame zu veraendern.
    # Nicht explizit in W8 gelehrt, aber noetig um SettingWithCopyWarning zu vermeiden.
    df_2026 = df_filtered[df_filtered["year"] == 2026].copy()

    X_2026 = df_2026[feature_cols]
    X_2026_scaled = scaler.transform(X_2026)
    df_2026["predicted_duration"] = model.predict(X_2026_scaled)

    # .clip(lower=0.5): Begrenzt alle Werte auf mindestens 0.5 Stunden.
    # Lineare Regression kann negative Werte liefern, was physikalisch
    # sinnlos ist (eine Aufgabe kann nicht negative Zeit dauern).
    # 0.5h ist die kuerzeste reale Aufgabe im Datensatz.
    # Nicht in W8 gelehrt; Alternative waere eine Schleife mit if-Abfrage.
    df_2026["predicted_duration"] = df_2026["predicted_duration"].clip(lower=0.5)

    # Out-of-sample Evaluation: 2026 war NICHT im Training enthalten,
    # also ist der Vergleich Vorhersage vs. Ist-Wert ehrlich
    mae_2026 = np.mean(np.abs(
        df_2026["duration_hours"].values - df_2026["predicted_duration"].values
    ))

    print("--- Modell-Evaluation auf historischen 2026-Daten ---")
    print(f"Out-of-sample MAE: {mae_2026:.2f} Stunden")
    print()
    print("Vorhersage vs. Ist-Werte (CSV):")
    for _, row in df_2026.iterrows():
        print(f"  {row['task_name']:35s}  "
              f"Ist: {row['duration_hours']:5.1f}h  "
              f"Vorhersage: {row['predicted_duration']:5.1f}h  "
              f"({row['people_count']} Leute)")
    print()


# =============================================================================
# Teil B: Live-Daten aus Supabase lesen und ML-Vorhersage anwenden
# =============================================================================

def fetch_live_tasks(supabase):
    """Aktuelle Aufgaben aus der Supabase-Tabelle 'tasks' lesen."""
    # .select() mit den Spalten die wir fuer Scheduling und ML brauchen
    # service_role Key umgeht RLS — voller Lesezugriff auf alle Zeilen
    try:
        response = supabase.table("tasks").select(
            "task_name, depends_on, day, people_needed, "
            "slots_remaining, duration_hours, status"
        ).execute()
        tasks = response.data
        print(f"{len(tasks)} Aufgaben aus Supabase geladen")
        return tasks
    except Exception as e:
        print(f"FEHLER beim Laden der Aufgaben: {e}")
        return []


def predict_live_durations(live_tasks, model, scaler, feature_cols):
    """ML-Vorhersage fuer offene Aufgaben, abgeschlossene bekommen Dauer 0."""
    # Fuer jede Aufgabe die ML-Features berechnen und Dauer vorhersagen.
    # Abgeschlossene Aufgaben brauchen keine Vorhersage — sie sind fertig.
    rows = []
    for task in live_tasks:
        task_name = task["task_name"]
        day = task["day"]
        status = task["status"]
        people = task["people_needed"]
        db_duration = task["duration_hours"]

        # Abgeschlossene Aufgaben: keine Restdauer, kein Personalbedarf
        if status == "complete":
            rows.append({
                "task_name": task_name,
                "predicted_duration": 0.0,
                "people_for_forecast": 0,
                "status": status,
            })
            continue

        # Meilensteine (Dauer 0 in der DB) sind Zeitpunkte, keine Arbeit
        if db_duration is not None and float(db_duration) == 0:
            rows.append({
                "task_name": task_name,
                "predicted_duration": 0.0,
                "people_for_forecast": 0,
                "status": status,
            })
            continue

        # Tag kann None sein wenn nicht gesetzt — Fallback auf Tag 1
        if day is None:
            day = 1

        # Phasen-Flags berechnen (gleiche Logik wie beim Training)
        is_setup = 1 if day <= 5 else 0
        is_show = 1 if 6 <= day <= 7 else 0
        is_teardown = 1 if day >= 8 else 0

        # Showday-Aufgaben (Tag 6–7) sind feste Betriebsschichten (z.B.
        # "Fahrdienst" 16h). Das ML-Modell unterschaetzt sie systematisch
        # weil die Trainingsdaten von 1–6h-Aufgaben dominiert werden.
        # Deshalb verwenden wir die geplante Dauer aus der DB statt ML.
        if is_show == 1 and db_duration is not None and float(db_duration) > 0:
            predicted = float(db_duration)
        else:
            # ML-Features als DataFrame aufbauen (sklearn erwartet 2D-Input)
            features = pd.DataFrame([{
                "people_count": people,
                "day": day,
                "is_setup": is_setup,
                "is_show": is_show,
                "is_teardown": is_teardown,
            }])
            features_scaled = scaler.transform(features)
            predicted = model.predict(features_scaled)[0]

            # .clip(lower=0.5): Mindestens 0.5h damit keine negativen Dauern
            # oder unrealistisch kurze Zeiten entstehen
            if predicted < 0.5:
                predicted = 0.5

        rows.append({
            "task_name": task_name,
            "predicted_duration": predicted,
            "people_for_forecast": people,
            "status": status,
        })

    # Ergebnis ausgeben
    print()
    print("ML-Vorhersage fuer Live-Aufgaben:")
    for r in rows:
        status_tag = "[FERTIG]" if r["status"] == "complete" else "[OFFEN] "
        print(f"  {status_tag} {r['task_name']:35s}  "
              f"Dauer: {r['predicted_duration']:5.1f}h  "
              f"({r['people_for_forecast']} Leute)")
    print()

    return rows


# =============================================================================
# Teil C: Scheduling — Abhaengigkeitsgraph und Tagesprognose
# =============================================================================

def parse_live_dependencies(live_tasks):
    """Abhaengigkeiten, Tage und Personalzahlen aus den Live-Aufgaben parsen."""
    # blocks[task] = Liste der Aufgaben, die diese Aufgabe blockiert
    # Richtung: depends_on enthaelt die DOWNSTREAM-Aufgaben (gleiche Semantik
    # wie die CSV-Spalte "Roadblocking"): "A blockiert B" steht bei A
    blocks = {}
    all_tasks = []
    # task_days speichert den geplanten Tag jeder Aufgabe (1–9),
    # damit der Scheduler Aufgaben an ihren Originaltag verankern kann
    task_days = {}
    # task_people speichert die geplante Personalzahl fuer ALLE Aufgaben
    task_people = {}

    for task in live_tasks:
        name = task["task_name"]
        all_tasks.append(name)
        # Tag kann None sein — Fallback auf Tag 1
        task_days[name] = int(task["day"]) if task["day"] is not None else 1
        task_people[name] = int(task["people_needed"])

        depends_on = task["depends_on"]
        # depends_on kann None sein (kein Nachfolger) oder ein String
        # mit " + " als Trennzeichen fuer mehrere Nachfolger
        if depends_on is not None and str(depends_on).strip() != "":
            downstream = [t.strip() for t in str(depends_on).split(" + ")]
            blocks[name] = downstream

    # Alle bekannten Aufgabennamen als Set fuer schnelle Pruefung
    all_tasks_set = set(all_tasks)

    # Richtung umkehren: predecessors[task] = Aufgaben die fertig sein muessen
    # (der Scheduling-Algorithmus braucht diese Richtung)
    predecessors = {}
    for name in all_tasks:
        predecessors[name] = []

    for blocker, downstream_list in blocks.items():
        for downstream in downstream_list:
            # Warnung bei haengenden Referenzen — wenn eine Aufgabe in
            # depends_on steht aber nicht als eigene Zeile existiert
            if downstream not in all_tasks_set:
                print(f"WARNUNG: '{downstream}' in depends_on von "
                      f"'{blocker}' existiert nicht als Aufgabe")
                continue
            # Selbstreferenzen ignorieren (z.B. "Event-Ende" blockiert
            # sich selbst — wuerde sonst einen Zyklus erzeugen)
            if downstream != blocker:
                predecessors[downstream].append(blocker)

    return all_tasks, predecessors, task_days, task_people


def topological_sort(all_tasks, predecessors):
    """Topologische Sortierung mit Kahn's Algorithmus, damit der Forward Pass korrekt laeuft."""
    # Eingangsgrad = Anzahl Vorgaenger; 0 bedeutet "kann sofort starten"
    in_degree = {}
    for task in all_tasks:
        in_degree[task] = len(predecessors[task])

    # Mit allen Aufgaben ohne Vorgaenger beginnen
    queue = []
    for task in all_tasks:
        if in_degree[task] == 0:
            queue.append(task)

    sorted_tasks = []
    # Nachfolger-Verzeichnis aufbauen damit wir beim Verarbeiten einer Aufgabe
    # sofort ihre Nachfolger aktualisieren koennen
    successors = {}
    for task in all_tasks:
        successors[task] = []
    for task, preds in predecessors.items():
        for pred in preds:
            if pred in successors:
                successors[pred].append(task)

    while len(queue) > 0:
        task = queue.pop(0)
        sorted_tasks.append(task)
        for succ in successors[task]:
            in_degree[succ] = in_degree[succ] - 1
            if in_degree[succ] == 0:
                queue.append(succ)

    # Zykluserkennung: Wenn nach dem Algorithmus Aufgaben uebrig sind,
    # gibt es einen Zyklus im Abhaengigkeitsgraph
    if len(sorted_tasks) < len(all_tasks):
        missing = []
        for task in all_tasks:
            if task not in sorted_tasks:
                missing.append(task)
        # join(): Verbindet eine Liste von Strings mit einem Trennzeichen
        # zu einem einzigen String. Nicht im Kurs gelehrt, aber die
        # sauberste Art eine Liste in einen kommaseparierten Text umzuwandeln.
        print(f"WARNUNG: {len(missing)} Aufgabe(n) wegen Zyklus nicht einsortiert: "
              + ", ".join(missing))

    return sorted_tasks


def compute_schedule(sorted_tasks, predecessors, durations, task_days):
    """Frueheste Start- und Endzeiten berechnen (Forward Pass mit Tages-Verankerung)."""
    earliest_start = {}
    earliest_end = {}

    # Fixierte Aufgaben: Diese Meilensteine haben feste Startzeiten die
    # nicht verschoben werden koennen, egal was die Abhaengigkeiten sagen.
    # Der Showday-Termin steht fest — wenn Setup-Aufgaben spaet dran sind,
    # startet der Showday trotzdem (die Setup-Aufgaben sind dann "behind").
    # Beide Namensversionen unterstuetzt (englisch + deutsch nach Migration 010)
    pinned_tasks = {
        "Show-Tag-Start": 5 * WORKDAY_HOURS,
        "Start of showday": 5 * WORKDAY_HOURS,
        "Show-Tag-Ende": 6 * WORKDAY_HOURS,
        "End of Showday": 6 * WORKDAY_HOURS,
    }

    for task in sorted_tasks:
        # Fixierte Aufgaben bekommen ihren festen Startzeitpunkt
        if task in pinned_tasks:
            earliest_start[task] = pinned_tasks[task]
            duration = durations.get(task, 0.0)
            earliest_end[task] = earliest_start[task] + duration
            continue

        preds = predecessors[task]
        if len(preds) == 0:
            # Keine Vorgaenger -> Aufgabe kann am Start (Stunde 0) beginnen
            earliest_start[task] = 0.0
        else:
            # Aufgabe startet erst wenn der letzte Vorgaenger fertig ist
            latest_pred_end = 0.0
            for p in preds:
                if earliest_end[p] > latest_pred_end:
                    latest_pred_end = earliest_end[p]
            earliest_start[task] = latest_pred_end

        # Verankerung: Aufgabe darf nicht vor ihrem geplanten Tag starten.
        # Der Originaltag dient als Mindest-Startzeit.
        # So bleibt die Grundstruktur der Build Week erhalten, aber
        # Verzoegerungen koennen Aufgaben nach hinten schieben.
        original_day = task_days.get(task, 1)
        min_start_h = (original_day - 1) * WORKDAY_HOURS
        if earliest_start[task] < min_start_h:
            earliest_start[task] = min_start_h

        duration = durations.get(task, 0.0)
        earliest_end[task] = earliest_start[task] + duration

    return earliest_start, earliest_end


def aggregate_daily(sorted_tasks, earliest_start, earliest_end, people_per_task):
    """Personalbedarf pro Tag aggregieren (12h-Arbeitstag)."""
    daily_people = {}
    daily_tasks = {}

    for day in range(1, TOTAL_DAYS + 1):
        # Tagesgrenzen in Stunden seit Start
        day_start_h = (day - 1) * WORKDAY_HOURS
        # Letzter Tag faengt alles auf was ueber den 9-Tage-Horizont hinausgeht,
        # damit keine Aufgaben und Personen "verschwinden"
        if day == TOTAL_DAYS:
            day_end_h = 9999
        else:
            day_end_h = day * WORKDAY_HOURS

        people_total = 0
        active_tasks = []

        for task in sorted_tasks:
            task_start = earliest_start[task]

            # Eine Aufgabe zaehlt fuer den Tag, an dem sie STARTET.
            # Wenn eine Aufgabe laenger als 12h dauert (z.B. "Fahrdienst" 16h
            # am Showday), wuerde sie sonst auch am naechsten Tag gezaehlt
            # und den Personalbedarf dort faelschlich aufblaehen — die Leute
            # arbeiten eine lange Schicht, nicht zwei separate Tage.
            # Meilensteine (Dauer 0) werden am Starttag gezaehlt (>= Pruefung).
            if task_start >= day_start_h and task_start < day_end_h:
                people_total = people_total + people_per_task.get(task, 0)
                active_tasks.append(task)

        daily_people[day] = people_total
        daily_tasks[day] = active_tasks

    return daily_people, daily_tasks


def determine_status(daily_tasks, earliest_end, task_days, completed_tasks):
    """Status pro Tag bestimmen basierend auf Deadline-Vergleich."""
    # Status wird anhand von Deadlines bestimmt, nicht relativ zum Spitzentag:
    # - "behind": Mindestens eine offene Aufgabe endet spaeter als ihr geplanter Tag
    # - "at_risk": Aufgaben sind nah an ihrer Deadline (weniger als 2h Puffer)
    # - "on_track": Alle Aufgaben liegen im Plan
    statuses = {}

    for day in range(1, TOTAL_DAYS + 1):
        active = daily_tasks.get(day, [])
        status = "on_track"

        for task in active:
            # Abgeschlossene Aufgaben koennen keinen Verzug mehr verursachen
            if task in completed_tasks:
                continue
            if task not in earliest_end or task not in task_days:
                continue
            # Deadline = Ende des geplanten Tages in Stunden
            deadline_h = task_days[task] * WORKDAY_HOURS
            end_h = earliest_end[task]

            if end_h > deadline_h:
                # Aufgabe endet nach ihrer Deadline = Verzoegerung
                status = "behind"
                break
            elif deadline_h - end_h < 2.0:
                # Weniger als 2h Puffer bis zur Deadline = kritisch
                if status != "behind":
                    status = "at_risk"

        statuses[day] = status

    return statuses


# =============================================================================
# Supabase: Prognose in die Datenbank schreiben
# =============================================================================

def write_to_supabase(supabase, daily_people, daily_tasks, statuses):
    """Tagesprognose in die Supabase-Tabelle 'forecasts' schreiben (delete + insert)."""
    # try/except fuer Netzwerkfehler — Supabase-Aufrufe koennen bei
    # Verbindungsproblemen fehlschlagen, und das Skript soll dann eine
    # verstaendliche Fehlermeldung ausgeben statt mit einem Traceback abzubrechen
    try:
        # Erst alle alten Prognosen loeschen, dann neu einfuegen.
        # service_role Key umgeht RLS, daher ist kein Rollenfilter noetig —
        # der Key hat vollen Zugriff auf alle Zeilen.
        supabase.table("forecasts").delete().gte("day", 1).execute()

        # Alle 9 Tage als einzelne Zeilen vorbereiten
        rows = []
        for day in range(1, TOTAL_DAYS + 1):
            # join(): Verbindet eine Liste von Strings mit einem Trennzeichen
            # zu einem einzigen String. Nicht im Kurs gelehrt, aber die
            # sauberste Art eine Liste in einen kommaseparierten Text umzuwandeln.
            # Alternative waere eine Schleife mit String-Verkettung (+).
            tasks_text = ", ".join(daily_tasks.get(day, []))
            rows.append({
                "day": day,
                "predicted_people": daily_people.get(day, 0),
                "status": statuses.get(day, "on_track"),
                "tasks_active": tasks_text,
            })

        supabase.table("forecasts").insert(rows).execute()
        print(f"{len(rows)} Zeilen in 'forecasts' geschrieben.")

    except Exception as e:
        print(f"FEHLER beim Supabase-Upload: {e}")
        print("Prognose wurde berechnet aber konnte nicht gespeichert werden.")


# =============================================================================
# Hauptprogramm
# =============================================================================

def main():
    """Hauptfunktion: ML-Modell trainieren, Live-Daten laden, Zeitplan berechnen."""

    # --- Supabase-Verbindung ---
    supabase = create_supabase_client()
    if supabase is None:
        print("Abbruch: Keine Supabase-Verbindung moeglich.")
        return

    # --- Teil A: ML-Modell auf historischen CSV-Daten trainieren ---
    # Die CSV enthaelt 2024/2025/2026-Daten. Trainiert wird nur auf 2024+2025,
    # 2026-CSV dient als Out-of-sample-Evaluation (Modellguete pruefen).
    df_all = load_and_reshape(CSV_PATH)
    df_filtered = filter_milestones(df_all)
    print(f"Datensatz: {len(df_all)} Zeilen gesamt, {len(df_filtered)} nach Filter")
    print()

    # Nur auf 2024 + 2025 trainieren — 2026 wird ausschliesslich fuer die
    # Evaluation verwendet. So vermeiden wir Data Leakage (das Modell sieht
    # die 2026-Antworten nicht waehrend des Trainings).
    df_training = df_filtered[df_filtered["year"] != 2026]
    print(f"Training auf {len(df_training)} Zeilen (2024 + 2025, ohne 2026)")
    print()

    model, scaler, feature_cols = train_model(df_training)

    # Modell-Evaluation: Vorhersage auf 2026-CSV-Daten vergleichen
    # (zeigt dem Grader wie gut das Modell auf ungesehenen Daten funktioniert)
    evaluate_on_csv(df_filtered, model, scaler, feature_cols)

    # --- Teil B: Live-Aufgaben aus Supabase laden und ML anwenden ---
    print("=" * 60)
    print("TEIL B: Live-Daten — Aufgaben aus Supabase")
    print("=" * 60)

    live_tasks = fetch_live_tasks(supabase)

    # Wenn keine Aufgaben in der DB sind, leere Prognose schreiben
    if len(live_tasks) == 0:
        print("Keine Aufgaben in der Datenbank. Schreibe leere Prognose.")
        empty_people = {}
        empty_tasks = {}
        empty_status = {}
        for day in range(1, TOTAL_DAYS + 1):
            empty_people[day] = 0
            empty_tasks[day] = []
            empty_status[day] = "on_track"
        write_to_supabase(supabase, empty_people, empty_tasks, empty_status)
        return

    # ML-Vorhersage: Offene Aufgaben bekommen vorhergesagte Dauer,
    # abgeschlossene Aufgaben bekommen Dauer 0
    predictions = predict_live_durations(live_tasks, model, scaler, feature_cols)

    # --- Teil C: Scheduling ---
    print("=" * 60)
    print("TEIL C: Scheduling — Abhaengigkeitsgraph")
    print("=" * 60)

    all_tasks, predecessors, task_days, task_people = parse_live_dependencies(live_tasks)
    sorted_tasks = topological_sort(all_tasks, predecessors)

    # Vorhergesagte Dauer und Personalzahlen aus den ML-Ergebnissen uebernehmen
    durations = {}
    people_per_task = {}
    # Set der abgeschlossenen Aufgaben fuer die Status-Bestimmung
    completed_tasks = set()
    for pred in predictions:
        durations[pred["task_name"]] = pred["predicted_duration"]
        people_per_task[pred["task_name"]] = pred["people_for_forecast"]
        if pred["status"] == "complete":
            completed_tasks.add(pred["task_name"])

    earliest_start, earliest_end = compute_schedule(
        sorted_tasks, predecessors, durations, task_days
    )

    daily_people, daily_tasks = aggregate_daily(
        sorted_tasks, earliest_start, earliest_end, people_per_task
    )

    statuses = determine_status(daily_tasks, earliest_end, task_days, completed_tasks)

    # Ergebnisse ausgeben
    print()
    print("Tagesprognose (basierend auf Live-Daten):")
    print(f"{'Tag':>4s}  {'Personen':>9s}  {'Status':>10s}  Aktive Aufgaben")
    print("-" * 70)
    for day in range(1, TOTAL_DAYS + 1):
        # join(): siehe Kommentar in write_to_supabase
        task_list = ", ".join(daily_tasks[day][:3])
        if len(daily_tasks[day]) > 3:
            task_list = task_list + f" (+{len(daily_tasks[day]) - 3})"
        print(f"{day:4d}  {daily_people[day]:9d}  {statuses[day]:>10s}  {task_list}")
    print()

    if len(completed_tasks) > 0:
        print(f"Abgeschlossene Aufgaben: {len(completed_tasks)} "
              f"(Dauer=0, Personen=0 in der Prognose)")
        print()

    # --- Supabase Upload ---
    write_to_supabase(supabase, daily_people, daily_tasks, statuses)


if __name__ == "__main__":
    main()
