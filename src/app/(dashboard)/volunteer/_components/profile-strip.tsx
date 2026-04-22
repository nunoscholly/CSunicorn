// Profil-Leiste ganz oben auf der Volunteer-Seite (§3.1).
// Avatar (oder Initialen), Name, Status-Badge, und — falls eingeteilt — der
// Name des aktuellen Tasks.

import { StatusBadge } from "@/components/status-badge";

type ProfileStripProps = {
    name: string;
    avatarUrl: string | null;
    activeTaskName: string | null;
};

export function ProfileStrip({
    name,
    avatarUrl,
    activeTaskName,
}: ProfileStripProps) {
    const isAssigned = activeTaskName !== null;

    // Initialen als Fallback, wenn kein Bild hochgeladen wurde.
    const initials = name
        .split(" ")
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <section className="flex items-center gap-4 rounded-xl border border-concrete/20 bg-surface p-5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-background text-lg font-bold text-signal-yellow">
                {avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={avatarUrl}
                        alt={name}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span>{initials || "?"}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <h1 className="truncate text-xl font-bold">{name || "Unbenannt"}</h1>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                    <StatusBadge
                        label={isAssigned ? "Eingeteilt" : "Verfügbar"}
                        variant={isAssigned ? "success" : "warning"}
                    />
                    {activeTaskName ? (
                        <span className="text-sm text-foreground/70">
                            {activeTaskName}
                        </span>
                    ) : (
                        <span className="text-sm text-foreground/60">
                            Wähle unten einen Task aus.
                        </span>
                    )}
                </div>
            </div>
        </section>
    );
}
