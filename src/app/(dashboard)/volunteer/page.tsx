// Volunteer-Portal (/volunteer). Zugriff: Volunteer + Admin.
// Spec: docs/visualizations.md §3. Sektionen:
//   3.1 Profile Strip · (Active Task Card, nur wenn eingeteilt)
//   3.2 Venue Sector Map · 3.3 Open Jobs Feed

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
    Profile,
    TaskPriority,
    TaskStatus,
    UserRole,
} from "@/lib/supabase/types";
import { ZONES, type Zone } from "@/lib/zones";
import { ProfileStrip } from "./_components/profile-strip";
import {
    ActiveTaskCard,
    type ActiveTask,
} from "./_components/active-task-card";
import { SectorMap, type SectorTile } from "./_components/sector-map";
import {
    OpenJobsFeed,
    type OpenJob,
} from "./_components/open-jobs-feed";

export const metadata = {
    title: "Volunteer · START CREW",
};

export const dynamic = "force-dynamic";

// Typ für die Tasks-Rows, die wir vom Server ziehen.
type TaskRow = {
    id: string;
    zone: string | null;
    task_name: string;
    shift_start: string | null;
    shift_end: string | null;
    description: string | null;
    people_needed: number;
    slots_remaining: number;
    priority: TaskPriority;
    status: TaskStatus;
};

