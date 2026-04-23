// Updates-Feed (§2.1): Liste aller Nachrichten an diesen Lead.
// Ungelesene Items werden fett, mit gelbem Dot angezeigt. Klick markiert
// sie serverseitig als gelesen und zieht die Seite neu.

"use client";

import { useTransition } from "react";
import { markNotificationReadAction } from "../actions";

export type LeadNotification = {
    id: string;
    message: string;
    from: string; // vom Server aufgelöster Name
    is_read: boolean;
    created_at: string;
};

type UpdatesFeedProps = {
    notifications: LeadNotification[];
};

export function UpdatesFeed({ notifications }: UpdatesFeedProps) {
    const [isPending, startTransition] = useTransition();

    function handleClick(id: string, isRead: boolean) {
        // Schon gelesen → nichts tun, damit wir die DB nicht unnötig belasten.
        if (isRead) return;
        startTransition(async () => {
            await markNotificationReadAction(id);
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4 flex items-baseline justify-between">
                <div>
                    <h2 className="text-lg font-bold">Updates</h2>
                    <p className="text-sm text-foreground/60">
                        Nachrichten vom PM. Klick markiert als gelesen.
                    </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-concrete">
                    {notifications.filter((n) => !n.is_read).length} ungelesen
                </span>
            </div>

            {notifications.length === 0 ? (
                <p className="rounded border border-concrete/20 bg-background/40 px-3 py-6 text-center text-sm text-foreground/50">
                    Noch keine Nachrichten.
                </p>
            ) : (
                <ul className="space-y-2">
                    {notifications.map((n) => (
                        <li key={n.id}>
                            <button
                                type="button"
                                onClick={() => handleClick(n.id, n.is_read)}
                                disabled={isPending && !n.is_read}
                                // aria-label reicht den Lese-Status an
                                // Screenreader durch — der gelbe Dot allein
                                // genügt für AT nicht (A11Y-S10).
                                aria-label={
                                    n.is_read ? "Gelesen" : "Ungelesen"
                                }
                                className={[
                                    "group flex w-full items-start gap-3 rounded border px-3 py-2 text-left transition-colors",
                                    n.is_read
                                        ? "border-concrete/20 bg-background/40 text-foreground/70"
                                        : "border-signal-yellow/40 bg-signal-yellow/5 text-foreground hover:bg-signal-yellow/10",
                                ].join(" ")}
                            >
                                {/* Status-Dot: gelb = ungelesen, grau = gelesen */}
                                <span
                                    className={[
                                        "mt-1.5 inline-block h-2 w-2 shrink-0 rounded-full",
                                        n.is_read
                                            ? "bg-concrete"
                                            : "bg-signal-yellow",
                                    ].join(" ")}
                                />
                                <div className="flex-1">
                                    <div className="flex items-baseline justify-between gap-3 text-xs text-concrete">
                                        <span className="font-bold uppercase tracking-[0.08em]">
                                            von {n.from}
                                        </span>
                                        <time dateTime={n.created_at}>
                                            {formatRelative(n.created_at)}
                                        </time>
                                    </div>
                                    <p
                                        className={[
                                            "mt-1 text-sm",
                                            n.is_read ? "font-normal" : "font-bold",
                                        ].join(" ")}
                                    >
                                        {n.message}
                                    </p>
                                </div>
                            </button>
                        </li>
                    ))}
                </ul>
            )}
        </section>
    );
}

function formatRelative(iso: string) {
    const now = Date.now();
    const then = new Date(iso).getTime();
    const diffSec = Math.round((now - then) / 1000);
    if (diffSec < 60) return "jetzt";
    if (diffSec < 3600) return `vor ${Math.floor(diffSec / 60)} Min.`;
    if (diffSec < 86400) return `vor ${Math.floor(diffSec / 3600)} Std.`;
    return `vor ${Math.floor(diffSec / 86400)} Tg.`;
}
