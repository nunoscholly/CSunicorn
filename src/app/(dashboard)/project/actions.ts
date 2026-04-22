// Server Actions für das Projekt-Management-Dashboard.
// Die drei Mutationen, die der PM direkt aus der UI auslöst:
//   - createTaskAction        (§1.5 Add Task Form)
//   - resolveRequestAction    (§1.4 Outstanding Requests: Resolve-Button)
//   - sendNotificationAction  (§1.6 Notification Composer)
//
// Alle Actions prüfen zuerst, dass der Aufrufer tatsächlich PM oder Admin
// ist — Row Level Security macht das ebenfalls, aber defense-in-depth hält
// die UI konsistent, falls sich RLS-Policies mal ändern.

"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TaskPriority, UserRole } from "@/lib/supabase/types";
import { ZONES, type Zone } from "@/lib/zones";

export type ActionResult<T = undefined> =
    | { ok: true; data?: T }
    | { ok: false; error: string };

// Gate: nur PM und Admin dürfen diese Seite schreiben.
async function assertPmOrAdmin(): Promise<
    { ok: true; userId: string } | { ok: false; error: string }
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

    if (!profile || !profile.is_active || !["admin", "pm"].includes(profile.role)) {
        return {
            ok: false,
            error: "Nur PM und Admin dürfen diese Aktion ausführen.",
        };
    }

    return { ok: true, userId: user.id };
}

// ======================================================================
// ADD TASK (§1.5)
// ======================================================================

export type CreateTaskInput = {
    zone: Zone;
    task_name: string;
    shift_start: string; // ISO-Timestamp aus <input type="datetime-local">
    shift_end: string;
    people_needed: number;
    skills: string;
    description: string;
    priority: TaskPriority;
};

export async function createTaskAction(
    input: CreateTaskInput,
): Promise<ActionResult<{ taskId: string }>> {
    const guard = await assertPmOrAdmin();
    if (!guard.ok) return guard;

    // Pflichtfeld-Validierung. Kein Trust auf die UI — auch der PM kann
    // versehentlich leere Strings abschicken, wenn das Formular blockt.
    const task_name = input.task_name.trim();
    if (!task_name) return { ok: false, error: "Task-Name fehlt." };
    if (!ZONES.includes(input.zone)) {
        return { ok: false, error: "Unbekannte Zone." };
    }

    const shiftStart = new Date(input.shift_start);
    const shiftEnd = new Date(input.shift_end);
    if (Number.isNaN(shiftStart.getTime()) || Number.isNaN(shiftEnd.getTime())) {
        return { ok: false, error: "Ungültige Schichtzeiten." };
    }
    if (shiftStart >= shiftEnd) {
        return { ok: false, error: "Schicht-Ende muss nach Schicht-Start liegen." };
    }

    if (!Number.isInteger(input.people_needed) || input.people_needed < 1) {
        return { ok: false, error: "Anzahl Personen muss mindestens 1 sein." };
    }
    if (!["critical", "warning", "normal"].includes(input.priority)) {
        return { ok: false, error: "Ungültige Priorität." };
    }

    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase
        .from("tasks")
        .insert({
            zone: input.zone,
            task_name,
            shift_start: shiftStart.toISOString(),
            shift_end: shiftEnd.toISOString(),
            people_needed: input.people_needed,
            slots_remaining: input.people_needed, // Start: alle Plätze offen.
            skills: input.skills.trim() || null,
            description: input.description.trim() || null,
            priority: input.priority,
            status: "open",
            created_by: guard.userId,
        })
        .select("id")
        .single<{ id: string }>();

    if (error || !data) {
        return { ok: false, error: error?.message ?? "Task konnte nicht angelegt werden." };
    }

    revalidatePath("/project");
    revalidatePath("/volunteer"); // Open-Jobs-Feed für Volunteers aktualisieren.
    return { ok: true, data: { taskId: data.id } };
}

// ======================================================================
// RESOLVE REQUEST (§1.4)
// ======================================================================

// Setzt status='filled' auf einem Request. PM schliesst damit offene
// Anfragen, wenn Personal bereits anderweitig dazugestossen ist.
export async function resolveRequestAction(
    requestId: string,
): Promise<ActionResult> {
    const guard = await assertPmOrAdmin();
    if (!guard.ok) return guard;

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase
        .from("requests")
        .update({ status: "filled" })
        .eq("id", requestId);

    if (error) return { ok: false, error: error.message };

    revalidatePath("/project");
    revalidatePath("/lead"); // Team-Lead sieht im eigenen Log den neuen Status.
    return { ok: true };
}

// ======================================================================
// SEND NOTIFICATION (§1.6)
// ======================================================================

export type SendNotificationInput = {
    // "all_leads" → Broadcast an alle mit role='lead'.
    // "user:<uuid>" → konkrete Lead-Person.
    recipient: string;
    message: string;
};

export async function sendNotificationAction(
    input: SendNotificationInput,
): Promise<ActionResult> {
    const guard = await assertPmOrAdmin();
    if (!guard.ok) return guard;

    const message = input.message.trim();
    if (!message) return { ok: false, error: "Nachricht darf nicht leer sein." };
    if (message.length > 500) {
        return { ok: false, error: "Nachricht ist zu lang (max. 500 Zeichen)." };
    }

    // Recipient-Format: entweder "all_leads" oder "user:<uuid>".
    let to_role: string | null = null;
    let to_user_id: string | null = null;

    if (input.recipient === "all_leads") {
        to_role = "lead";
    } else if (input.recipient.startsWith("user:")) {
        const uuid = input.recipient.slice("user:".length);
        if (!uuid) return { ok: false, error: "Ungültiger Empfänger." };
        to_user_id = uuid;
    } else {
        return { ok: false, error: "Ungültiger Empfänger." };
    }

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.from("notifications").insert({
        from_user_id: guard.userId,
        to_role,
        to_user_id,
        message,
    });

    if (error) return { ok: false, error: error.message };

    revalidatePath("/project");
    revalidatePath("/lead"); // Lead-Feed soll die neue Nachricht sofort sehen.
    return { ok: true };
}
