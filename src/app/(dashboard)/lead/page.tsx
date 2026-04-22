// Team-Lead Dashboard (/lead). Zugriff nur für Leads und Admin.
// Platzhalter — wird in Phase 2 mit Updates-Feed, Schicht-Roster,
// Aufgaben-Checkliste und Request-Formular ausgebaut (docs/visualizations.md §2).

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export const metadata = {
    title: "Team-Lead · START CREW",
};

export const dynamic = "force-dynamic";

export default async function LeadPage() {
    const supabase = await createSupabaseServerClient();

    // Rollen-Guard: nur Lead und Admin dürfen diese Seite sehen.
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single<Pick<Profile, "role">>();

    if (!profile || !["admin", "lead"].includes(profile.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Team-Lead</h1>
                <p className="text-sm text-foreground/60">
                    Deine Zone, dein Team, deine Aufgaben.
                </p>
            </header>

            <div className="rounded-lg border border-concrete/20 bg-surface p-8 text-center">
                <p className="text-lg font-bold text-signal-yellow">Wird gebaut</p>
                <p className="mt-2 text-sm text-foreground/60">
                    Updates-Feed, Schicht-Roster, Aufgaben-Checkliste und
                    Leute-anfordern-Formular kommen in Phase 2.
                </p>
            </div>
        </div>
    );
}
