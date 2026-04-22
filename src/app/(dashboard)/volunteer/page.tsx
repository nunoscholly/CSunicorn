// Volunteer-Portal (/volunteer). Zugriff nur für Volunteers und Admin.
// Platzhalter — wird in Phase 2 mit Profil-Leiste, Sektor-Karte,
// offene-Jobs-Feed und Commit-Button ausgebaut (docs/visualizations.md §3).

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export const metadata = {
    title: "Volunteer · START CREW",
};

export const dynamic = "force-dynamic";

export default async function VolunteerPage() {
    const supabase = await createSupabaseServerClient();

    // Rollen-Guard: nur Volunteer und Admin dürfen diese Seite sehen.
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, name")
        .eq("id", user.id)
        .single<Pick<Profile, "role" | "name">>();

    if (!profile || !["admin", "volunteer"].includes(profile.role)) {
        redirect("/");
    }

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Volunteer</h1>
                <p className="text-sm text-foreground/60">
                    Finde offene Aufgaben und melde dich an.
                </p>
            </header>

            <div className="rounded-lg border border-concrete/20 bg-surface p-8 text-center">
                <p className="text-lg font-bold text-signal-yellow">Wird gebaut</p>
                <p className="mt-2 text-sm text-foreground/60">
                    Profil-Leiste, Sektor-Karte, offene Jobs und
                    Commit-Button kommen in Phase 2.
                </p>
            </div>
        </div>
    );
}
