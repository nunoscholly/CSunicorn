// User-Management: Liste aller Profile + Formulare zum Anlegen / Bearbeiten /
// Deaktivieren. Soft-Delete only, wie in docs/user_profiles.md festgeschrieben.

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { RoleBadge, StatusBadge } from "@/components/status-badge";
import type { Profile, UserRole } from "@/lib/supabase/types";
import {
    createUserAction,
    setUserActiveAction,
    updateProfileAction,
} from "../actions";

type UserManagementProps = {
    profiles: Profile[];
};

// Auswahloptionen für das Rollen-Dropdown — zentral, damit die vier erlaubten
// Werte nur an einer Stelle gepflegt werden müssen.
const ROLE_OPTIONS: Array<{ value: UserRole; label: string }> = [
    { value: "admin", label: "Admin" },
    { value: "pm", label: "Project Manager" },
    { value: "lead", label: "Team-Lead" },
    { value: "volunteer", label: "Volunteer" },
];

export function UserManagement({ profiles }: UserManagementProps) {
    // Welcher User wird gerade bearbeitet? Null = niemand.
    const [editingId, setEditingId] = useState<string | null>(null);
    // Add-Formular sichtbar? Wird nur bei Bedarf aufgeklappt, damit die Tabelle
    // im Normalfall direkt im Blick ist.
    const [showAddForm, setShowAddForm] = useState(false);
    const [flash, setFlash] = useState<
        { kind: "ok" | "error"; message: string } | null
    >(null);
    const [isPending, startTransition] = useTransition();

    // Zentraler Wrapper für alle mutierende Actions — spart dreifache
    // Flash-Logik in den Inline-Callbacks und hält den Pending-State konsistent.
    function runAction(fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) {
        startTransition(async () => {
            const result = await fn();
            if (result.ok) {
                setFlash({
                    kind: "ok",
                    message: result.message ?? "Änderung gespeichert.",
                });
            } else {
                setFlash({
                    kind: "error",
                    message: result.error ?? "Unbekannter Fehler.",
                });
            }
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4 flex items-center justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold">User-Verwaltung</h2>
                    <p className="text-sm text-foreground/60">
                        Accounts anlegen, Rollen ändern oder deaktivieren.
                    </p>
                </div>
                <Button
                    variant={showAddForm ? "secondary" : "primary"}
                    onClick={() => {
                        setShowAddForm((v) => !v);
                        setFlash(null);
                    }}
                >
                    {showAddForm ? "Abbrechen" : "User anlegen"}
                </Button>
            </div>

            {flash ? (
                <div
                    className={[
                        "mb-4 rounded border px-3 py-2 text-sm",
                        flash.kind === "ok"
                            ? "border-success-green/40 bg-success-green/10 text-success-green"
                            : "border-urgent-red/40 bg-urgent-red/10 text-urgent-red",
                    ].join(" ")}
                >
                    {flash.message}
                </div>
            ) : null}

            {showAddForm ? (
                <AddUserForm
                    isPending={isPending}
                    onSubmit={(input) =>
                        runAction(async () => {
                            const res = await createUserAction(input);
                            if (res.ok) {
                                setShowAddForm(false);
                                return { ok: true, message: "User angelegt." };
                            }
                            return res;
                        })
                    }
                />
            ) : null}

            <div className="mt-4 overflow-x-auto">
                <table className="w-full border-separate border-spacing-0 text-sm">
                    <thead>
                        <tr className="text-left text-[10px] uppercase tracking-[0.1em] text-concrete">
                            <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                Name
                            </th>
                            <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                E-Mail
                            </th>
                            <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                Rolle
                            </th>
                            <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                Telefon
                            </th>
                            <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                Status
                            </th>
                            <th className="border-b border-concrete/20 px-3 py-2 font-bold">
                                Aktionen
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {profiles.length === 0 ? (
                            <tr>
                                <td
                                    colSpan={6}
                                    className="px-3 py-6 text-center text-foreground/50"
                                >
                                    Noch keine User im System. Leg den ersten Account über „User anlegen“ an.
                                </td>
                            </tr>
                        ) : (
                            profiles.map((profile) => {
                                const isEditing = editingId === profile.id;
                                return (
                                    <tr
                                        key={profile.id}
                                        className="text-foreground/90"
                                    >
                                        {isEditing ? (
                                            <EditRow
                                                profile={profile}
                                                isPending={isPending}
                                                onCancel={() => setEditingId(null)}
                                                onSubmit={(patch) =>
                                                    runAction(async () => {
                                                        const res = await updateProfileAction({
                                                            userId: profile.id,
                                                            ...patch,
                                                        });
                                                        if (res.ok) {
                                                            setEditingId(null);
                                                            return {
                                                                ok: true,
                                                                message: "Profil aktualisiert.",
                                                            };
                                                        }
                                                        return res;
                                                    })
                                                }
                                            />
                                        ) : (
                                            <DisplayRow
                                                profile={profile}
                                                isPending={isPending}
                                                onEdit={() => {
                                                    setEditingId(profile.id);
                                                    setFlash(null);
                                                }}
                                                onToggleActive={() =>
                                                    runAction(async () => {
                                                        const res = await setUserActiveAction(
                                                            profile.id,
                                                            !profile.is_active,
                                                        );
                                                        if (res.ok) {
                                                            return {
                                                                ok: true,
                                                                message: profile.is_active
                                                                    ? "User deaktiviert."
                                                                    : "User reaktiviert.",
                                                            };
                                                        }
                                                        return res;
                                                    })
                                                }
                                            />
                                        )}
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
}

// --------------------------------------------------------------------
// Anlege-Formular
// --------------------------------------------------------------------

type AddUserInput = {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
};

function AddUserForm({
    isPending,
    onSubmit,
}: {
    isPending: boolean;
    onSubmit: (input: AddUserInput) => void;
}) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [name, setName] = useState("");
    const [role, setRole] = useState<UserRole>("volunteer");
    const [phone, setPhone] = useState("");

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        onSubmit({ email, password, name, role, phone });
    }

    return (
        <form
            onSubmit={handleSubmit}
            className="grid gap-3 rounded-lg border border-concrete/20 bg-background/40 p-4 md:grid-cols-2"
        >
            <Input
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Max Mustermann"
            />
            <Input
                label="E-Mail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="max@example.com"
            />
            <Input
                label="Passwort (min. 8 Zeichen)"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
            />
            <Select
                label="Rolle"
                value={role}
                onChange={(e) => setRole(e.target.value as UserRole)}
                required
            >
                {ROLE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </Select>
            <Input
                label="Telefon (optional)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+41 79 123 45 67"
            />
            <div className="flex items-end">
                <Button type="submit" disabled={isPending}>
                    {isPending ? "Anlegen…" : "User anlegen"}
                </Button>
            </div>
        </form>
    );
}

// --------------------------------------------------------------------
// Anzeige-Zeile
// --------------------------------------------------------------------

function DisplayRow({
    profile,
    isPending,
    onEdit,
    onToggleActive,
}: {
    profile: Profile;
    isPending: boolean;
    onEdit: () => void;
    onToggleActive: () => void;
}) {
    return (
        <>
            <td className="border-b border-concrete/10 px-3 py-3 font-bold">
                {profile.name || <span className="text-concrete">—</span>}
            </td>
            <td className="border-b border-concrete/10 px-3 py-3 text-foreground/70">
                {profile.email}
            </td>
            <td className="border-b border-concrete/10 px-3 py-3">
                <RoleBadge role={profile.role} />
            </td>
            <td className="border-b border-concrete/10 px-3 py-3 text-foreground/70">
                {profile.phone || <span className="text-concrete">—</span>}
            </td>
            <td className="border-b border-concrete/10 px-3 py-3">
                <StatusBadge
                    label={profile.is_active ? "Aktiv" : "Deaktiviert"}
                    variant={profile.is_active ? "active" : "inactive"}
                />
            </td>
            <td className="border-b border-concrete/10 px-3 py-3">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={onEdit}
                        disabled={isPending}
                        className="text-xs font-bold uppercase tracking-[0.08em] text-signal-yellow hover:underline disabled:text-concrete"
                    >
                        Bearbeiten
                    </button>
                    <span className="text-concrete/40">·</span>
                    <button
                        type="button"
                        onClick={onToggleActive}
                        disabled={isPending}
                        className={[
                            "text-xs font-bold uppercase tracking-[0.08em] hover:underline disabled:text-concrete",
                            profile.is_active
                                ? "text-urgent-red"
                                : "text-success-green",
                        ].join(" ")}
                    >
                        {profile.is_active ? "Deaktivieren" : "Reaktivieren"}
                    </button>
                </div>
            </td>
        </>
    );
}

// --------------------------------------------------------------------
// Inline-Edit-Zeile
// --------------------------------------------------------------------

function EditRow({
    profile,
    isPending,
    onCancel,
    onSubmit,
}: {
    profile: Profile;
    isPending: boolean;
    onCancel: () => void;
    onSubmit: (patch: { name: string; role: UserRole; phone: string }) => void;
}) {
    // profile.name darf null sein (Seed ohne Namen, frisch angelegte User) —
    // ohne ?? "" würde React den Input als uncontrolled starten und beim ersten
    // Tastendruck "controlled → uncontrolled"-Warnung loggen.
    const [name, setName] = useState(profile.name ?? "");
    const [role, setRole] = useState<UserRole>(profile.role);
    const [phone, setPhone] = useState(profile.phone ?? "");

    return (
        <>
            <td className="border-b border-concrete/10 px-3 py-2">
                <input
                    className="w-full rounded border border-concrete/30 bg-background px-2 py-1 text-sm focus:border-signal-yellow focus:outline-none"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
            </td>
            <td className="border-b border-concrete/10 px-3 py-2 text-foreground/50">
                {profile.email}
            </td>
            <td className="border-b border-concrete/10 px-3 py-2">
                <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full rounded border border-concrete/30 bg-background px-2 py-1 text-sm focus:border-signal-yellow focus:outline-none"
                >
                    {ROLE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                            {opt.label}
                        </option>
                    ))}
                </select>
            </td>
            <td className="border-b border-concrete/10 px-3 py-2">
                <input
                    className="w-full rounded border border-concrete/30 bg-background px-2 py-1 text-sm focus:border-signal-yellow focus:outline-none"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="—"
                />
            </td>
            <td className="border-b border-concrete/10 px-3 py-2 text-foreground/40">
                {/* Status wird hier nicht editiert, um das Deaktivieren klar
                    über den eigenen Button zu halten. */}
                —
            </td>
            <td className="border-b border-concrete/10 px-3 py-2">
                <div className="flex gap-2">
                    <button
                        type="button"
                        onClick={() => onSubmit({ name, role, phone })}
                        disabled={isPending}
                        className="text-xs font-bold uppercase tracking-[0.08em] text-signal-yellow hover:underline disabled:text-concrete"
                    >
                        Speichern
                    </button>
                    <span className="text-concrete/40">·</span>
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isPending}
                        className="text-xs font-bold uppercase tracking-[0.08em] text-foreground/70 hover:underline disabled:text-concrete"
                    >
                        Abbrechen
                    </button>
                </div>
            </td>
        </>
    );
}
