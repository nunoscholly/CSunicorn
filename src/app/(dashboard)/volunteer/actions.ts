// Server Actions für den Volunteer-Bereich.
// Einzige Mutation: einen offenen Task übernehmen.
//
// Umsetzung folgt docs/visualizations.md §3.3 Commit Logic:
//   1. Prüfen, dass der Volunteer noch keinen aktiven Task hat
//   2. tasks.slots_remaining dekrementieren mit .gt("slots_remaining", 0)-
//      Guard + optimistic-locking auf den zuletzt gelesenen Wert
//   3. Wenn slots_remaining auf 0 fällt → tasks.status='filled'
//   4. Assignment einfügen
//
// Die RLS-Policy tasks_update lässt Volunteers nicht direkt auf tasks
// schreiben — für den Dekrement nutzen wir daher den Admin-Client mit
// Service-Role-Key. Der Insert von assignments läuft weiter über den
// Session-Client, damit die RLS-Regel volunteer_id = auth.uid() greift.
//
// Hinweis: supabase/migrations/007_claim_task_slot.sql bietet einen
// atomaren Postgres-RPC als saubere Alternative. Solange dieser nicht
// eingespielt ist, liefert die Application-Level-Logik hier dasselbe
// Verhalten — bis auf ein extrem kleines Race-Window, das die DB-Constraint
// CHECK (slots_remaining >= 0) im Zweifel abfängt.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole } from "@/lib/supabase/types";

export type ActionResult<T = undefined> =
    | { ok: true; data?: T }
    | { ok: false; error: string };

export async function commitToTaskAction(
    taskId: string,
): Promise<ActionResult<{ remaining: number }>> {
    const supabase = await createSupabaseServerClient();

    // --- Session + Rolle prüfen -----------------------------------------
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { ok: false, error: "Keine gültige Session." };

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

    // --- One active task per volunteer ----------------------------------
    const { data: existing } = await supabase
        .from("assignments")
        .select("id")
        .eq("volunteer_id", user.id)
        .eq("status", "assigned")
        .limit(1);
    if (existing && existing.length > 0) {
        return {
            ok: false,
            error: "Du bist bereits einem Task zugeteilt.",
        };
    }

    // --- Task-State laden -----------------------------------------------
    const { data: task } = await supabase
        .from("tasks")
        .select("zone, slots_remaining, people_needed, status")
        .eq("id", taskId)
        .single<{
            zone: string | null;
            slots_remaining: number;
            people_needed: number;
            status: string;
        }>();
    if (!task) {
        return { ok: false, error: "Task existiert nicht mehr." };
    }
    if (task.status !== "open" || task.slots_remaining <= 0) {
        return {
            ok: false,
            error: "Der Slot wurde gerade vergeben.",
        };
    }

    // --- Admin-Client: Tasks-UPDATE bypasst RLS -------------------------
    // Service-Role nur für diesen engen Schritt. Die Anwendungs-Logik
    // stellt sicher, dass genau "1 Slot -1" geschrieben wird.
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
        // Keine Implementierungsdetails nach aussen tragen — der Name des
        // Env-Vars gehört ins Log, nicht in die UI-Fehlermeldung.
        console.error(
            "commitToTaskAction: SUPABASE_SERVICE_ROLE_KEY fehlt in der Umgebung.",
        );
        return {
            ok: false,
            error: "Serverkonfiguration unvollständig. Bitte Admin kontaktieren.",
        };
    }

    const admin = createSupabaseAdminClient();

    // --- Optimistic Decrement -------------------------------------------
    // .eq("slots_remaining", task.slots_remaining) wirkt als optimistic
    // lock: wenn zwischen SELECT und UPDATE jemand anders committed hat,
    // findet die WHERE-Klausel 0 Zeilen und wir brechen ab.
    const newRemaining = task.slots_remaining - 1;
    const patch: { slots_remaining: number; status?: "filled" } = {
        slots_remaining: newRemaining,
    };
    if (newRemaining === 0) {
        patch.status = "filled";
    }

    const { data: updated } = await admin
        .from("tasks")
        .update(patch)
        .eq("id", taskId)
        .eq("slots_remaining", task.slots_remaining)
        .gt("slots_remaining", 0)
        .select("id");

    if (!updated || updated.length === 0) {
        return {
            ok: false,
            error:
                "Der Slot wurde gerade von jemand anderem übernommen.",
        };
    }

    // --- team_id für das Assignment auflösen ----------------------------
    let teamId: string | null = null;
    if (task.zone) {
        const { data: team } = await admin
            .from("teams")
            .select("id")
            .eq("zone", task.zone)
            .limit(1)
            .maybeSingle<{ id: string }>();
        teamId = team?.id ?? null;
    }

    // --- Assignment anlegen ---------------------------------------------
    // Bewusst über den Session-Client: so greift die RLS-Policy
    // "volunteer_id = auth.uid()" und bleibt auditierbar.
    const { error: insertError } = await supabase.from("assignments").insert({
        task_id: taskId,
        volunteer_id: user.id,
        team_id: teamId,
        status: "assigned",
    });

    if (insertError) {
        // Best-effort Rollback: Decrement rückgängig machen, damit der
        // Slot wieder frei wird, wenn der Assignment-Insert scheitert.
        await admin
            .from("tasks")
            .update({
                slots_remaining: task.slots_remaining,
                ...(newRemaining === 0 ? { status: "open" } : {}),
            })
            .eq("id", taskId);

        return {
            ok: false,
            error: `Assignment konnte nicht gespeichert werden: ${insertError.message}`,
        };
    }

    revalidatePath("/volunteer");
    revalidatePath("/lead"); // Lead sieht den neuen Volunteer im Roster.
    revalidatePath("/project"); // PM-Dashboard aktualisiert Coverage.
    return { ok: true, data: { remaining: newRemaining } };
}
