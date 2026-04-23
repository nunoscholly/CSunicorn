// Team-Lead-Dashboard (/lead). Zugriff: Lead + Admin.
// Spec: docs/visualizations.md §2. Sektionen:
//   2.1 Updates Feed · 2.2 Team Roster · 2.3 Task Checklist + OKR Panel ·
//   2.4 Request People Form + eigenes Request-Log
//
// KRITISCH (docs/user_profiles.md §Lead): alle Queries müssen auf team_id /
// zone des Leads gefiltert sein — nicht auf UI-Ebene, sondern auf Query-Ebene.

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type {
    Profile,
    TaskPriority,
    TaskStatus,
    UserRole,
} from "@/lib/supabase/types";
import { UpdatesFeed, type LeadNotification } from "./_components/updates-feed";
import {
    TeamRoster,
    type RosterMember,
} from "./_components/team-roster";
import {
    TaskChecklist,
    type ChecklistTask,
} from "./_components/task-checklist";
import { OkrPanel } from "./_components/okr-panel";
import {
    RequestPeopleForm,
    type LeadRequest,
} from "./_components/request-people-form";

export const metadata = {
    title: "Team-Lead · START CREW",
};

export const dynamic = "force-dynamic";

export default async function LeadPage() {
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
        !["admin", "lead"].includes(currentProfile.role)
    ) {
        redirect("/");
    }

    // --- Team/Zone des Leads finden --------------------------------------
    // Lead: teams.lead_id = user.id. Admin: evtl. kein Team — dann zeigen wir
    // eine deutliche Info-Karte statt leerer Sektionen.
    const { data: team } = await supabase
        .from("teams")
        .select("id, name, zone")
        .eq("lead_id", user.id)
        .maybeSingle<{ id: string; name: string; zone: string }>();

    const teamId = team?.id ?? null;
    const zone = team?.zone ?? null;

    // --- Daten laden -----------------------------------------------------
    // Notifications immer — die sind nicht team-scoped, sondern per Rolle.
    // Team-abhängige Queries nur, wenn ein Team gefunden wurde.
    const [notificationsRes, fromProfilesRes] = await Promise.all([
        supabase
            .from("notifications")
            .select("id, message, is_read, created_at, from_user_id, to_role, to_user_id")
            .or(`to_role.eq.lead,to_user_id.eq.${user.id}`)
            .order("created_at", { ascending: false })
            .limit(20),
        // Nur Absender-Profile holen, die tatsächlich Nachrichten schicken
        // dürfen. Spart Payload und verhindert, dass die volle User-Liste
        // beim Lead landet (defense-in-depth).
        supabase
            .from("profiles")
            .select("id, name")
            .in("role", ["admin", "pm", "lead"])
            .eq("is_active", true),
    ]);

    // Map: profile_id → name, um Absender aufzulösen.
    const profileNameById = new Map<string, string>();
    for (const p of fromProfilesRes.data ?? []) {
        profileNameById.set(p.id, p.name || "Unbenannt");
    }

    const notifications: LeadNotification[] = (notificationsRes.data ?? []).map(
        (n) => ({
            id: n.id,
            message: n.message,
            from: n.from_user_id
                ? profileNameById.get(n.from_user_id) ?? "System"
                : "System",
            is_read: n.is_read,
            created_at: n.created_at,
        }),
    );

    // Wenn kein Team → Dashboard in Read-Only-Modus, nur Updates + Empty-States.
    if (!team || !teamId || !zone) {
        return (
            <div className="space-y-8">
                <header className="flex flex-col gap-1">
                    <h1 className="text-2xl font-bold">Team-Lead</h1>
                    <p className="text-sm text-foreground/60">
                        Dir ist aktuell kein Team zugeordnet. Wende dich an einen
                        Admin, um eine Zone zu bekommen.
                    </p>
                </header>
                <UpdatesFeed notifications={notifications} />
            </div>
        );
    }

    // --- Team-scoped Parallel-Fetch --------------------------------------
    // Profile-Fetch findet weiter unten sequentiell statt, weil wir erst
    // wissen müssen, welche Volunteer-IDs im eigenen Team vorkommen
    // (defense-in-depth: Lead darf keine fremden Profile im Payload bekommen).
    const [tasksRes, assignmentsRes, requestsRes] = await Promise.all([
        supabase
            .from("tasks")
            .select(
                "id, task_name, priority, status, shift_start, shift_end, people_needed, slots_remaining",
            )
            .eq("zone", zone)
            .order("shift_start", { ascending: true }),
        supabase
            .from("assignments")
            .select("id, task_id, volunteer_id, status")
            .eq("team_id", teamId),
        supabase
            .from("requests")
            .select(
                "id, people_needed, shift_start, shift_end, status, created_at",
            )
            .eq("team_id", teamId)
            .order("created_at", { ascending: false }),
    ]);

    const tasks = (tasksRes.data ?? []) as Array<{
        id: string;
        task_name: string;
        priority: TaskPriority;
        status: TaskStatus;
        shift_start: string | null;
        shift_end: string | null;
        people_needed: number;
        slots_remaining: number;
    }>;
    const assignments = assignmentsRes.data ?? [];
    const requests = (requestsRes.data ?? []) as LeadRequest[];

    // Volunteer-IDs aus den eigenen Assignments — Team-Scope für den Roster.
    const teamVolunteerIds = Array.from(
        new Set(assignments.map((a) => a.volunteer_id).filter(Boolean)),
    );

    // Jetzt nur die Profile laden, die wirklich zum Team gehören. Wenn das
    // Team noch niemanden eingeteilt hat, sparen wir den Request komplett.
    const volunteersRes = teamVolunteerIds.length
        ? await supabase
              .from("profiles")
              .select("id, name, role, avatar_url")
              .eq("is_active", true)
              .in("id", teamVolunteerIds)
        : { data: [] as Array<{ id: string; name: string; role: UserRole; avatar_url: string | null }> };

    const volunteerProfiles = (volunteersRes.data ?? []) as Array<{
        id: string;
        name: string;
        role: UserRole;
        avatar_url: string | null;
    }>;

    // --- Roster zusammenbauen (§2.2) -------------------------------------
    // Nur aktive Assignments (status='assigned') zählen als "eingeteilt".
    const taskById = new Map(tasks.map((t) => [t.id, t]));
    const volunteerById = new Map(volunteerProfiles.map((v) => [v.id, v]));

    const rosterMembers: RosterMember[] = assignments
        .filter((a) => a.status === "assigned")
        .map((a) => {
            const task = taskById.get(a.task_id);
            const volunteer = volunteerById.get(a.volunteer_id);
            return {
                assignmentId: a.id,
                volunteerId: a.volunteer_id,
                name: volunteer?.name ?? "Unbenannt",
                role: volunteer?.role ?? "volunteer",
                avatarUrl: volunteer?.avatar_url ?? null,
                taskName: task?.task_name ?? null,
                shiftStart: task?.shift_start ?? null,
                shiftEnd: task?.shift_end ?? null,
            };
        });

    // --- Sollstand: Summe people_needed über offene Tasks ----------------
    // Erledigte Tasks zählen nicht mehr zum Headcount — sonst würde die
    // Utilisation-Kennzahl bei fertigem Aufbau abrutschen.
    const requiredHeadcount = tasks
        .filter((t) => t.status !== "complete")
        .reduce((sum, t) => sum + t.people_needed, 0);

    // --- Tasks für die Checkliste ----------------------------------------
    const checklistTasks: ChecklistTask[] = tasks.map((t) => ({
        id: t.id,
        task_name: t.task_name,
        priority: t.priority,
        status: t.status,
        shift_start: t.shift_start,
        shift_end: t.shift_end,
    }));

    // --- OKR-Berechnung (§2.3) -------------------------------------------
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "complete").length;
    const stageCompletionPct =
        totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    const staffedAssignments = rosterMembers.length;
    const crewUtilisationPct =
        requiredHeadcount > 0
            ? Math.round((staffedAssignments / requiredHeadcount) * 100)
            : 0;

    const requestsTotal = requests.length;
    const requestsClosed = requests.filter(
        (r) => r.status === "filled",
    ).length;
    const requestsClosedPct =
        requestsTotal > 0
            ? Math.round((requestsClosed / requestsTotal) * 100)
            : 0;

    // --- Render ----------------------------------------------------------
    return (
        <div className="space-y-8">
            <header className="flex flex-col gap-1">
                <h1 className="text-2xl font-bold">
                    {team.name} · {zone}
                </h1>
                <p className="text-sm text-foreground/60">
                    Deine Zone, dein Team, deine Aufgaben.
                </p>
            </header>

            <UpdatesFeed notifications={notifications} />

            <TeamRoster
                teamName={team.name}
                zone={zone}
                members={rosterMembers}
                staffed={staffedAssignments}
                required={requiredHeadcount}
            />

            <div className="grid gap-8 lg:grid-cols-[2fr_1fr]">
                <TaskChecklist tasks={checklistTasks} />
                <OkrPanel
                    stageCompletionPct={stageCompletionPct}
                    crewUtilisationPct={crewUtilisationPct}
                    requestsClosedPct={requestsClosedPct}
                    requestsClosed={requestsClosed}
                    requestsTotal={requestsTotal}
                />
            </div>

            <RequestPeopleForm
                zone={zone}
                disabled={false}
                requests={requests}
            />
        </div>
    );
}
