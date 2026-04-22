// Login-Formular für die Root-Route. Ruft supabase.auth.signInWithPassword
// direkt aus dem Browser auf — @supabase/ssr setzt die Session-Cookies,
// unser Proxy hält sie warm. Nach erfolgreichem Login wird die Rolle aus
// der profiles-Tabelle geholt und der User auf den korrekten Dashboard-
// Pfad weitergeleitet.

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { UserRole } from "@/lib/supabase/types";

// Rollenspezifische Startseite. Admin landet bewusst auf /admin (nicht auf
// /project), damit die Test-Flows deterministisch sind.
const ROLE_HOME: Record<UserRole, string> = {
    admin: "/admin",
    pm: "/project",
    lead: "/lead",
    volunteer: "/volunteer",
};

export function LoginForm() {
    const router = useRouter();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError(null);

        startTransition(async () => {
            const supabase = createSupabaseBrowserClient();

            const { data, error: signInError } = await supabase.auth.signInWithPassword({
                email: email.trim().toLowerCase(),
                password,
            });

            if (signInError || !data.user) {
                // Klartext-Fehlermeldung. Passwort leeren, E-Mail behalten —
                // so wie es docs/visualizations.md §0 verlangt.
                setError("Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen.");
                setPassword("");
                return;
            }

            // Rolle + is_active nachladen, damit deaktivierte Accounts erst
            // gar nicht ins Dashboard gelangen.
            const { data: profile } = await supabase
                .from("profiles")
                .select("role, is_active")
                .eq("id", data.user.id)
                .single<{ role: UserRole; is_active: boolean }>();

            if (!profile) {
                setError("Kein Profil gefunden. Bitte an einen Admin wenden.");
                await supabase.auth.signOut();
                return;
            }
            if (!profile.is_active) {
                setError("Account ist deaktiviert.");
                await supabase.auth.signOut();
                return;
            }

            // router.replace statt push: nach Login soll der Back-Button nicht
            // auf die Login-Seite führen. refresh() zieht die neuen Server-
            // Component-Daten mit den frischen Session-Cookies.
            router.replace(ROLE_HOME[profile.role]);
            router.refresh();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-72 flex-col gap-4">
            <input
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="rounded-md border border-concrete/30 bg-surface px-4 py-2 text-foreground focus:border-signal-yellow focus:outline-none"
            />
            <input
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="rounded-md border border-concrete/30 bg-surface px-4 py-2 text-foreground focus:border-signal-yellow focus:outline-none"
            />
            <Button type="submit" disabled={isPending} className="w-full">
                {isPending ? "Melde an…" : "Anmelden"}
            </Button>
            {error ? (
                <p className="text-center text-sm text-urgent-red">{error}</p>
            ) : null}
        </form>
    );
}