export default async function VolunteerPage() {
    const supabase = await createSupabaseServerClient();

    // --- Rollen-Guard -----------------------------------------------------
    const {
        data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/");

    const { data: currentProfile } = await supabase
        .from("profiles")
        .select("id, name, role, avatar_url, is_active")
        .eq("id", user.id)
        .single<
            Pick<Profile, "id" | "name" | "role" | "avatar_url" | "is_active">
        >();
    if (
        !currentProfile ||
        !currentProfile.is_active ||
        !["admin", "volunteer"].includes(currentProfile.role)
    ) {
        redirect("/");
    }

    // --- Daten parallel laden --------------------------------------------
    // tasks + assignments reichen für Sektor-Karte; zusätzlich eigenes
    // aktives Assignment für §3.1 und teams für Lead-Kontakt nach Commit.
    // Profile-/Phone-Fetch erfolgt bewusst NICHT hier: der Volunteer soll
    // nicht die Telefonnummern aller User im Payload erhalten. Stattdessen
    // fragen wir weiter unten gezielt nur das Profil des zuständigen Leads
    // ab ("Lead phone only exposed after commit", user_profiles.md).
    // CSV-Batchimports ohne Zone oder Schichtfenster fallen vom Volunteer-Feed
    // raus: ohne diese Felder taugt die Karte weder fuer die Sektor-Karte noch
    // fuer den "ohne feste Zeit"-Platzhalter. Wir zeigen nur Tasks, die
    // Volunteers wirklich uebernehmen koennen.
    const [tasksRes, assignmentsRes, myAssignmentsRes, teamsRes] =
        await Promise.all([
            supabase
                .from("tasks")
                .select(
                    "id, zone, task_name, shift_start, shift_end, description, people_needed, slots_remaining, priority, status",
                )
                .not("zone", "is", null)
                .not("shift_start", "is", null),
            supabase
                .from("assignments")
                .select("task_id, status"),
            supabase
                .from("assignments")
                .select("id, task_id, team_id, status, created_at")
                .eq("volunteer_id", user.id)
                .eq("status", "assigned")
                .order("created_at", { ascending: false })
                .limit(1),
            supabase.from("teams").select("id, name, zone, lead_id"),
        ]);

    const tasks = (tasksRes.data ?? []) as TaskRow[];
    const assignments = assignmentsRes.data ?? [];
    const myActiveAssignment = (myAssignmentsRes.data ?? [])[0] as
        | { id: string; task_id: string; team_id: string | null; status: string }
        | undefined;
    const teams = teamsRes.data ?? [];

    const teamByZone = new Map<string, { id: string; name: string; lead_id: string | null }>();
    for (const t of teams) {
        teamByZone.set(t.zone, { id: t.id, name: t.name, lead_id: t.lead_id });
    }

    // --- Active Task auflösen (§3.1) -------------------------------------
    // Lead-Profil nur für die eigene Zone laden — nicht die komplette
    // Profile-Tabelle mit allen Telefonnummern ziehen.
    let activeTask: ActiveTask | null = null;
    if (myActiveAssignment) {
        const task = tasks.find((t) => t.id === myActiveAssignment.task_id);
        if (task) {
            const team = task.zone ? teamByZone.get(task.zone) : null;
            let leadName: string | null = null;
            let leadPhone: string | null = null;

            if (team?.lead_id) {
                // Einzel-Fetch: nur der zuständige Lead, nur die Felder, die
                // wir im UI tatsächlich brauchen.
                const { data: leadProfile } = await supabase
                    .from("profiles")
                    .select("id, name, phone, role")
                    .eq("id", team.lead_id)
                    .eq("role", "lead")
                    .eq("is_active", true)
                    .maybeSingle<{
                        id: string;
                        name: string;
                        phone: string | null;
                        role: UserRole;
                    }>();
                if (leadProfile) {
                    leadName = leadProfile.name;
                    leadPhone = leadProfile.phone;
                }
            }

            activeTask = {
                taskName: task.task_name,
                zone: task.zone,
                shiftStart: task.shift_start,
                shiftEnd: task.shift_end,
                description: task.description,
                leadName,
                leadPhone,
            };
        }
    }

    // --- Sektor-Karte (§3.2) ---------------------------------------------
    // Pro Zone: sum(people_needed) = benötigt, sum(people_needed - slots_remaining)
    // = besetzt. Erledigte Tasks (status='complete') rausnehmen — die drücken
    // sonst die Live-Auslastung künstlich nach oben.
    const sectorTiles: SectorTile[] = ZONES.map((zone) => {
        let staffed = 0;
        let required = 0;
        for (const t of tasks) {
            if (t.zone !== zone) continue;
            if (t.status === "complete") continue;
            required += t.people_needed;
            staffed += Math.max(0, t.people_needed - t.slots_remaining);
        }
        return { zone: zone as Zone, staffed, required };
    });

    // --- Open Jobs (§3.3) ------------------------------------------------
    // Nur wirklich offene Tasks: status='open' UND slots_remaining > 0.
    // "Taken"-Cards aus der UI-Spec mappen wir über den Button-Zustand, nicht
    // über das Ausblenden komplett gefüllter Tasks — wir lassen sie weg,
    // damit die Liste kurz bleibt.
    const openJobs: OpenJob[] = tasks
        .filter((t) => t.status === "open" && t.slots_remaining > 0)
        .map((t) => ({
            id: t.id,
            task_name: t.task_name,
            zone: t.zone,
            shift_start: t.shift_start,
            shift_end: t.shift_end,
            description: t.description,
            slots_remaining: t.slots_remaining,
            people_needed: t.people_needed,
            priority: t.priority,
        }));

    // Für Auswertung weiter unten: wie viele Assignments laufen noch aktiv?
    // (Wird in der Sektor-Berechnung aktuell nicht separat genutzt — steht
    // bereit, falls wir später noch drill-downs brauchen.)
    void assignments;

    const volunteerHasActiveTask = activeTask !== null;

    return (
        <div className="space-y-8">
            <ProfileStrip
                name={currentProfile.name || "Unbenannt"}
                avatarUrl={currentProfile.avatar_url}
                activeTaskName={activeTask?.taskName ?? null}
            />

            {activeTask ? <ActiveTaskCard task={activeTask} /> : null}

            <SectorMap tiles={sectorTiles} />

            <OpenJobsFeed
                jobs={openJobs}
                volunteerHasActiveTask={volunteerHasActiveTask}
            />
        </div>
    );
}
