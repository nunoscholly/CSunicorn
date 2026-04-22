// Nachricht an Team-Leads schicken (§1.6). Entweder an alle Leads als
// Broadcast oder an eine bestimmte Person. Darunter ein Log der letzten
// Nachrichten, die *dieser* PM verschickt hat — nützlich zum Tracking,
// was wann kommuniziert wurde.

"use client";

import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Select, Textarea } from "@/components/ui/input";
import { sendNotificationAction } from "../actions";

type LeadOption = {
    id: string;
    name: string;
};

export type SentNotification = {
    id: string;
    message: string;
    to_role: string | null;
    to_user_id: string | null;
    recipientLabel: string; // bereits auf dem Server zu "Alle Leads" oder Name aufgelöst
    created_at: string;
};

type NotificationComposerProps = {
    leads: LeadOption[];
    sentLog: SentNotification[];
};

export function NotificationComposer({
    leads,
    sentLog,
}: NotificationComposerProps) {
    const [recipient, setRecipient] = useState<string>("all_leads");
    const [message, setMessage] = useState("");
    const [flash, setFlash] = useState<
        { kind: "ok" | "error"; message: string } | null
    >(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setFlash(null);

        startTransition(async () => {
            const res = await sendNotificationAction({ recipient, message });
            if (res.ok) {
                setFlash({ kind: "ok", message: "Nachricht verschickt." });
                setMessage("");
            } else {
                setFlash({ kind: "error", message: res.error });
            }
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Nachricht an Team-Leads</h2>
                <p className="text-sm text-foreground/60">
                    Broadcast an alle oder gezielt an eine Person. Leads sehen sie im Feed.
                </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-3">
                <Select
                    label="Empfänger"
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                >
                    <option value="all_leads">Alle Team-Leads</option>
                    {leads.map((lead) => (
                        <option key={lead.id} value={`user:${lead.id}`}>
                            {lead.name}
                        </option>
                    ))}
                </Select>
                <Textarea
                    label="Nachricht"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={500}
                    placeholder="3 Personen sofort an Stage B. Treffpunkt Lager-Tor."
                />
                <div className="flex items-center gap-3">
                    <Button type="submit" disabled={isPending || !message.trim()}>
                        {isPending ? "Sende…" : "Verschicken"}
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

            <div className="mt-6">
                <h3 className="mb-2 text-[10px] font-bold uppercase tracking-[0.1em] text-concrete">
                    Zuletzt verschickt
                </h3>
                {sentLog.length === 0 ? (
                    <p className="rounded border border-concrete/20 bg-background/40 px-3 py-3 text-sm text-foreground/50">
                        Noch nichts gesendet.
                    </p>
                ) : (
                    <ul className="space-y-2">
                        {sentLog.map((n) => (
                            <li
                                key={n.id}
                                className="rounded border border-concrete/20 bg-background/40 px-3 py-2 text-sm"
                            >
                                <div className="flex items-center justify-between gap-3 text-xs text-concrete">
                                    <span className="font-bold uppercase tracking-[0.08em]">
                                        an {n.recipientLabel}
                                    </span>
                                    <time dateTime={n.created_at}>
                                        {formatRelative(n.created_at)}
                                    </time>
                                </div>
                                <p className="mt-1 text-foreground/90">{n.message}</p>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </section>
    );
}

// Sehr schlichte Relativ-Zeit. Keine Bibliothek, weil wir minütlich-stündlich-
// täglich ausreichen.
function formatRelative(iso: string) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffSec = Math.round((now - then) / 1000);
    if (diffSec < 60) return "gerade eben";
    if (diffSec < 3600) return `vor ${Math.floor(diffSec / 60)} Min.`;
    if (diffSec < 86400) return `vor ${Math.floor(diffSec / 3600)} Std.`;
    return `vor ${Math.floor(diffSec / 86400)} Tg.`;
}
