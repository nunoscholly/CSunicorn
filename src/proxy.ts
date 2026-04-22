// Next.js Proxy (früher "Middleware"): frischt bei jedem Request die Supabase-
// Session-Cookies auf. Ohne das läuft die Session nach ~1 Stunde ab, auch
// wenn der User aktiv ist. Der Proxy selbst lässt die Requests durch — der
// eigentliche Route-Guard lebt im (dashboard)/layout.tsx.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
    // Response-Objekt, in das wir aktualisierte Cookies schreiben können.
    let response = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    // Cookies sowohl auf dem Request (für nachfolgende Reads in
                    // diesem Proxy) als auch auf der Response (für den Browser
                    // des Users) setzen.
                    cookiesToSet.forEach(({ name, value }) => {
                        request.cookies.set(name, value);
                    });
                    response = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) => {
                        response.cookies.set(name, value, options);
                    });
                },
            },
        },
    );

    // Aufruf zwingt @supabase/ssr dazu, die Session zu validieren und bei
    // Bedarf frische Cookies zu setzen. Das Ergebnis selbst ignorieren wir.
    await supabase.auth.getUser();

    return response;
}

export const config = {
    // Proxy für alles ausser Next.js-internen Pfaden und statischen Assets.
    matcher: [
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
    ],
};
