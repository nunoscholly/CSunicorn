// Team-Switcher für Admins auf /lead.
// Admin kann jedes Team inspizieren (Read-Only-Blick laut Rollen-Matrix
// in docs/user_profiles.md). Auswahl landet als ?team=<id> in der URL,
// damit die Server-Component beim nächsten Render das passende Team lädt.

"use client";

import { useRouter } from "next/navigation";
import { useTransition, type ChangeEvent } from "react";
import { labelClass } from "@/components/ui/input";

type AdminTeamPickerProps = {
    teams: Array<{ id: string; name: string; zone: string }>;
    selectedTeamId: string;
};

export function AdminTeamPicker({
    teams,
    selectedTeamId,
}: AdminTeamPickerProps) {
    const router = useRouter();
    // useTransition hält den Picker reaktionsfähig, während der
    // Server-Render läuft — ohne das fühlte sich der Wechsel eingefroren an.
    const [isPending, startTransition] = useTransition();

    function handleChange(event: ChangeEvent<HTMLSelectElement>) {
        const nextId = event.target.value;
        if (nextId === selectedTeamId) return;
        startTransition(() => {
            // replace statt push: Back-Button soll den Admin nicht durch
            // jede Team-Auswahl zurückklicken lassen.
            router.replace(`/lead?team=${encodeURIComponent(nextId)}`);
            router.refresh();
        });
    }

    return (
        <label className="flex flex-col gap-1">
            <span className={labelClass}>Team wählen</span>
            <select
                aria-label="Team auswählen"
                value={selectedTeamId}
                onChange={handleChange}
                disabled={isPending}
                className="rounded-md border border-concrete/30 bg-surface px-3 py-2 text-sm text-foreground focus:border-signal-yellow focus:outline-none disabled:opacity-60"
            >
                {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                        {t.name} · {t.zone}
                    </option>
                ))}
            </select>
        </label>
    );
}
