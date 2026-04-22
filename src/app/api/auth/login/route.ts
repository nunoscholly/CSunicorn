// POST /api/auth/login — Server-seitige Anmeldung.
// Setzt die Session-Cookies serverseitig, damit der Proxy (middleware) und
// alle Server Components die Session sofort sehen. Zuverlässiger als
// rein client-seitiges signInWithPassword, weil die Cookies direkt auf
// der Response landen.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
        return NextResponse.json(
            { error: "E-Mail und Passwort sind erforderlich." },
            { status: 400 },
        );
    }

    const cookieStore = await cookies();

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
        email: email.trim().toLowerCase(),
        password,
    });

    if (error || !data.user) {
        return NextResponse.json(
            { error: "Anmeldung fehlgeschlagen. E-Mail und Passwort prüfen." },
            { status: 401 },
        );
    }

    // Profil laden: Rolle und Aktiv-Status prüfen
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", data.user.id)
        .single();

    if (!profile) {
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
