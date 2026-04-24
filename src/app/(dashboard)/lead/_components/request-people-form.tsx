// Leute anfordern (§2.4). Formular + darunter das Log der eigenen Requests
// mit aktuellem Status. Zone ist vorgefüllt und read-only — der Lead arbeitet
// per Definition nur in seiner eigenen Zone.

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { StatusBadge } from "@/components/status-badge";
import { createRequestAction } from "../actions";

export type LeadRequest = {
    id: string;
    people_needed: number;
    shift_start: string | null;
    shift_end: string | null;
    status: "open" | "partial" | "filled";
    created_at: string;
};

type RequestPeopleFormProps = {
    zone: string | null;
    disabled: boolean; // true, wenn kein Team zugeordnet oder Admin-Read-Only
    // Optionaler Grund, der neben dem Button angezeigt wird — ohne Angabe
    // kommt der Default "Kein Team zugeordnet." aus Lead-Perspektive.
    disabledReason?: string;
    requests: LeadRequest[];
};

const STATUS_LABEL: Record<LeadRequest["status"], string> = {
    open: "Offen",
    partial: "Teilbesetzt",
    filled: "Geschlossen",
};
const STATUS_VARIANT: Record<
    LeadRequest["status"],
    "urgent" | "warning" | "success"
> = {
    open: "urgent",
    partial: "warning",
    filled: "success",
};

export function RequestPeopleForm({
    zone,
    disabled,
    disabledReason,
    requests,
}: RequestPeopleFormProps) {
    const [peopleNeeded, setPeopleNeeded] = useState("1");
    const [shiftStart, setShiftStart] = useState("");
    const [shiftEnd, setShiftEnd] = useState("");
    const [skills, setSkills] = useState("");
    const [notes, setNotes] = useState("");
    const [flash, setFlash] = useState<
        { kind: "ok" | "error"; message: string } | null
    >(null);
    const [isPending, startTransition] = useTransition();

    function resetForm() {
        setPeopleNeeded("1");
        setShiftStart("");
        setShiftEnd("");
        setSkills("");
        setNotes("");
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFlash(null);

        const peopleInt = Number.parseInt(peopleNeeded, 10);
        if (!Number.isInteger(peopleInt) || peopleInt < 1) {
            setFlash({ kind: "error", message: "Bedarf muss ≥ 1 sein." });
            return;
        }

        startTransition(async () => {
            const res = await createRequestAction({
                people_needed: peopleInt,
                shift_start: shiftStart,
                shift_end: shiftEnd,
                skills,
                notes,
            });

            if (res.ok) {
                setFlash({ kind: "ok", message: "Anfrage gestellt. PM wird informiert." });
                resetForm();
            } else {
                setFlash({ kind: "error", message: res.error });
            }
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Leute anfordern</h2>
                <p className="text-sm text-foreground/60">
                    PM sieht die Anfrage sofort auf dem Dashboard.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
                <Input
                    label="Zone"
                    value={zone ?? ""}
                    disabled
                    readOnly
                />
                <Input
                    label="Personen benötigt"
                    type="number"
                    min={1}
                    value={peopleNeeded}
                    onChange={(e) => setPeopleNeeded(e.target.value)}
                    required
                    disabled={disabled}
                />
                <Input
                    label="Schicht-Start"
                    type="datetime-local"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    required
                    disabled={disabled}
                />
                <Input
                    label="Schicht-Ende"
                    type="datetime-local"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    required
                    disabled={disabled}
                />
                <Input
                    label="Skills (optional)"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="z.B. Staplerschein"
                    className="md:col-span-2"
                    disabled={disabled}
                />
                <Textarea
                    label="Notizen (optional)"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Treffpunkt, Dringlichkeit, Werkzeug…"
                    className="md:col-span-2"
                    disabled={disabled}
                />
                <div className="flex items-center gap-3 md:col-span-2">
                    <Button type="submit" disabled={disabled || isPending}>
                        {isPending ? "Sende…" : "Anfrage stellen"}
                    </Button>
                    {disabled ? (
                        <span className="text-sm text-concrete">
                            {disabledReason ?? "Kein Team zugeordnet."}
                        </span>
                    ) : null}
                    {flash ? (
                        <span
                            className={
                                flash.kind === "ok"
                                    ? "text-sm text-success-green"
                                    : "text-sm text-urgent-red"
                            }
                        >
                            {flash.message}
                        </span>
                    ) : null}
                </div>
            </form>

            <div className="mt-6">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-concrete">
                    Deine Anfragen
                </h3>
                {requests.length === 0 ? (
                    <p className="rounded border border-concrete/20 bg-background/40 px-3 py-3 text-sm text-foreground/50">
                        Noch keine Anfragen gestellt.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {requests.map((req) => (
                            <li
                                key={req.id}
                                className="flex items-center justify-between gap-3 rounded border border-concrete/20 bg-background/40 px-3 py-2 text-sm"
                            >
                                <div>
                                    <span className="font-bold">
                                        {req.people_needed} Person
                                        {req.people_needed === 1 ? "" : "en"}
                                    </span>
                                    <span className="ml-2 text-foreground/60">
                                        {formatShift(
                                            req.shift_start,
                                            req.shift_end,
                                        )}
                                    </span>
                                </div>
                                <StatusBadge
                                    label={STATUS_LABEL[req.status]}
                                    variant={STATUS_VARIANT[req.status]}
                                />
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

function formatShift(start: string | null, end: string | null) {
    if (!start && !end) return "—";
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
