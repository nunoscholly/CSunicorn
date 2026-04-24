// Projekt-Management-Dashboard (/project). Zugriff: Admin + PM.
// Spec: docs/visualizations.md §1. Sektionen:
//   1.1 Stat-Cards · 1.2 Forecast-Chart · 1.3 Zone-Progress ·
//   1.4 Outstanding Requests · 1.5 Add-Task · 1.6 Notification-Composer

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/supabase/types";
import { ZONES, type Zone } from "@/lib/zones";
import { StatCards } from "./_components/stat-cards";
import { ForecastChart, type ForecastDay } from "./_components/forecast-chart";
import {
    ZoneProgressList,
    type ZoneProgress,
} from "./_components/zone-progress";
import {
    OutstandingRequests,
    type PmRequest,
} from "./_components/outstanding-requests";
import { AddTaskForm } from "./_components/add-task-form";
import {
    NotificationComposer,
    type SentNotification,
} from "./_components/notification-composer";

export const metadata = {
    title: "Projekt-Management · START CREW",
};

export const dynamic = "force-dynamic";

function isShiftActiveAt(
    shiftStart: string | null,
    shiftEnd: string | null,
    slotMidpoint: Date,
) {
    if (!shiftStart || !shiftEnd) return false;
    const start = new Date(shiftStart).getTime();
    const end = new Date(shiftEnd).getTime();
    const mid = slotMidpoint.getTime();
    return start <= mid && mid < end;
}

export default async function ProjectPage() {
    const supabase = await createSupabaseServerClient();

    // --- Rollen-Guard -----------------------------------------------------
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single<Pick<Profile, "role" | "is_active">>();
    if (
        !currentProfile ||
        !currentProfile.is_active ||
        !["admin", "pm"].includes(currentProfile.role)
    ) {
        redirect("/");
    }

    // --- Daten parallel laden --------------------------------------------
    // Promise.all, damit Round-Trips nicht aufeinander warten.
    const [
        tasksRes,
        assignmentsRes,
        requestsRes,
        forecastsRes,
        profilesRes,
        sentRes,
    ] = await Promise.all([
        supabase
            .from("tasks")
            .select(
                "id, zone, task_name, shift_start, shift_end, people_needed, slots_remaining, status",
            ),
        supabase
            .from("assignments")
            .select("id, task_id, volunteer_id, status"),
        supabase
            .from("requests")
            .select(
                "id, zone, people_needed, shift_start, shift_end, status, created_at",
            ),
        supabase
            .from("forecasts")
            .select("day, predicted_people, status, tasks_active")
            .order("day", { ascending: true }),
        supabase
            .from("profiles")
            .select("id, name, role, is_active")
            .eq("is_active", true),
        supabase
            .from("notifications")
            .select("id, message, to_role, to_user_id, created_at")
            .eq("from_user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(5),
    ]);

    const tasks = tasksRes.data ?? [];
    const assignments = assignmentsRes.data ?? [];
    const requests = (requestsRes.data ?? []) as PmRequest[];
    const forecasts = forecastsRes.data ?? [];
    const profiles = profilesRes.data ?? [];
    const sentNotifications = sentRes.data ?? [];

    // --- Metriken berechnen (§1.1) ---------------------------------------
    // Aktive Volunteers: distinct volunteers mit laufendem Assignment.
    const activeVolunteerIds = new Set<string>();
    for (const a of assignments) {
        if (a.status === "assigned") activeVolunteerIds.add(a.volunteer_id);
    }
    const activeVolunteers = activeVolunteerIds.size;

    const openRequests = requests.filter(
        (r) => r.status === "open" || r.status === "partial",
    ).length;

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "complete").length;
    const tasksCompletePct =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    // Coverage heute: Tasks, deren Schicht-Start heute ist.
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(todayStart);
    todayEnd.setHours(24, 0, 0, 0);

    let requiredTodaySlots = 0;
    let staffedTodaySlots = 0;
    for (const t of tasks) {
        if (!t.shift_start) continue;
        const start = new Date(t.shift_start);
        if (start >= todayStart && start < todayEnd) {
            requiredTodaySlots += t.people_needed;
            // staffedSlots = people_needed - slots_remaining
            staffedTodaySlots += Math.max(
                0,
                t.people_needed - t.slots_remaining,
            );
        }
    }
    const coverageTodayPct =
        requiredTodaySlots > 0
            ? Math.round((staffedTodaySlots / requiredTodaySlots) * 100)
            : 0;

    // --- Zone-Progress (§1.3) --------------------------------------------
    const zoneProgress: ZoneProgress[] = ZONES.map((zone) => {
        const zoneTasks = tasks.filter((t) => t.zone === zone);
        const total = zoneTasks.length;
        const completed = zoneTasks.filter(
            (t) => t.status === "complete",
        ).length;
        const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
        return { zone: zone as Zone, completed, total, percentage };
    });

    // --- Forecast-Chart (§1.2) -------------------------------------------
    // ML-Tagesprognose: pro Tag (1–9) die vorhergesagte Personenzahl.
    const forecastDays: ForecastDay[] = forecasts.map((f) => ({
        day: f.day as number,
        predictedPeople: f.predicted_people as number,
        status: f.status as "on_track" | "at_risk" | "behind",
        tasksActive: (f.tasks_active as string) || "",
    }));

    // --- Leads für Notification-Composer ---------------------------------
    const leads = profiles
        .filter((p) => p.role === "lead")
        .map((p) => ({ id: p.id, name: p.name || "Unbenannt" }))
        .sort((a, b) => a.name.localeCompare(b.name));

    // Sent-Log: recipientLabel serverseitig auflösen, damit die Client-
    // Komponente nicht zusätzlich nach Profilen fragen muss.
    const profileById = new Map<string, string>();
    for (const p of profiles) profileById.set(p.id, p.name || "Unbenannt");
    const sentLog: SentNotification[] = sentNotifications.map((n) => ({
        id: n.id,
        message: n.message,
        to_role: n.to_role,
        to_user_id: n.to_user_id,
        recipientLabel: n.to_user_id
            ? profileById.get(n.to_user_id) ?? "Einzelperson"
            : n.to_role === "lead"
              ? "Alle Team-Leads"
              : (n.to_role ?? "—"),
        created_at: n.created_at,
    }));

    // --- Render ----------------------------------------------------------
    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">Projekt-Management</h1>
                <p className="text-sm text-foreground/60">
                    Echtzeit-Übersicht über Bemannung, Aufgaben und ML-Prognosen.
                </p>
            </header>

            <StatCards
                activeVolunteers={activeVolunteers}
                openRequests={openRequests}
                tasksCompletePct={tasksCompletePct}
                coverageTodayPct={coverageTodayPct}
            />

            <ForecastChart days={forecastDays} />

            <div className="grid gap-8 lg:grid-cols-2">
                <ZoneProgressList rows={zoneProgress} />
                <OutstandingRequests requests={requests} />
            </div>

            <div className="grid gap-8 lg:grid-cols-2">
                <AddTaskForm />
                <NotificationComposer leads={leads} sentLog={sentLog} />
            </div>
        </div>
    );
}
