// Layout für alle eingeloggten Views. Macht zwei Dinge:
//   1. Route-Guard: keine Session oder inaktiver User → zurück zur Login-Seite.
//   2. Rendert die Nav-Leiste mit Name + Rollen-Badge.
// Rollen-spezifische Berechtigungen (z. B. "nur Admin darf /admin") prüft
// die jeweilige Seite selbst als erste Anweisung im Server Component.

import { redirect } from "next/navigation";
import { NavBar } from "@/components/nav-bar";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const supabase = await createSupabaseServerClient();

    // Session + User prüfen. getUser() validiert das Token serverseitig gegen
    // Supabase — robuster als nur getSession() aus dem Cookie-Cache.
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        redirect("/");
    }

    // Profil holen: wir brauchen Name, Rolle und is_active.
    const { data: profile } = await supabase
        .from("profiles")
        .select("id, name, email, role, is_active")
        .eq("id", user.id)
        .single<Pick<Profile, "id" | "name" | "email" | "role" | "is_active">>();

    // Deaktivierter Account → direkt raus. So bleibt eine spätere Reaktivierung
    // durch einen Admin möglich, ohne dass der User parallel die App bedient.
    if (!profile || !profile.is_active) {
        await supabase.auth.signOut();
        redirect("/");
    }

    return (
        <div className="flex min-h-screen flex-col">
            <NavBar
                name={profile.name || profile.email}
                role={profile.role}
            />
            <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
                {children}
            </main>
        </div>
    );
}
