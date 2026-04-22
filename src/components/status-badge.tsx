// Pill-förmiges Label für Rollen, Status, Urgency etc.
// Farbcodierung folgt docs/brand_guidelines.md → "Status Badges".

import type { UserRole } from "@/lib/supabase/types";

type Variant =
    | "admin"
    | "pm"
    | "lead"
    | "volunteer"
    | "active"
    | "inactive"
    | "urgent"
    | "warning"
    | "success"
    | "neutral";

// Semantische Farbzuordnung. Rollen-Badges nach docs/visualizations.md:
// Admin=grün, PM=gelb, Lead=lila, Volunteer=blau.
const VARIANT_CLASSES: Record<Variant, string> = {
    admin: "bg-success-green/15 text-success-green",
    pm: "bg-signal-yellow/15 text-signal-yellow",
    lead: "bg-[#a855f7]/20 text-[#c084fc]",
    volunteer: "bg-[#3b82f6]/20 text-[#60a5fa]",
    active: "bg-success-green/15 text-success-green",
    inactive: "bg-concrete/20 text-concrete",
    urgent: "bg-urgent-red/15 text-urgent-red",
    warning: "bg-signal-yellow/15 text-signal-yellow",
    success: "bg-success-green/15 text-success-green",
    neutral: "bg-white/10 text-foreground/70",
};

type StatusBadgeProps = {
    label: string;
    variant: Variant;
};

export function StatusBadge({ label, variant }: StatusBadgeProps) {
    return (
        <span
            className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.08em] ${VARIANT_CLASSES[variant]}`}
        >
            {label}
        </span>
    );
}

// Bequemer Shortcut: Rolle → deutsches Label + Variante.
// Zentrale Stelle, damit die Darstellung über alle Views konsistent bleibt.
export function RoleBadge({ role }: { role: UserRole }) {
    const labels: Record<UserRole, string> = {
        admin: "Admin",
        pm: "PM",
        lead: "Team-Lead",
        volunteer: "Volunteer",
    };
    return <StatusBadge label={labels[role]} variant={role} />;
}
