// Login-Formular für die Root-Route. Sendet Credentials an /api/auth/login,
// wo die Session-Cookies serverseitig gesetzt werden. Nach erfolgreichem
// Login wird der User auf den korrekten Dashboard-Pfad weitergeleitet.

"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import type { UserRole } from "@/lib/supabase/types";

// Die Login-Inputs sind bewusst roh (nicht der Input-Wrapper) — daher
// dieselbe Logik wie in components/ui/input.tsx inline: native HTML5-
// Validierung in deutsch statt "Please fill in this field." (UX-S3).
function applyGermanValidity(target: HTMLInputElement) {
    const v = target.validity;
    if (v.valid) {
        target.setCustomValidity("");
        return;
    }
    if (v.valueMissing) {
        target.setCustomValidity("Bitte ausfüllen.");
        return;
    }
    if (v.typeMismatch && target.type === "email") {
        target.setCustomValidity("Bitte eine gültige E-Mail eingeben.");
        return;
    }
    target.setCustomValidity("Bitte Eingabe prüfen.");
}

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
            // Server-Route kümmert sich um Auth + Cookie-Handling
            const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
            });

            const data = await response.json();

            if (!response.ok || !data.user) {
                // Klartext-Fehlermeldung. Passwort leeren, E-Mail behalten —
                // so wie es docs/visualizations.md §0 verlangt.
                setError(data.error || "Anmeldung fehlgeschlagen.");
                setPassword("");
                return;
            }

            const role = data.user.role as UserRole;

            // router.replace statt push: nach Login soll der Back-Button nicht
            // auf die Login-Seite führen. refresh() zieht die neuen Server-
            // Component-Daten mit den frischen Session-Cookies. Fallback auf
            // /volunteer, falls das Profil eine unbekannte Rolle liefert —
            // so landet niemand auf /undefined.
            router.replace(ROLE_HOME[role] ?? "/volunteer");
            router.refresh();
        });
    }

    return (
        <form onSubmit={handleSubmit} className="flex w-72 flex-col gap-4">
            {/* Sichtbare Labels sind hier unerwünscht (minimaler Login-Look),
                aber Screenreader brauchen sie. Daher mit sr-only ausblenden. */}
            <label htmlFor="login-email" className="sr-only">
                E-Mail
            </label>
            <input
                id="login-email"
                name="email"
                type="email"
                placeholder="E-Mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onInvalid={(e) => applyGermanValidity(e.currentTarget)}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
                required
                autoComplete="email"
                className="rounded-md border border-concrete/30 bg-surface px-4 py-2 text-foreground focus:border-signal-yellow focus:outline-none"
            />
            <label htmlFor="login-password" className="sr-only">
                Passwort
            </label>
            <input
                id="login-password"
                name="current-password"
                type="password"
                placeholder="Passwort"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onInvalid={(e) => applyGermanValidity(e.currentTarget)}
                onInput={(e) => e.currentTarget.setCustomValidity("")}
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
