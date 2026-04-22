// Supabase-Client für Client Components (Browser). Liest die Session aus
// den Cookies, die Middleware + Server-Client gesetzt haben. Nutzt den
// anon-Key — niemals den Service-Role-Key im Browser exponieren!

import { createBrowserClient } from "@supabase/ssr";

export function createSupabaseBrowserClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
}
