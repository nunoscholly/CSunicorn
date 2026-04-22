// Server Actions für den Volunteer-Bereich.
// Nur eine Mutation: einen offenen Task übernehmen. Läuft über den atomaren
// Postgres-RPC claim_task_slot (siehe supabase/migrations/007_claim_task_slot.sql),
// damit Race-Conditions bei gleichzeitigen Klicks sauber abgefangen werden.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";

export type ActionResult<T = undefined> =
    | { ok: true; data?: T }
    | { ok: false; error: string };

// Fehlercode-Mapping: die deutschen Meldungen sind UI-ready.
// Keys kommen aus dem RPC in 007_claim_task_slot.sql.
const ERROR_MESSAGES: Record<string, string> = {
    forbidden: "Nicht erlaubt.",
    already_assigned: "Du bist bereits einem Task zugeteilt.",
    task_not_found: "Task existiert nicht mehr.",
    taken: "Der Slot wurde gerade von jemand anderem übernommen.",
};

export async function commitToTaskAction(
    taskId: string,
): Promise<ActionResult<{ remaining: number }>> {
    const supabase = await createSupabaseServerClient();

    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Keine gültige Session." };

    // Rolle prüfen — Volunteer oder Admin. Andere Rollen haben keinen Grund,
    // sich auf Tasks zu setzen.
    const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single<{ role: UserRole; is_active: boolean }>();
    if (!profile || !profile.is_active) {
        return { ok: false, error: "Account nicht aktiv." };
    }
    if (!["admin", "volunteer"].includes(profile.role)) {
        return {
            ok: false,
            error: "Nur Volunteers dürfen Tasks übernehmen.",
        };
    }

    // Der RPC erwartet auth.uid() = p_volunteer_id. Wir schicken explizit die
    // User-ID, damit der Vertrag mit der Funktion im SQL klar bleibt.
    const { data, error } = await supabase.rpc("claim_task_slot", {
        p_task_id: taskId,
        p_volunteer_id: user.id,
    });

    if (error) {
        // Typische Ursache: Migration 007 wurde noch nicht ausgeführt.
        return {
            ok: false,
            error:
                "Übernahme fehlgeschlagen. Prüfen: Migration 007_claim_task_slot.sql im Supabase-Dashboard ausgeführt?",
        };
    }

    // Der RPC liefert { ok: boolean, error?: string, remaining?: number }.
    const result = data as
        | { ok: true; remaining: number }
        | { ok: false; error: string };

    if (!result.ok) {
        const msg = ERROR_MESSAGES[result.error] ?? "Übernahme fehlgeschlagen.";
        return { ok: false, error: msg };
    }

    revalidatePath("/volunteer");
    revalidatePath("/lead"); // Team-Lead sieht den neuen Volunteer im Roster.
    revalidatePath("/project"); // PM-Dashboard aktualisiert Coverage.
    return { ok: true, data: { remaining: result.remaining } };
}
