// Admin-Seite (/admin). Drei Sektionen gemäss docs/visualizations.md §4:
//   1. User-Verwaltung (anlegen, bearbeiten, deaktivieren)
//   2. Venue-Map-Upload
//   3. Bauplan-Batch-Import (CSV → Tasks)
// Rollen-Check: nur Admin darf rein. Das (dashboard)/layout.tsx hat die
// Session bereits validiert; hier entscheiden wir, ob der eingeloggte User
// tatsächlich Admin ist.

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ConfigRow, Profile } from "@/lib/supabase/types";
import { UserManagement } from "./_components/user-management";
import { VenueMapUpload } from "./_components/venue-map-upload";
import { BatchTaskUpload } from "./_components/batch-task-upload";

export const metadata = {
    title: "Admin · START CREW",
};

// Always fresh — keine statische Generierung. Admin-Daten dürfen nicht
// gecacht über Deploys/Requests hinweg angezeigt werden.
export const dynamic = "force-dynamic";

export default async function AdminPage() {
    const supabase = await createSupabaseServerClient();

    // --- Rollen-Guard -----------------------------------------------------
    // Layout hat Session bereits validiert, aber "Admin bypasses all route
    // guards — role === 'admin' is always the first check" (user_profiles.md).
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single<Pick<Profile, "role">>();

    if (!currentProfile || currentProfile.role !== "admin") {
        // Kein Fehler-Screen, sondern raus zur Login-Seite: Wer kein Admin
        // ist, hat hier auch keinen Lese-Anspruch (RLS würde die Queries
        // unten ohnehin blocken, aber defense-in-depth).
        redirect("/");
    }

    // --- Daten laden ------------------------------------------------------
    // Profile bewusst inkl. deaktivierter Accounts ziehen, damit der Admin
    // sie reaktivieren kann. RLS erlaubt Admins den vollen Lesezugriff.
    const { data: profilesRaw } = await supabase
        .from("profiles")
        .select(
            "id, name, email, role, phone, avatar_url, team_id, is_active, created_at",
        )
        .order("created_at", { ascending: false });
    const profiles = (profilesRaw ?? []) as Profile[];

    const { data: mapConfig } = await supabase
        .from("config")
        .select("key, value, updated_at")
        .eq("key", "venue_map_path")
        .maybeSingle<ConfigRow>();

    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Admin</h1>
                <p className="text-sm text-foreground/60">
                    System-Setup und Datenimport. Alle Änderungen greifen sofort.
                </p>
            </header>

            <UserManagement profiles={profiles} />
            <VenueMapUpload currentPath={mapConfig?.value ?? null} />
            <BatchTaskUpload />
        </div>
    );
}
