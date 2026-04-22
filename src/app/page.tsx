// Login-Seite (/). Wer bereits eingeloggt ist, wird direkt aufs Dashboard
// der eigenen Rolle geschickt — so muss niemand doppelt klicken.

import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import { LoginForm } from "./_components/login-form";

// Pfade identisch zur Login-Form gehalten, damit es eine einzige Quelle der
// Wahrheit gibt, falls wir später Routen umbenennen.
const ROLE_HOME: Record<UserRole, string> = {
    admin: "/admin",
    pm: "/project",
    lead: "/lead",
    volunteer: "/volunteer",
};

export const dynamic = "force-dynamic";

export default async function Home() {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // Bereits eingeloggter User → direkt ins passende Dashboard.
    if (user) {
        const { data: profile } = await supabase
            .from("profiles")
            .select("role, is_active")
            .eq("id", user.id)
            .single<{ role: UserRole; is_active: boolean }>();

        if (profile?.is_active) {
            redirect(ROLE_HOME[profile.role]);
        }
        // Ohne Profil oder deaktiviert → Session kappen, User zeigt dann die
        // Login-Maske. Der signOut-Call läuft beim nächsten Server-Action.
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
            <main className="flex flex-col items-center gap-8">
                <Logo />
                <p className="text-center text-sm text-concrete">
                    Build week runs on START CREW.
                </p>
                <LoginForm />
            </main>
        </div>
    );
}
