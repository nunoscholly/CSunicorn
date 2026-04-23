// Task-Checkliste (§2.3): alle Tasks in der Zone des Leads.
// Checkbox markiert den Task als "complete" — serverseitig validiert.
// Erledigte Tasks bleiben in der Liste (durchgestrichen), damit der Lead
// sieht, was schon erledigt ist.

"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/status-badge";
import type { TaskPriority, TaskStatus } from "@/lib/supabase/types";
import { markTaskCompleteAction } from "../actions";

export type ChecklistTask = {
    id: string;
    task_name: string;
    priority: TaskPriority;
    status: TaskStatus;
    shift_start: string | null;
    shift_end: string | null;
};

type TaskChecklistProps = {
    tasks: ChecklistTask[];
};

const PRIORITY_VARIANT: Record<
    TaskPriority,
    "urgent" | "warning" | "neutral"
> = {
    critical: "urgent",
    warning: "warning",
    normal: "neutral",
};

const PRIORITY_LABEL: Record<TaskPriority, string> = {
    critical: "Kritisch",
    warning: "Dringend",
    normal: "Normal",
};

export function TaskChecklist({ tasks }: TaskChecklistProps) {
    const [error, setError] = useState<string | null>(null);
    // Pending-Set statt einzelnem Bool, damit mehrere Clicks nicht hängen.
    const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
    const [, startTransition] = useTransition();

    function handleToggle(id: string, isDone: boolean) {
        // Nur "noch nicht erledigt → erledigt" ist erlaubt — das Zurückstellen
        // wäre eine eigene Action. Docs/user_profiles.md gibt das so vor.
        if (isDone) return;

        setPendingIds((prev) => new Set(prev).add(id));
        setError(null);
        startTransition(async () => {
            const res = await markTaskCompleteAction(id);
            if (!res.ok) setError(res.error);
            setPendingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
            });
        });
    }

    // Sortierung: offen zuerst, innerhalb nach Priorität (Critical > Warning
    // > Normal), erledigte ans Ende.
    const sorted = [...tasks].sort((a, b) => {
        const byStatus =
            (a.status === "complete" ? 1 : 0) -
            (b.status === "complete" ? 1 : 0);
        if (byStatus !== 0) return byStatus;
        const prioRank: Record<TaskPriority, number> = {
            critical: 0,
            warning: 1,
            normal: 2,
        };
        return prioRank[a.priority] - prioRank[b.priority];
    });

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Tages-Checkliste</h2>
                <p className="text-sm text-foreground/60">
                    Haken setzen, sobald der Task erledigt ist. Aktualisiert den PM-Fortschritt sofort.
                </p>
            </div>

            {error ? (
                <div className="mb-3 rounded border border-urgent-red/40 bg-urgent-red/10 px-3 py-2 text-sm text-urgent-red">
                    {error}
                </div>
            ) : null}

            {sorted.length === 0 ? (
                <p className="rounded border border-concrete/20 bg-background/40 px-3 py-6 text-center text-sm text-foreground/50">
                    Keine Tasks für deine Zone.
                </p>
            ) : (
                <ul className="space-y-2">
                    {sorted.map((t) => {
                        const isDone = t.status === "complete";
                        const isPending = pendingIds.has(t.id);
                        return (
                            <li
                                key={t.id}
                                className={[
                                    "flex items-center gap-3 rounded border border-concrete/20 bg-background/40 px-3 py-2",
                                    isDone ? "opacity-60" : "",
                                ].join(" ")}
                            >
                                <input
                                    id={`task-${t.id}`}
                                    type="checkbox"
                                    checked={isDone}
                                    disabled={isDone || isPending}
                                    onChange={() => handleToggle(t.id, isDone)}
                                    className="h-4 w-4 shrink-0 cursor-pointer accent-signal-yellow disabled:cursor-not-allowed"
                                />
                                <div className="min-w-0 flex-1">
                                    {/* Label mit htmlFor koppelt den Task-Namen
                                        programmatisch an die Checkbox — Screenreader
                                        und Click-Target profitieren davon. */}
                                    <label
                                        htmlFor={`task-${t.id}`}
                                        className={[
                                            "block cursor-pointer text-sm font-bold",
                                            isDone ? "line-through" : "",
                                            isPending ? "cursor-wait" : "",
                                        ].join(" ")}
                                    >
                                        {t.task_name}
                                    </label>
                                    <p className="text-xs text-foreground/60">
                                        {formatShift(t.shift_start, t.shift_end)}
                                    </p>
                                </div>
                                {isDone ? (
                                    <StatusBadge label="Erledigt" variant="success" />
                                ) : (
                                    <StatusBadge
                                        label={PRIORITY_LABEL[t.priority]}
                                        variant={PRIORITY_VARIANT[t.priority]}
                                    />
                                )}
                            </li>
                        );
                    })}
                </ul>
            )}
        </section>
    );
}

function formatShift(start: string | null, end: string | null) {
    if (!start && !end) return "ohne feste Zeit";
    const timeFmt = new Intl.DateTimeFormat("de-CH", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
    if (start && end) {
        const endTime = new Intl.DateTimeFormat("de-CH", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(new Date(end));
        return `${timeFmt.format(new Date(start))} – ${endTime}`;
    }
    if (start) return timeFmt.format(new Date(start));
    return `bis ${timeFmt.format(new Date(end!))}`;
}
