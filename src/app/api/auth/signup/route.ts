// POST /api/auth/signup — Server-seitige Registrierung.
// Erstellt einen Supabase-Auth-User. Der DB-Trigger handle_new_user()
// legt automatisch eine profiles-Zeile an. Die Session wird direkt
// auf der Response gesetzt, sodass der User nach dem Signup eingeloggt ist.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    const body = await request.json();
    const { email, password, name, role } = body;

    if (!email || !password) {
        return NextResponse.json(
            { error: "E-Mail und Passwort sind erforderlich." },
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

    // Registrierung bei Supabase Auth. Name und Rolle gehen als
    // user_metadata mit — der DB-Trigger liest sie aus raw_user_meta_data.
    const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
            data: {
                name: name || "",
                role: role || "volunteer",
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
            role: role || "volunteer",
        },
    });
}
