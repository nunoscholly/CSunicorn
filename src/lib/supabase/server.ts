// Supabase-Client für Server Components, Route Handlers und Server Actions.
// Liest/schreibt die Session-Cookies über next/headers, damit die Auth-Session
// über Requests hinweg gültig bleibt. Benutzt NUR den anon-Key — Row Level
// Security bleibt aktiv.

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createSupabaseServerClient() {
    // cookies() ist in Next 15/16 asynchron — await ist zwingend.
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    // In Server Components kann das Setzen von Cookies fehlschlagen
                    // (nicht erlaubt ausserhalb von Actions/Route Handlers). Wir
                    // schlucken den Fehler bewusst — das Refresh-Cookie wird dann
                    // von der Middleware beim nächsten Request gesetzt.
                    try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // no-op: bei read-only-Kontexten erwartet und unkritisch
                    }
                },
            },
        },
    );
}
