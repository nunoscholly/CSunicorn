// Liste offener Personal-Anfragen (§1.4).
// Sortierung: Critical → Warning → Filled. "Critical" = status='open',
// "Warning" = status='partial', "Filled" = status='filled'. PM kann offene
// oder teilgefüllte Anfragen direkt per Button schliessen.

"use client";

import { useState, useTransition } from "react";
import { StatusBadge } from "@/components/status-badge";
import { resolveRequestAction } from "../actions";

export type PmRequest = {
    id: string;
    zone: string | null;
    people_needed: number;
    shift_start: string | null;
    shift_end: string | null;
    status: "open" | "partial" | "filled";
    created_at: string;
};

type OutstandingRequestsProps = {
    requests: PmRequest[];
};

// Rangordnung für die Sortierung. Kleinere Zahl = höhere Priorität.
const STATUS_ORDER: Record<PmRequest["status"], number> = {
    open: 0,
    partial: 1,
    filled: 2,
};

// "Kritisch" überdramatisierte offene Anfragen, bei denen schlicht noch
// niemand eingeteilt ist (ox/ux_findings). "Offen" liest neutraler; der
// "urgent"-Badge-Farbton bleibt rot, sodass Dringlichkeit visuell weiter
// kommt.
const STATUS_LABEL: Record<PmRequest["status"], string> = {
    open: "Offen",
    partial: "Teilbesetzt",
    filled: "Geschlossen",
};

const STATUS_VARIANT: Record<
    PmRequest["status"],
    "urgent" | "warning" | "success"
> = {
    open: "urgent",
    partial: "warning",
    filled: "success",
};

export function OutstandingRequests({ requests }: OutstandingRequestsProps) {
    const [flash, setFlash] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    // Sortieren pro Status, innerhalb desselben Status nach Erstellzeit aufsteigend
    // (älteste zuerst — "Kritisch" bedeutet, dass sie lange offen sind).
    const sorted = [...requests].sort((a, b) => {
        const orderDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (orderDiff !== 0) return orderDiff;
        return a.created_at.localeCompare(b.created_at);
    });

    function handleResolve(id: string) {
        startTransition(async () => {
            const res = await resolveRequestAction(id);
            setFlash(res.ok ? "Anfrage geschlossen." : res.error);
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Offene Personal-Anfragen</h2>
                <p className="text-sm text-foreground/60">
                    Sortiert nach Dringlichkeit. Geschlossene Anfragen ganz unten.
                </p>
            </div>

            {flash ? (
                <div className="mb-3 rounded border border-concrete/30 bg-background/40 px-3 py-2 text-sm text-foreground/80">
                    {flash}
                </div>
            ) : null}

            {sorted.length === 0 ? (
                <p className="rounded border border-concrete/20 bg-background/40 px-3 py-6 text-center text-sm text-foreground/50">
                    Keine Anfragen. Saubere Schicht.
                </p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full border-separate border-spacing-0 text-sm">
                        <thead>
                            <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-concrete">
                                <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                    Zone
                                </th>
                                <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                    Bedarf
                                </th>
                                <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                    Schicht
                                </th>
                                <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                    Status
                                </th>
                                <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                    Aktion
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sorted.map((req) => (
                                <tr key={req.id}>
                                    <td className="border-b border-concrete/10 px-3 py-2 font-bold">
                                        {req.zone ?? "—"}
                                    </td>
                                    <td className="border-b border-concrete/10 px-3 py-2 text-foreground/70">
                                        {req.people_needed} P.
                                    </td>
                                    <td className="border-b border-concrete/10 px-3 py-2 text-foreground/70">
                                        {formatShift(req.shift_start, req.shift_end)}
                                    </td>
                                    <td className="border-b border-concrete/10 px-3 py-2">
                                        <StatusBadge
                                            label={STATUS_LABEL[req.status]}
                                            variant={STATUS_VARIANT[req.status]}
                                        />
                                    </td>
                                    <td className="border-b border-concrete/10 px-3 py-2">
                                        {req.status === "filled" ? (
                                            <span className="text-xs text-concrete">
                                                —
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => handleResolve(req.id)}
                                                disabled={isPending}
                                                // aria-label verankert den Button an die
                                                // konkrete Anfrage, statt nur "Schliessen"
                                                // dreimal zu wiederholen (A11Y-S9).
                                                aria-label={`Anfrage ${req.zone ?? "Zone"} schliessen`}
                                                className="text-xs font-bold uppercase tracking-[0.08em] text-signal-yellow hover:underline disabled:text-concrete"
                                            >
                                                Schliessen
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

// Kompakte Darstellung der Schicht: "MO 08:00 – 10:00" wenn beide Zeiten da.
// Halluzinieren unvollständige Daten nicht — zeigen, was da ist.
function formatShift(start: string | null, end: string | null) {
    if (!start && !end) return "—";
    const startDate = start ? new Date(start) : null;
    const endDate = end ? new Date(end) : null;
    const formatter = new Intl.DateTimeFormat("de-CH", {
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
    });
    if (startDate && endDate) {
        const endTime = new Intl.DateTimeFormat("de-CH", {
            hour: "2-digit",
            minute: "2-digit",
        }).format(endDate);
        return `${formatter.format(startDate)} – ${endTime}`;
    }
    if (startDate) return formatter.format(startDate);
    if (endDate) return `bis ${formatter.format(endDate)}`;
    return "—";
}
