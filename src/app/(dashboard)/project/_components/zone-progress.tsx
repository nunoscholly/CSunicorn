// Fortschrittsbalken pro Zone (§1.3). Grün ≥ 80 %, Gelb 50–79 %, Rot < 50 %.
// Die Prozentwerte werden in der Server-Komponente aus der tasks-Tabelle
// berechnet und hier nur angezeigt.

import type { Zone } from "@/lib/zones";

export type ZoneProgress = {
    zone: Zone;
    completed: number;
    total: number;
    percentage: number; // 0-100, bereits gerundet
};

type ZoneProgressListProps = {
    rows: ZoneProgress[];
};

export function ZoneProgressList({ rows }: ZoneProgressListProps) {
    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Fortschritt je Zone</h2>
                <p className="text-sm text-foreground/60">
                    Anteil abgeschlossener Tasks — live aus der Datenbank.
                </p>
            </div>

            <div className="space-y-3">
                {rows.map((row) => (
                    <ProgressRow key={row.zone} row={row} />
                ))}
            </div>
        </section>
    );
}

function ProgressRow({ row }: { row: ZoneProgress }) {
    // Farbstufen analog docs/visualizations.md §1.3.
    const barColor =
        row.percentage >= 80
            ? "bg-success-green"
            : row.percentage >= 50
              ? "bg-signal-yellow"
              : "bg-urgent-red";

    return (
        <div>
            <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-bold">{row.zone}</span>
                <span className="text-xs text-foreground/60">
                    {row.completed} / {row.total} · {row.percentage}%
                </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-[#222]">
                <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${Math.min(100, row.percentage)}%` }}
                />
            </div>
        </div>
    );
}
