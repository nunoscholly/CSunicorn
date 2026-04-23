// Team-Roster (§2.2): Wer ist aktuell eingeteilt?
// Cards mit Avatar, Name, Rolle + Task-Info. Leere Plätze werden als
// gestrichelte Platzhalter angezeigt, damit man auf einen Blick sieht,
// wie weit weg man vom Sollstand ist. Oben drüber ein Coverage-Bar.

import { RoleBadge } from "@/components/status-badge";
import type { UserRole } from "@/lib/supabase/types";

export type RosterMember = {
    assignmentId: string;
    volunteerId: string;
    name: string;
    role: UserRole;
    avatarUrl: string | null;
    taskName: string | null;
    shiftStart: string | null;
    shiftEnd: string | null;
};

type TeamRosterProps = {
    teamName: string | null;
    zone: string | null;
    members: RosterMember[];
    staffed: number;
    required: number;
};

export function TeamRoster({
    teamName,
    zone,
    members,
    staffed,
    required,
}: TeamRosterProps) {
    // Edge-Case: Schicht abgeschlossen (alle Tasks 'complete'). Dann ist
    // required=0 und staffed>0 — wir zeigen den Roster als 100% fertig an,
    // statt "X / 0 besetzt" mit 0% Progress (BUG-2).
    const shiftDone = required === 0 && staffed > 0;
    const coveragePct = shiftDone
        ? 100
        : required > 0
          ? Math.round((staffed / required) * 100)
          : 0;

    // Farbschwelle analog Volunteer-Sektor-Map aus docs/user_profiles.md §Volunteer:
    // < 50 % rot, 50–89 % gelb, ≥ 90 % grün.
    const barColor =
        coveragePct >= 90
            ? "bg-success-green"
            : coveragePct >= 50
              ? "bg-signal-yellow"
              : "bg-urgent-red";

    // Fehlende Plätze = Sollstand minus aktuell besetzt. Nicht negativ machen,
    // falls mehr Volunteers da sind als geplant.
    const emptySlots = Math.max(0, required - members.length);

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4 flex items-baseline justify-between gap-4">
                <div>
                    <h2 className="text-lg font-bold">
                        {teamName ?? "Team"} {zone ? `· ${zone}` : ""}
                    </h2>
                    <p className="text-sm text-foreground/60">
                        Aktuelle Schicht — alle zugewiesenen Volunteers.
                    </p>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-[0.08em] text-concrete">
                    {shiftDone
                        ? `${staffed} Volunteers · Schicht abgeschlossen`
                        : `${staffed} / ${required} besetzt`}
                </span>
            </div>

            {/* Coverage-Bar — Screenreader liest den Prozentwert vor. */}
            <div
                role="progressbar"
                aria-valuenow={coveragePct}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Team-Besetzung: ${coveragePct} Prozent`}
                className="mb-5 h-1.5 overflow-hidden rounded-full bg-track"
            >
                <div
                    className={`h-full ${barColor}`}
                    style={{ width: `${Math.min(100, coveragePct)}%` }}
                />
            </div>

            {members.length === 0 && emptySlots === 0 ? (
                <p className="rounded border border-concrete/20 bg-background/40 px-3 py-6 text-center text-sm text-foreground/50">
                    Aktuell niemand eingeteilt.
                </p>
            ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {members.map((m) => (
                        <MemberCard key={m.assignmentId} member={m} />
                    ))}
                    {Array.from({ length: emptySlots }).map((_, idx) => (
                        <EmptySlotCard key={`empty-${idx}`} />
                    ))}
                </div>
            )}
        </section>
    );
}

function MemberCard({ member }: { member: RosterMember }) {
    // Initialen als Fallback, wenn kein Avatar hochgeladen.
    const initials = member.name
        .split(" ")
        .map((s) => s[0])
        .filter(Boolean)
        .slice(0, 2)
        .join("")
        .toUpperCase();

    return (
        <div className="flex items-start gap-3 rounded-lg border border-concrete/20 bg-background/40 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface text-xs font-bold text-signal-yellow">
                {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                        src={member.avatarUrl}
                        // Fallback-Alt, falls der Profilname fehlt — sonst
                        // bliebe das Bild für Screenreader unsichtbar.
                        alt={
                            member.name
                                ? `Profilbild von ${member.name}`
                                : "Profilbild"
                        }
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <span>{initials || "?"}</span>
                )}
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-bold">
                        {member.name || "Unbenannt"}
                    </span>
                    <RoleBadge role={member.role} />
                </div>
                {member.taskName ? (
                    <p className="mt-0.5 truncate text-xs text-foreground/60">
                        {member.taskName}
                    </p>
                ) : null}
                {member.shiftStart && member.shiftEnd ? (
                    <p className="mt-0.5 text-xs text-concrete">
                        {formatShift(member.shiftStart, member.shiftEnd)}
                    </p>
                ) : null}
            </div>
        </div>
    );
}

function EmptySlotCard() {
    // Bewusst gestrichelt, damit die Lücke ins Auge springt — genau das ist
    // der Zweck der Platzhalter laut docs/visualizations.md §2.2.
    return (
        <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-concrete/30 bg-background/20 p-3 text-xs text-concrete">
            Offener Platz
        </div>
    );
}

function formatShift(start: string, end: string) {
    const s = new Date(start);
    const e = new Date(end);
    const timeFmt = new Intl.DateTimeFormat("de-CH", {
        hour: "2-digit",
        minute: "2-digit",
    });
    return `${timeFmt.format(s)} – ${timeFmt.format(e)}`;
}
