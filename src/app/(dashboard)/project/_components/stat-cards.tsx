// Vier Key-Metrics ganz oben auf dem PM-Dashboard (§1.1):
//   - Active Volunteers
//   - Offene Anfragen
//   - Tasks erledigt %
//   - Coverage heute %
// Werte kommen fertig berechnet von der Server-Seite — diese Komponente
// ist rein präsentativ.

type StatCardsProps = {
    activeVolunteers: number;
    openRequests: number;
    tasksCompletePct: number;
    coverageTodayPct: number;
};

export function StatCards({
    activeVolunteers,
    openRequests,
    tasksCompletePct,
    coverageTodayPct,
}: StatCardsProps) {
    return (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Active Volunteers" value={String(activeVolunteers)} />
            <StatCard label="Offene Anfragen" value={String(openRequests)} />
            <StatCard
                label="Tasks erledigt"
                value={`${tasksCompletePct}%`}
                tone={tasksCompletePct >= 80 ? "good" : tasksCompletePct >= 50 ? "warn" : "bad"}
            />
            <StatCard
                label="Coverage heute"
                value={`${coverageTodayPct}%`}
                tone={
                    coverageTodayPct >= 90
                        ? "good"
                        : coverageTodayPct >= 50
                          ? "warn"
                          : "bad"
                }
            />
        </div>
    );
}

// Einzelne Kachel. tone steuert die Farbe der Kernzahl — Signal Yellow
// bleibt die Default-Hervorhebung (Brand-Regel: Gelb = Wichtig).
function StatCard({
    label,
    value,
    tone = "neutral",
}: {
    label: string;
    value: string;
    tone?: "neutral" | "good" | "warn" | "bad";
}) {
    const valueColor =
        tone === "good"
            ? "text-success-green"
            : tone === "bad"
              ? "text-urgent-red"
              : "text-signal-yellow";

    return (
        <div className="rounded-xl border border-concrete/20 bg-surface p-5">
            <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-concrete">
                {label}
            </div>
            <div className={`mt-2 text-3xl font-bold ${valueColor}`}>{value}</div>
        </div>
    );
}
