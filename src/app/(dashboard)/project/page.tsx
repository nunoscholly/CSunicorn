// Projekt-Management Dashboard (/project). Zugriff nur für PM und Admin.
// Platzhalter — wird in Phase 2 mit Stat-Cards, ML-Forecast-Chart,
// Fortschrittsbalken und Aufgabenformular ausgebaut (docs/visualizations.md §1).

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export const metadata = {
    title: "Projekt-Management · START CREW",
};

export const dynamic = "force-dynamic";

export default async function ProjectPage() {
    const supabase = await createSupabaseServerClient();

    // Rollen-Guard: nur PM und Admin dürfen diese Seite sehen.
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single<Pick<Profile, "role">>();

    if (!profile || !["admin", "pm"].includes(profile.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Projekt-Management</h1>
                <p className="text-sm text-foreground/60">
                    Echtzeit-Übersicht über Bemanning, Aufgaben und ML-Prognosen.
                </p>
            </header>

            <div className="rounded-lg border border-concrete/20 bg-surface p-8 text-center">
                <p className="text-lg font-bold text-signal-yellow">Wird gebaut</p>
                <p className="mt-2 text-sm text-foreground/60">
                    Stat-Cards, ML-Forecast-Chart, Fortschrittsbalken und
                    Aufgabenformular kommen in Phase 2.
                </p>
            </div>
        </div>
    );
}
