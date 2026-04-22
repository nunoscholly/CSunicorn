// Einzelnen Task anlegen (§1.5). Fields laut docs/visualizations.md:
// zone, task_name, shift_start/end, people_needed, skills, priority, description.

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select, Textarea } from "@/components/ui/input";
import { ZONES, type Zone } from "@/lib/zones";
import type { TaskPriority } from "@/lib/supabase/types";
import { createTaskAction } from "../actions";

const PRIORITY_OPTIONS: Array<{ value: TaskPriority; label: string }> = [
    { value: "critical", label: "Kritisch" },
    { value: "warning", label: "Dringend" },
    { value: "normal", label: "Normal" },
];

export function AddTaskForm() {
    const [zone, setZone] = useState<Zone>(ZONES[0]);
    const [taskName, setTaskName] = useState("");
    const [shiftStart, setShiftStart] = useState("");
    const [shiftEnd, setShiftEnd] = useState("");
    const [peopleNeeded, setPeopleNeeded] = useState("1");
    const [skills, setSkills] = useState("");
    const [priority, setPriority] = useState<TaskPriority>("normal");
    const [description, setDescription] = useState("");

    const [flash, setFlash] = useState<
        { kind: "ok" | "error"; message: string } | null
    >(null);
    const [isPending, startTransition] = useTransition();

    function resetForm() {
        setTaskName("");
        setShiftStart("");
        setShiftEnd("");
        setPeopleNeeded("1");
        setSkills("");
        setPriority("normal");
        setDescription("");
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFlash(null);

        // people_needed wird als Text vom Input geliefert — hier parsen und
        // klar melden, wenn der User Mist eingibt.
        const peopleInt = Number.parseInt(peopleNeeded, 10);
        if (!Number.isInteger(peopleInt) || peopleInt < 1) {
            setFlash({ kind: "error", message: "Personen-Zahl muss ≥ 1 sein." });
            return;
        }

        startTransition(async () => {
            const res = await createTaskAction({
                zone,
                task_name: taskName,
                shift_start: shiftStart,
                shift_end: shiftEnd,
                people_needed: peopleInt,
                skills,
                description,
                priority,
            });

            if (res.ok) {
                setFlash({ kind: "ok", message: "Task angelegt." });
                resetForm();
            } else {
                setFlash({ kind: "error", message: res.error });
            }
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Task hinzufügen</h2>
                <p className="text-sm text-foreground/60">
                    Neue Aufgabe im Bauplan erfassen. Offen ab Schicht-Start.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3 md:grid-cols-2">
                <Input
                    label="Task-Name"
                    value={taskName}
                    onChange={(e) => setTaskName(e.target.value)}
                    required
                    placeholder="Traverse aufbauen"
                />
                <Select
                    label="Zone"
                    value={zone}
                    onChange={(e) => setZone(e.target.value as Zone)}
                >
                    {ZONES.map((z) => (
                        <option key={z} value={z}>
                            {z}
                        </option>
                    ))}
                </Select>
                <Input
                    label="Schicht-Start"
                    type="datetime-local"
                    value={shiftStart}
                    onChange={(e) => setShiftStart(e.target.value)}
                    required
                />
                <Input
                    label="Schicht-Ende"
                    type="datetime-local"
                    value={shiftEnd}
                    onChange={(e) => setShiftEnd(e.target.value)}
                    required
                />
                <Input
                    label="Personen benötigt"
                    type="number"
                    min={1}
                    value={peopleNeeded}
                    onChange={(e) => setPeopleNeeded(e.target.value)}
                    required
                />
                <Select
                    label="Priorität"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as TaskPriority)}
                >
                    {PRIORITY_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </Select>
                <Input
                    label="Skills (optional)"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="z.B. Staplerschein"
                    className="md:col-span-2"
                />
                <Textarea
                    label="Beschreibung (optional)"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Details, Treffpunkt, Werkzeug…"
                    className="md:col-span-2"
                />
                <div className="flex items-center gap-3 md:col-span-2">
                    <Button type="submit" disabled={isPending}>
                        {isPending ? "Speichere…" : "Task anlegen"}
                    </Button>
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
        </section>
    );
}
