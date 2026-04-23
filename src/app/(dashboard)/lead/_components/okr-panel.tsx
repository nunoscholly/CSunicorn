// OKR-Panel (§2.3). Drei Kennzahlen, immer live berechnet — niemals
// gespeichert, weil sie sich aus den anderen Tabellen ableiten.
//
// - Bühnen-Fortschritt %  = abgeschlossene Tasks in der Zone / alle Tasks in der Zone
// - Team-Auslastung %     = zugewiesene Volunteers / erforderliche Kopfzahl
// - Anfragen geschlossen  = erfüllte Anfragen / alle Anfragen dieses Leads

type OkrPanelProps = {
    stageCompletionPct: number;
    crewUtilisationPct: number;
    requestsClosedPct: number;
    requestsClosed: number;
    requestsTotal: number;
};

export function OkrPanel({
    stageCompletionPct,
    crewUtilisationPct,
    requestsClosedPct,
    requestsClosed,
    requestsTotal,
}: OkrPanelProps) {
    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">OKRs</h2>
                <p className="text-sm text-foreground/60">
                    Live aus den laufenden Daten berechnet.
                </p>
            </div>

            <div className="grid gap-3">
                <OkrRow
                    label="Bühnen-Fortschritt"
                    value={`${stageCompletionPct}%`}
                    tone={tone(stageCompletionPct, 80, 50)}
                    progressPct={stageCompletionPct}
                />
                <OkrRow
                    label="Team-Auslastung"
                    value={`${crewUtilisationPct}%`}
                    tone={tone(crewUtilisationPct, 90, 50)}
                    progressPct={crewUtilisationPct}
                />
                <OkrRow
                    label="Anfragen geschlossen"
                    value={`${requestsClosed} / ${requestsTotal}`}
                    tone={tone(requestsClosedPct, 80, 50)}
                    progressPct={requestsClosedPct}
                />
            </div>
        </section>
    );
}

// Zeile mit Label links, Wert rechts und einer dünnen Progress-Bar drunter.
function OkrRow({
    label,
    value,
    tone,
    progressPct,
}: {
    label: string;
    value: string;
    tone: "good" | "warn" | "bad";
    progressPct: number;
}) {
    const barColor =
        tone === "good"
            ? "bg-success-green"
            : tone === "warn"
              ? "bg-signal-yellow"
              : "bg-urgent-red";
    const valueColor =
        tone === "good"
            ? "text-success-green"
            : tone === "warn"
              ? "text-signal-yellow"
              : "text-urgent-red";

    return (
        <div>
            <div className="flex items-baseline justify-between">
                <span className="text-sm text-foreground/70">{label}</span>
                <span className={`text-lg font-bold ${valueColor}`}>{value}</span>
            </div>
            <div
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`${label}: ${progressPct} Prozent`}
                className="mt-1 h-1.5 overflow-hidden rounded-full bg-track"
            >
                <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${Math.min(100, progressPct)}%` }}
                />
            </div>
        </div>
    );
}

// Gibt den Farbzustand zurück — zwei Schwellenwerte reichen für alle drei OKR-Zeilen,
// damit die Logik nicht dreimal dupliziert wird.
function tone(value: number, goodThreshold: number, warnThreshold: number) {
    if (value >= goodThreshold) return "good" as const;
    if (value >= warnThreshold) return "warn" as const;
    return "bad" as const;
}
