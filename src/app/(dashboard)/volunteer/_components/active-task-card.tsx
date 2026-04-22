// Eigenständige Karte für den aktiven Task (§3.1 + §3.3 Call-Button).
// Nur sichtbar, wenn der Volunteer bereits committed hat — erst dann darf
// laut docs/user_profiles.md die Lead-Telefonnummer auftauchen.

import { StatusBadge } from "@/components/status-badge";

export type ActiveTask = {
    taskName: string;
    zone: string | null;
    shiftStart: string | null;
    shiftEnd: string | null;
    description: string | null;
    leadName: string | null;
    leadPhone: string | null;
};

type ActiveTaskCardProps = {
    task: ActiveTask;
};

export function ActiveTaskCard({ task }: ActiveTaskCardProps) {
    return (
        <section className="rounded-xl border border-success-green/40 bg-success-green/5 p-6">
            <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-lg font-bold">Dein aktiver Task</h2>
                <StatusBadge label="Eingeteilt" variant="success" />
            </div>

            <div className="space-y-1 text-sm">
                <p className="text-lg font-bold">{task.taskName}</p>
                <p className="text-foreground/70">
                    {task.zone ?? "—"} · {formatShift(task.shiftStart, task.shiftEnd)}
                </p>
                {task.description ? (
                    <p className="mt-2 text-foreground/80">{task.description}</p>
                ) : null}
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
                {task.leadPhone ? (
                    <a
                        href={`tel:${task.leadPhone}`}
                        className="inline-flex items-center gap-2 rounded-md bg-success-green px-4 py-2 text-sm font-bold text-background hover:bg-success-green/90"
                    >
                        {/* Text explizit auf Deutsch, wie in brand_guidelines.md Tone-of-Voice. */}
                        {task.leadName ? `${task.leadName} anrufen` : "Team-Lead anrufen"}
                    </a>
                ) : (
                    <span className="text-xs text-concrete">
                        Kein Lead-Kontakt hinterlegt.
                    </span>
                )}
            </div>
        </section>
    );
}

function formatShift(start: string | null, end: string | null) {
    if (!start && !end) return "ohne feste Zeit";
    const dayFmt = new Intl.DateTimeFormat("de-CH", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
    if (start && end) {
        const endTime = new Intl.DateTimeFormat("de-CH", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(end));
        return `${dayFmt.format(new Date(start))} – ${endTime}`;
    }
    return dayFmt.format(new Date((start || end)!));
}
