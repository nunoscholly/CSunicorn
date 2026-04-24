# ML-Forecast: Tagesprognose fuer den Personalbedarf der Build Week
# Trainiert eine lineare Regression auf historischen Schichtdaten (2024–2025),
# berechnet einen Abhaengigkeitsgraph und schreibt Tagesprognosen in Supabase.
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
# Nur fuer 2026 eine Vorhersage erstellen; 2024 und 2025 sind Trainingsdaten
PREDICTION_YEAR = 2026


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

        # Jedes Jahr als eigene Beobachtung hinzufuegen — das verdreifacht
        # den Datensatz und gibt dem Modell mehr Trainingsbeispiele
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


def predict_2026_durations(df, model, scaler, feature_cols):
    """ML-Vorhersage fuer alle 2026-Aufgaben berechnen und mit Ist-Werten vergleichen."""
    # .copy(): Erstellt eine unabhaengige Kopie des DataFrames, damit wir
    # neue Spalten hinzufuegen koennen ohne den Original-DataFrame zu veraendern.
    # Nicht explizit in W8 gelehrt, aber noetig um SettingWithCopyWarning zu vermeiden.
    df_2026 = df[df["year"] == PREDICTION_YEAR].copy()

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

    print(f"Out-of-sample MAE (2026): {mae_2026:.2f} Stunden")
    print()
    print("Vorhersage 2026 (Auszug):")
    for _, row in df_2026.iterrows():
        print(f"  {row['task_name']:35s}  "
              f"Ist: {row['duration_hours']:5.1f}h  "
              f"Vorhersage: {row['predicted_duration']:5.1f}h  "
              f"({row['people_count']} Leute)")
    print()

    return df_2026


# =============================================================================
# Teil B: Scheduling — Abhaengigkeitsgraph und Tagesprognose
# =============================================================================

