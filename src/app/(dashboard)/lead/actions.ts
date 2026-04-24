// Server Actions für den Team-Lead-Bereich. Drei Mutationen:
//   - markTaskCompleteAction    (§2.3 Checkbox pro Task)
//   - markNotificationReadAction (§2.1 Klick auf Update → gelesen)
//   - createRequestAction       (§2.4 Leute anfordern)
//
// Sämtliche Actions prüfen am Anfang, dass der User Lead (oder Admin) ist
// UND schränken team-scoped Mutationen auf das eigene Team/Zone ein.
// RLS erzwingt das zusätzlich — defense-in-depth.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/supabase/types";
import { ZONES, type Zone } from "@/lib/zones";
import { triggerForecastUpdate } from "@/lib/forecast-trigger";

export type ActionResult<T = undefined> =
    | { ok: true; data?: T }
    | { ok: false; error: string };

// Liefert den aktuellen Lead + sein Team/Zone.
// Admin darf zwar rein, hat aber kein eigenes Team → die meisten Mutationen
// werden deshalb für Admin-Accounts abgelehnt, weil das Scoping fehlt.
async function loadLeadContext(): Promise<
    | {
          ok: true;
          userId: string;
          role: UserRole;
          teamId: string | null;
          zone: string | null;
      }
    | { ok: false; error: string }
> {
    const supabase = await createSupabaseServerClient();
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
    if (!["admin", "lead"].includes(profile.role)) {
        return { ok: false, error: "Nur Lead oder Admin dürfen das." };
    }

    // Team via teams.lead_id finden. Ein Lead kann höchstens ein Team leiten.
    const { data: team } = await supabase
        .from("teams")
        .select("id, zone")
        .eq("lead_id", user.id)
        .maybeSingle<{ id: string; zone: string }>();

    return {
        ok: true,
        userId: user.id,
        role: profile.role,
        teamId: team?.id ?? null,
        zone: team?.zone ?? null,
    };
}

// ======================================================================
// MARK TASK COMPLETE (§2.3)
// ======================================================================

export async function markTaskCompleteAction(
    taskId: string,
): Promise<ActionResult> {
    const ctx = await loadLeadContext();
    if (!ctx.ok) return ctx;

    const supabase = await createSupabaseServerClient();

    // Vorab: Task-Zone prüfen. Lead darf nur Tasks der eigenen Zone schliessen.
    // Admin darf alles — daher Check auslassen, wenn role='admin'.
    if (ctx.role === "lead") {
        const { data: task } = await supabase
            .from("tasks")
            .select("zone")
            .eq("id", taskId)
            .single<{ zone: string | null }>();
        if (!task || task.zone !== ctx.zone) {
            return {
                ok: false,
                error: "Dieser Task liegt nicht in deiner Zone.",
            };
        }
    }

    const { error } = await supabase
        .from("tasks")
        .update({ status: "complete" })
        .eq("id", taskId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/lead");
    revalidatePath("/project");
    await triggerForecastUpdate();
    return { ok: true };
}

// ======================================================================
// MARK NOTIFICATION READ (§2.1)
// ======================================================================

export async function markNotificationReadAction(
    notificationId: string,
): Promise<ActionResult> {
    const ctx = await loadLeadContext();
    if (!ctx.ok) return ctx;

    const supabase = await createSupabaseServerClient();

    // Ownership-Check: Lead darf nur Nachrichten abhaken, die an ihn selbst
    // (to_user_id = eigene id) oder an die Rolle "lead" gebroadcastet wurden.
    // Admin darf alle markieren — das matcht das bestehende Admin-Bypass-Muster.
    if (ctx.role === "lead") {
        const { data: target } = await supabase
            .from("notifications")
            .select("to_role, to_user_id")
            .eq("id", notificationId)
            .maybeSingle<{
                to_role: string | null;
                to_user_id: string | null;
            }>();
        if (!target) {
            return { ok: false, error: "Nachricht nicht gefunden." };
        }
        const addressedToMe = target.to_user_id === ctx.userId;
        const addressedToLeads = target.to_role === "lead";
        if (!addressedToMe && !addressedToLeads) {
            return {
                ok: false,
                error: "Diese Nachricht ist nicht an dich adressiert.",
            };
        }
    }

    const { error } = await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notificationId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/lead");
    return { ok: true };
}

// ======================================================================
// CREATE REQUEST (§2.4)
// ======================================================================

export type CreateRequestInput = {
    people_needed: number;
    shift_start: string;
    shift_end: string;
    skills: string;
    notes: string;
};

export async function createRequestAction(
    input: CreateRequestInput,
): Promise<ActionResult<{ requestId: string }>> {
    const ctx = await loadLeadContext();
    if (!ctx.ok) return ctx;

    if (!ctx.teamId || !ctx.zone) {
        return {
            ok: false,
            error: "Dir ist kein Team zugeordnet. Wende dich an einen Admin.",
        };
    }

    // Guard: Zone muss eine der bekannten sein, sonst fliegt das später beim
    // Select-Rendering.
    if (!ZONES.includes(ctx.zone as Zone)) {
        return { ok: false, error: `Unbekannte Zone: ${ctx.zone}` };
    }

    if (!Number.isInteger(input.people_needed) || input.people_needed < 1) {
        return { ok: false, error: "Bedarf muss mindestens 1 Person sein." };
    }

    const shiftStart = new Date(input.shift_start);
    const shiftEnd = new Date(input.shift_end);
    if (Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime())) {
        return { ok: false, error: "Ungültige Schichtzeiten." };
    }
    if (shiftStart >= shiftEnd) {
        return {
            ok: false,
            error: "Schicht-Ende muss nach Schicht-Start liegen.",
        };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("requests")
        .insert({
            team_id: ctx.teamId,
            zone: ctx.zone,
            people_needed: input.people_needed,
            shift_start: shiftStart.toISOString(),
            shift_end: shiftEnd.toISOString(),
            skills: input.skills.trim() || null,
            notes: input.notes.trim() || null,
            status: "open",
        })
        .select("id")
        .single<{ id: string }>();

    if (error || !data) {
        return {
            ok: false,
            error: error?.message ?? "Anfrage konnte nicht gespeichert werden.",
        };
    }

    revalidatePath("/lead");
    revalidatePath("/project"); // PM soll die neue Anfrage sofort sehen.
    return { ok: true, data: { requestId: data.id } };
}
