// POST /api/auth/login — Server-seitige Anmeldung.
// Setzt die Session-Cookies serverseitig, damit die Server Components
// auf den Dashboard-Seiten die Session sofort sehen.
//
// Ablauf:
// 1. signInWithPassword über @supabase/ssr → setzt Session-Cookies
// 2. Profil-Abfrage über @supabase/supabase-js mit dem frischen
//    Access-Token (nicht über den SSR-Client, weil der die gerade
//    gesetzten Cookies im selben Request nicht zuverlässig liest).

import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// Einfache E-Mail-Prüfung analog zum Signup — crasht nicht bei Non-String-
// Inputs und gibt 400 statt 500 zurück, wenn der Body kaputt ist.
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
    // Robust parsen: malformed JSON darf nicht in einen 500 laufen.
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

    const { email, password } = body as Record<string, unknown>;

    if (typeof email !== "string" || typeof password !== "string") {
        return NextResponse.json(
            { error: "E-Mail und Passwort sind erforderlich." },
            { status: 400 },
        );
    }

    const normalizedEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(normalizedEmail) || !password) {
        return NextResponse.json(
            { error: "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen." },
            { status: 401 },
        );
    }

    const cookieStore = await cookies();

    // SSR-Client für signInWithPassword — setzt die Session-Cookies
    // auf der Response, damit nachfolgende Seiten-Aufrufe authentifiziert sind.
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options);
                    });
                },
            },
        },
    );

    // Anmeldung gegen Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password,
    });

    if (error || !data.session) {
        return NextResponse.json(
            { error: "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen." },
            { status: 401 },
        );
    }

    // Profil laden: Eigener Client mit dem frischen Access-Token, weil der
    // SSR-Client die gerade gesetzten Cookies im selben Request nicht
    // zuverlässig für PostgREST-Queries nutzen kann (bekanntes @supabase/ssr-Problem).
    const directClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${data.session.access_token}`,
                },
            },
            auth: {
                // Kein Auto-Refresh nötig — einmaliger Aufruf nur für Profil-Query.
                autoRefreshToken: false,
                persistSession: false,
            },
        },
    );

    const { data: profile } = await directClient
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

    if (!profile) {
        // Session aufräumen wenn kein Profil existiert
        await supabase.auth.signOut();
        return NextResponse.json(
            { error: "Kein Profil gefunden. Bitte an einen Admin wenden." },
            { status: 403 },
        );
    }

    if (!profile.is_active) {
        await supabase.auth.signOut();
        return NextResponse.json(
            { error: "Account ist deaktiviert." },
            { status: 403 },
        );
    }

    return NextResponse.json({
        user: {
            id: data.user.id,
            email: data.user.email,
            role: profile.role,
        },
    });
}