def parse_dependencies(csv_path):
    """Abhaengigkeiten, Tage und Personalzahlen aus der CSV parsen."""
    raw = pd.read_csv(csv_path)
    raw.columns = [c.strip() for c in raw.columns]

    # blocks[task] = Liste der Aufgaben, die diese Aufgabe blockiert
    # Richtung in der CSV: "A blockiert B" heisst B kann erst starten wenn A fertig ist
    blocks = {}
    all_tasks = []
    # task_days speichert den geplanten Tag jeder Aufgabe (1–9) aus der CSV,
    # damit der Scheduler Aufgaben an ihren Originaltag verankern kann
    task_days = {}
    # task_people speichert die geplante Personalzahl (2026) fuer ALLE Aufgaben,
    # auch fuer Meilensteine die im ML-Datensatz gefiltert wurden — damit ihre
    # Personalzahl (z.B. 600 bei "Start of showday") nicht verloren geht
    task_people = {}

    for _, row in raw.iterrows():
        task = row["Task"].strip()
        all_tasks.append(task)
        task_days[task] = int(row["Day"])
        task_people[task] = int(row["2026 People"])
        roadblocking = str(row["Roadblocking"]).strip()

        # str() auf die Zelle anwenden, weil pandas leere Zellen als
        # float NaN einliest — str(NaN) ergibt "nan"
        if roadblocking and roadblocking != "nan":
            # Mehrere blockierte Aufgaben sind mit " + " getrennt
            downstream = [t.strip() for t in roadblocking.split(" + ")]
            blocks[task] = downstream

    # Alle bekannten Aufgabennamen als Set fuer schnelle Pruefung
    all_tasks_set = set(all_tasks)

    # Richtung umkehren: predecessors[task] = Aufgaben die fertig sein muessen
    # (der Scheduling-Algorithmus braucht diese Richtung)
    predecessors = {}
    for task in all_tasks:
        predecessors[task] = []

    for blocker, downstream_list in blocks.items():
        for downstream in downstream_list:
            # Warnung bei haengenden Referenzen — wenn eine Aufgabe in der
            # Roadblocking-Spalte steht aber nicht als eigene Zeile existiert,
            # ist das ein Datenfehler in der CSV
            if downstream not in all_tasks_set:
                print(f"WARNUNG: '{downstream}' in Roadblocking von "
                      f"'{blocker}' existiert nicht als Aufgabe")
                continue
            # Selbstreferenzen ignorieren (z.B. "End of event" blockiert
            # sich selbst in der CSV — wuerde sonst einen Zyklus erzeugen)
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
    pinned_tasks = {
        "Start of showday": 5 * WORKDAY_HOURS,
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
        # Der Originaltag aus der CSV dient als Mindest-Startzeit.
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
            task_end = earliest_end[task]

            # Aufgabe ist an diesem Tag aktiv wenn sie den Tag ueberlappt.
            # >= statt > bei task_end, damit Meilensteine mit Dauer 0
            # (z.B. "Start of showday") am Tag ihres Starts gezaehlt werden.
            # Showday-Aufgaben (z.B. "Driving" mit 16h) koennen laenger als
            # ein 12h-Tag dauern und in den naechsten Tag hineinragen — das
            # ist laut Einsatzplan erlaubt ("Work CAN exceed 12h").
            if task_start < day_end_h and task_end >= day_start_h:
                people_total = people_total + people_per_task.get(task, 0)
                active_tasks.append(task)

        daily_people[day] = people_total
        daily_tasks[day] = active_tasks

    return daily_people, daily_tasks


def determine_status(daily_tasks, earliest_end, task_days):
    """Status pro Tag bestimmen basierend auf Deadline-Vergleich."""
    # Status wird anhand von Deadlines bestimmt, nicht relativ zum Spitzentag:
    # - "behind": Mindestens eine Aufgabe endet spaeter als ihr geplanter Tag
    # - "at_risk": Aufgaben sind nah an ihrer Deadline (weniger als 2h Puffer)
    # - "on_track": Alle Aufgaben liegen im Plan
    statuses = {}

    for day in range(1, TOTAL_DAYS + 1):
        active = daily_tasks.get(day, [])
        status = "on_track"

        for task in active:
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

def write_to_supabase(daily_people, daily_tasks, statuses):
    """Tagesprognose in die Supabase-Tabelle 'forecasts' schreiben (delete + insert)."""
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
        print("WARNUNG: NEXT_PUBLIC_SUPABASE_URL oder SUPABASE_SERVICE_ROLE_KEY nicht gesetzt.")
        print("Ueberspringe Supabase-Upload. Setze Variablen in ml/.env")
        return

    supabase = create_client(url, key)

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
    """Hauptfunktion: ML-Modell trainieren, Zeitplan berechnen, Ergebnisse speichern."""

    # --- Teil A: ML ---
    df_all = load_and_reshape(CSV_PATH)
    df_filtered = filter_milestones(df_all)
    print(f"Datensatz: {len(df_all)} Zeilen gesamt, {len(df_filtered)} nach Filter")
    print()

    # Nur auf 2024 + 2025 trainieren — 2026 wird ausschliesslich fuer die
    # Vorhersage verwendet. So vermeiden wir Data Leakage (das Modell sieht
    # die 2026-Antworten nicht waehrend des Trainings).
    df_training = df_filtered[df_filtered["year"] != PREDICTION_YEAR]
    print(f"Training auf {len(df_training)} Zeilen (2024 + 2025, ohne 2026)")
    print()

    model, scaler, feature_cols = train_model(df_training)
    df_2026 = predict_2026_durations(df_filtered, model, scaler, feature_cols)

    # --- Teil B: Scheduling ---
    print("=" * 60)
    print("TEIL B: Scheduling — Abhaengigkeitsgraph")
    print("=" * 60)

    all_tasks, predecessors, task_days, task_people = parse_dependencies(CSV_PATH)
    sorted_tasks = topological_sort(all_tasks, predecessors)

    # Vorhergesagte Dauer pro Aufgabe aus dem ML-Modell uebernehmen
    durations = {}
    for _, row in df_2026.iterrows():
        durations[row["task_name"]] = row["predicted_duration"]

    # Showday-Aufgaben (Tag 6–7) sind feste Betriebsschichten (z.B. "Driving"
    # 16h, "Service points" 16h) und keine variablen Bauaufgaben. Das ML-Modell
    # unterschaetzt sie systematisch, weil die Trainingsdaten von 1–6h-Aufgaben
    # dominiert werden. Deshalb verwenden wir hier die tatsaechlichen 2026-Werte
    # aus der CSV statt der ML-Vorhersage.
    df_2026_all = df_all[df_all["year"] == PREDICTION_YEAR]
    for _, row in df_2026_all.iterrows():
        if row["is_show"] == 1 and row["duration_hours"] > 0:
            durations[row["task_name"]] = row["duration_hours"]

    # Meilensteine sind im ML-Datensatz nicht enthalten (gefiltert), bekommen
    # deshalb Dauer 0 damit der Forward Pass trotzdem funktioniert
    for task in all_tasks:
        if task not in durations:
            durations[task] = 0.0

    # Personalzahlen aus der CSV verwenden (nicht aus df_2026), damit alle
    # Aufgaben eine korrekte Personalzahl haben. Meilensteine (Dauer = 0)
    # bekommen people = 0, weil sie einen Zeitpunkt markieren ("alle sind da"),
    # aber keinen Arbeitstag mit Personalbedarf darstellen — sonst wuerden
    # z.B. 600 Leute von "Start of showday" den Tagesbedarf aufblaehen
    people_per_task = {}
    for task in all_tasks:
        if durations.get(task, 0.0) > 0:
            people_per_task[task] = task_people.get(task, 0)
        else:
            people_per_task[task] = 0

    earliest_start, earliest_end = compute_schedule(
        sorted_tasks, predecessors, durations, task_days
    )

    daily_people, daily_tasks = aggregate_daily(
        sorted_tasks, earliest_start, earliest_end, people_per_task
    )

    statuses = determine_status(daily_tasks, earliest_end, task_days)

    # Ergebnisse ausgeben
    print()
    print("Tagesprognose:")
    print(f"{'Tag':>4s}  {'Personen':>9s}  {'Status':>10s}  Aktive Aufgaben")
    print("-" * 70)
    for day in range(1, TOTAL_DAYS + 1):
        # join(): siehe Kommentar in write_to_supabase
        task_list = ", ".join(daily_tasks[day][:3])
        if len(daily_tasks[day]) > 3:
            task_list = task_list + f" (+{len(daily_tasks[day]) - 3})"
        print(f"{day:4d}  {daily_people[day]:9d}  {statuses[day]:>10s}  {task_list}")
    print()

    # --- Supabase Upload ---
    write_to_supabase(daily_people, daily_tasks, statuses)


if __name__ == "__main__":
    main()
