// TypeScript-Typen für die Supabase-Tabellen, die das Frontend liest oder schreibt.
// Spiegelt den aktuellen Stand von supabase/migrations/004_auth_and_profiles.sql.
// Bewusst handgepflegt statt generiert, damit das Team jederzeit nachvollziehen
// kann, welche Felder genutzt werden — und damit es keine Build-Abhängigkeit
// zum Supabase-CLI gibt.

export type UserRole = "admin" | "pm" | "lead" | "volunteer";

export type TaskPriority = "critical" | "warning" | "normal";
export type TaskStatus = "open" | "filled" | "complete";

export type Profile = {
    id: string;
    name: string;
    email: string;
    role: UserRole;
    phone: string | null;
    avatar_url: string | null;
    team_id: string | null;
    is_active: boolean;
    created_at: string;
};

export type Team = {
    id: string;
    name: string;
    zone: string;
    lead_id: string | null;
};

export type Task = {
    id: string;
    zone: string | null;
    task_name: string;
    day: number | null;
    shift_start: string | null;
    shift_end: string | null;
    duration_hours: number | null;
    people_needed: number;
    slots_remaining: number;
    skills: string | null;
    priority: TaskPriority;
    description: string | null;
    depends_on: string | null;
    status: TaskStatus;
    created_by: string | null;
    created_at: string;
};

// Forecast-Typ: ab Migration 010 tagesbasiert statt Slot-basiert.
export type ForecastStatus = "pending" | "confirmed" | "outdated";

export type Forecast = {
    id: string;
    zone: string;
    day: number | null;
    predicted_people: number;
    status: ForecastStatus;
    tasks_active: number;
    generated_at: string;
};

// Das config-Table ist ein schlichter Key-Value-Store. Wir schlüsseln die
// bekannten Keys hier explizit auf, damit Typos im Code auffallen.
export type ConfigKey = "venue_map_path";

export type ConfigRow = {
    key: ConfigKey;
    value: string | null;
    updated_at: string;
};
