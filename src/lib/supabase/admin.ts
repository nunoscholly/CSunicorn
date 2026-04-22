// Admin-Client mit Service-Role-Key — NUR für Server Actions im Admin-Bereich.
// Umgeht Row Level Security, damit wir Admin-Aktionen (z. B. User anlegen,
// Profile deaktivieren) durchführen können, ohne die Session des eingeloggten
// Admin-Users zu überschreiben.
//
// Wichtig: Diese Datei darf NIEMALS in Client Components importiert werden.
// Der Service-Role-Key ist nicht als NEXT_PUBLIC_... deklariert und wird
// daher von Next.js nicht ins Browser-Bundle übernommen — trotzdem gilt:
// nur in .ts-Dateien verwenden, die mit "use server" oder in Route Handlers
// laufen.

import { createClient } from "@supabase/supabase-js";

export function createSupabaseAdminClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!url || !serviceRoleKey) {
        // Klartext-Fehler, damit beim Deployen sofort sichtbar ist, dass
        // der Service-Role-Key fehlt — ohne den sind Admin-Mutationen tot.
        throw new Error(
            "Supabase-Admin-Client: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen gesetzt sein.",
        );
    }

    return createClient(url, serviceRoleKey, {
        auth: {
            // Kein Auto-Refresh, keine Session-Persistierung — dieser Client
            // soll nicht als User agieren, sondern als Backend-Dienstkonto.
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}
