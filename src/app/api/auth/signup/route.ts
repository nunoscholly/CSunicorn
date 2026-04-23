// POST /api/auth/signup — Server-seitige Registrierung.
// Erstellt einen Supabase-Auth-User. Der DB-Trigger handle_new_user()
// legt automatisch eine profiles-Zeile an. Die Session wird direkt
// auf der Response gesetzt, sodass der User nach dem Signup eingeloggt ist.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Einfache E-Mail-Prüfung: lokal@domain.tld. Reicht als Sanity-Check, die
// echte Validierung macht Supabase beim Signup selbst.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Mindestlänge spiegelt die Vorgabe aus der Admin-Action (admin/actions.ts).
const MIN_PASSWORD_LENGTH = 8;

export async function POST(request: Request) {
    // Body robust parsen — malformed JSON soll 400, nicht 500 liefern.
    let body: unknown;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            { error: "Ungültiger Request-Body." },
            { status: 400 },
        );
    }

    if (!body || typeof body !== "object") {
        return NextResponse.json(
            { error: "Ungültiger Request-Body." },
            { status: 400 },
        );
    }

    const { email, password, name } = body as Record<string, unknown>;

    // Typ- und Shape-Check bevor wir weitermachen.
    if (typeof email !== "string" || typeof password !== "string") {
        return NextResponse.json(
            { error: "E-Mail und Passwort sind erforderlich." },
            { status: 400 },
        );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail)) {
        return NextResponse.json(
            { error: "Ungültige E-Mail-Adresse." },
            { status: 400 },
        );
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return NextResponse.json(
            { error: `Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.` },
            { status: 400 },
        );
    }

    const cookieStore = await cookies();

    // SSR-Client für signUp — setzt Session-Cookies auf der Response.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name: cookieName, value, options }) => {
                        cookieStore.set(cookieName, value, options);
                    });
                },
            },
        },
    );

    // Rolle wird serverseitig fest auf "volunteer" gesetzt. Admin-/Lead-/PM-
    // Accounts werden ausschliesslich über die Admin-Seite angelegt (siehe
    // admin/actions.ts). Andernfalls könnte ein beliebiger Client per
    // Signup-Request einen Admin-Account erzeugen (Privilege Escalation).
    const { data, error } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
            data: {
                name: typeof name === "string" ? name : "",
                role: "volunteer",
            },
        },
    });

    if (error || !data.user) {
        return NextResponse.json(
            { error: error?.message || "Registrierung fehlgeschlagen." },
            { status: 400 },
        );
    }

    return NextResponse.json({
        user: {
            id: data.user.id,
            email: data.user.email,
            role: "volunteer",
        },
    });
}
