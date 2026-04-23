// Feed offener Aufgaben (§3.3). Cards sortiert nach Dringlichkeit.
// Button-Zustand pro Karte:
//   - "Übernehmen" (gelb) wenn Volunteer keinen aktiven Task hat UND
//     slots_remaining > 0
//   - "Bereits vergeben" (grau, disabled) wenn slots_remaining = 0
//   - "Schon eingeteilt" (grau, disabled) wenn der Volunteer bereits einen
//     anderen aktiven Task hat
//
// Lead-Telefonnummer wird hier bewusst NICHT gezeigt — erst nach dem Commit,
// auf der ActiveTaskCard. So war es in docs/user_profiles.md spezifiziert.

"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { TaskPriority } from "@/lib/supabase/types";
import { commitToTaskAction } from "../actions";

export type OpenJob = {
    id: string;
    task_name: string;
    zone: string | null;
    shift_start: string | null;
    shift_end: string | null;
    description: string | null;
    slots_remaining: number;
    people_needed: number;
    priority: TaskPriority;
};

type OpenJobsFeedProps = {
    jobs: OpenJob[];
    volunteerHasActiveTask: boolean;
    // True nur für Volunteer-Rollen. Admin öffnet /volunteer nur zum
    // Vorschauen — ohne Flag würde der "Übernehmen"-Button echte Slots
    // auf den Admin buchen und die Sektor-Map verzerren (BUG-4).
    isVolunteer: boolean;
};

const PRIORITY_RANK: Record<TaskPriority, number> = {
    critical: 0,
    warning: 1,
    normal: 2,
};
const PRIORITY_LABEL: Record<TaskPriority, string> = {
    critical: "Kritisch",
    warning: "Dringend",
    normal: "Normal",
};
const PRIORITY_VARIANT: Record<
    TaskPriority,
    "urgent" | "warning" | "neutral"
> = {
    critical: "urgent",
    warning: "warning",
    normal: "neutral",
};

export function OpenJobsFeed({
    jobs,
    volunteerHasActiveTask,
    isVolunteer,
}: OpenJobsFeedProps) {
    const [error, setError] = useState<string | null>(null);
    const [pendingId, setPendingId] = useState<string | null>(null);
    const [, startTransition] = useTransition();

    // useTransition verhindert, dass der UI-Thread während des Server-Calls blockiert —
    // der Button zeigt "Übernehme…" und bleibt klickbar für andere Karten.
    function handleCommit(taskId: string) {
        setError(null);
        setPendingId(taskId);
        startTransition(async () => {
            const res = await commitToTaskAction(taskId);
            setPendingId(null);
            if (!res.ok) setError(res.error);
        });
    }

    // Sortierung: zuerst nach Priorität, dann nach frühestem Schicht-Start.
    const sorted = [...jobs].sort((a, b) => {
        const byPrio = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
        if (byPrio !== 0) return byPrio;
        const aStart = a.shift_start ?? "";
        const bStart = b.shift_start ?? "";
        return aStart.localeCompare(bStart);
    });

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Offene Aufgaben</h2>
                <p className="text-sm text-foreground/60">
                    Ein Task gleichzeitig. Nach der Übernahme erscheint der Anruf-Button oben.
                </p>
            </div>

            {error ? (
                <div className="mb-3 rounded border border-urgent-red/40 bg-urgent-red/10 px-3 py-2 text-sm text-urgent-red">
                    {error}
                </div>
            ) : null}

            {sorted.length === 0 ? (
                <p className="rounded border border-concrete/20 bg-background/40 px-3 py-6 text-center text-sm text-foreground/50">
                    Aktuell keine offenen Tasks. Schau gleich nochmal vorbei.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {sorted.map((job) => (
                        <JobCard
                            key={job.id}
                            job={job}
                            volunteerHasActiveTask={volunteerHasActiveTask}
                            isVolunteer={isVolunteer}
                            isPending={pendingId === job.id}
                            onCommit={() => handleCommit(job.id)}
                        />
                    ))}
                </div>
            )}
        </section>
    );
}

function JobCard({
    job,
    volunteerHasActiveTask,
    isVolunteer,
    isPending,
    onCommit,
}: {
    job: OpenJob;
    volunteerHasActiveTask: boolean;
    isVolunteer: boolean;
    isPending: boolean;
    onCommit: () => void;
}) {
    const isTaken = job.slots_remaining <= 0;
    // Admin darf nicht committen — der Server-Action lehnt ohnehin ab,
    // aber wir zeigen den Zustand auch im UI (BUG-4).
    const isDisabled = isTaken || volunteerHasActiveTask || !isVolunteer;

    // Button-Label nach Zustand. Kurz + aktiv gemäss brand_guidelines.md.
    const buttonLabel = isPending
        ? "Übernehme…"
        : !isVolunteer
          ? "Nur Volunteers"
          : isTaken
            ? "Bereits vergeben"
            : volunteerHasActiveTask
              ? "Schon eingeteilt"
              : "Übernehmen";

    const buttonClasses = isDisabled
        ? "cursor-not-allowed bg-background/60 text-concrete"
        : "bg-signal-yellow text-background hover:bg-signal-yellow-hover";

    return (
        <div className="flex h-full flex-col rounded-lg border border-concrete/20 bg-background/40 p-4">
            <div className="mb-2 flex items-start justify-between gap-2">
                <h3 className="text-sm font-bold">{job.task_name}</h3>
                <StatusBadge
                    label={PRIORITY_LABEL[job.priority]}
                    variant={PRIORITY_VARIANT[job.priority]}
                />
            </div>
            <p className="text-xs text-foreground/60">
                {job.zone ?? "—"} · {formatShift(job.shift_start, job.shift_end)}
            </p>
            {job.description ? (
                <p className="mt-2 text-sm text-foreground/80">{job.description}</p>
            ) : null}
            <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-concrete">
                    {job.slots_remaining} / {job.people_needed} Plätze frei
                </span>
                <button
                    type="button"
                    onClick={onCommit}
                    disabled={isDisabled || isPending}
                    className={`rounded-md px-3 py-1.5 text-xs font-bold ${buttonClasses}`}
                >
                    {buttonLabel}
                </button>
            </div>
        </div>
    );
}

// Formatiert Schicht-Start/-Ende für die Kartenanzeige. de-CH damit Wochentage
// und Zeitformat zur Zielgruppe passen (Mo., Di. statt Mon, Tue).
function formatShift(start: string | null, end: string | null) {
    if (!start && !end) return "ohne feste Zeit";
    const dayFmt = new Intl.DateTimeFormat("de-CH", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
    if (start && end) {
        // Endzeit ohne Wochentag, weil Start und Ende immer am selben Tag liegen.
        const endTime = new Intl.DateTimeFormat("de-CH", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(end));
        return `${dayFmt.format(new Date(start))} – ${endTime}`;
    }
    return dayFmt.format(new Date((start || end)!));
}
