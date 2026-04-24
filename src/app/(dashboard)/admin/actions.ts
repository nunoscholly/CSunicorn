// Server Actions für den Admin-Bereich.
// Alle Mutationen (User anlegen, Profile ändern, Map-Upload, Task-Batch)
// laufen ausschliesslich hier — Client Components triggern sie nur.
//
// "Defense in depth" aus CLAUDE.md: selbst wenn die UI eine nicht-Admin-Rolle
// hier aufrufen würde, prüfen wir am Anfang jeder Action, dass der
// eingeloggte User tatsächlich Admin ist.

"use server";

import { revalidatePath } from "next/cache";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { UserRole, TaskPriority } from "@/lib/supabase/types";
import { triggerForecastUpdate } from "@/lib/forecast-trigger";

// Einheitlicher Rückgabetyp, den die Client Components auswerten.
// "ok" → Erfolg, optional mit Daten. "error" → Klartext-Meldung für den User.
export type ActionResult<T = undefined> =
    | { ok: true; data?: T }
    | { ok: false; error: string };

// Prüft, ob die Session einem aktiven Admin gehört. Bei Fehlschlag wird eine
// fertige ActionResult-Fehlermeldung zurückgegeben, sonst die Admin-Profile-ID.
async function assertAdmin(): Promise<
    { ok: true; adminId: string } | { ok: false; error: string }
> {
    const supabase = await createSupabaseServerClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        return { ok: false, error: "Keine gültige Session." };
    }

    const { data: profile } = await supabase
        .from("profiles")
        .select("role, is_active")
        .eq("id", user.id)
        .single<{ role: UserRole; is_active: boolean }>();

    if (!profile || !profile.is_active || profile.role !== "admin") {
        return { ok: false, error: "Nur Admins dürfen diese Aktion ausführen." };
    }

    return { ok: true, adminId: user.id };
}

// ======================================================================
// USER MANAGEMENT
// ======================================================================

type CreateUserInput = {
    email: string;
    password: string;
    name: string;
    role: UserRole;
    phone?: string;
};

// Legt einen neuen User an. Wir nutzen den Service-Role-Client, damit die
// Admin-Session des aufrufenden Users NICHT überschrieben wird (das wäre
// beim normalen signUp der Fall). Der DB-Trigger handle_new_user() erzeugt
// automatisch die passende Zeile in profiles; wir aktualisieren danach nur
// noch optionale Felder (z. B. phone), falls gesetzt.
export async function createUserAction(
    input: CreateUserInput,
): Promise<ActionResult<{ userId: string }>> {
    const guard = await assertAdmin();
    if (!guard.ok) return guard;

    const email = input.email.trim().toLowerCase();
    const name = input.name.trim();

    if (!email || !input.password || !name) {
        return { ok: false, error: "E-Mail, Passwort und Name sind Pflicht." };
    }
    if (input.password.length < 8) {
        return { ok: false, error: "Passwort muss mindestens 8 Zeichen haben." };
    }

    const admin = createSupabaseAdminClient();

    // email_confirm: true → User ist sofort aktiv, Admin muss keine
    // Bestätigungsmail abwarten. user_metadata füttert den DB-Trigger.
    const { data, error } = await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
        user_metadata: { name, role: input.role },
    });

    if (error || !data.user) {
        return {
            ok: false,
            error: error?.message ?? "User konnte nicht angelegt werden.",
        };
    }

    // Optionales Feld "phone" füllen, falls angegeben. Geht über den Admin-
    // Client, umgeht so die Check-Policy "admin kann profiles.insert".
    if (input.phone && input.phone.trim().length > 0) {
        await admin
            .from("profiles")
            .update({ phone: input.phone.trim() })
            .eq("id", data.user.id);
    }

    revalidatePath("/admin");
    return { ok: true, data: { userId: data.user.id } };
}

type UpdateProfileInput = {
    userId: string;
    name?: string;
    role?: UserRole;
    phone?: string | null;
};

// Ändert Name, Rolle und/oder Telefonnummer eines bestehenden Users.
// Nur die übergebenen Felder werden geschrieben (keine ungewollten Overrides).
export async function updateProfileAction(
    input: UpdateProfileInput,
): Promise<ActionResult> {
    const guard = await assertAdmin();
    if (!guard.ok) return guard;

    const patch: Record<string, string | null> = {};
    if (typeof input.name === "string") patch.name = input.name.trim();
    if (typeof input.role === "string") patch.role = input.role;
    if (input.phone === null || typeof input.phone === "string") {
        patch.phone = input.phone === null ? null : input.phone.trim() || null;
    }

    if (Object.keys(patch).length === 0) {
        return { ok: false, error: "Keine Änderungen angegeben." };
    }

    // Server-Client würde an den eigenen Admin-RLS-Policies hängen — hier
    // reicht der Admin-Client, um Drift zwischen UI-Rolle und DB-Rolle zu
    // vermeiden (z. B. beim Runterstufen des Users auf volunteer).
    const admin = createSupabaseAdminClient();
    const { error } = await admin.from("profiles").update(patch).eq("id", input.userId);

    if (error) {
        return { ok: false, error: error.message };
    }

    revalidatePath("/admin");
    return { ok: true };
}

// Soft-Delete: niemals hart löschen, sondern is_active=false setzen.
// Auth-Session des betroffenen Users wird zusätzlich beendet, damit er nicht
// bis zum nächsten Token-Refresh weiter in der App steht.
export async function setUserActiveAction(
    userId: string,
    isActive: boolean,
): Promise<ActionResult> {
    const guard = await assertAdmin();
    if (!guard.ok) return guard;

    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("profiles")
        .update({ is_active: isActive })
        .eq("id", userId);

    if (error) {
        return { ok: false, error: error.message };
    }

    // Bei Deaktivierung: bestehende Refresh-Tokens des Users invalidieren.
    if (!isActive) {
        await admin.auth.admin.signOut(userId);
    }

    revalidatePath("/admin");
    return { ok: true };
}

// ======================================================================
// VENUE MAP UPLOAD
// ======================================================================

// Akzeptierte Formate gemäss docs/visualizations.md.
const ALLOWED_MAP_EXTENSIONS = ["png", "pdf", "svg"] as const;
const MAX_MAP_BYTES = 10 * 1024 * 1024; // 10 MB — grosszügig, aber nicht unbegrenzt.

// Speichert die hochgeladene Karte unter public/maps/current_map.<ext>
// und upsertet den Pfad im config-Table. Alter Upload wird überschrieben,
// sodass die Volunteer-Ansicht immer die aktuellste Karte anzeigt.
export async function uploadVenueMapAction(
    formData: FormData,
): Promise<ActionResult<{ publicPath: string }>> {
    const guard = await assertAdmin();
    if (!guard.ok) return guard;

    const file = formData.get("file");
    if (!(file instanceof File) || file.size === 0) {
        return { ok: false, error: "Keine Datei ausgewählt." };
    }
    if (file.size > MAX_MAP_BYTES) {
        return { ok: false, error: "Datei ist grösser als 10 MB." };
    }

    // Endung aus dem Dateinamen ziehen. fileType-Sniffing liesse sich erweitern,
    // für die drei erlaubten Formate reicht die Endung.
    const originalName = file.name.toLowerCase();
    const dotIndex = originalName.lastIndexOf(".");
    const ext = dotIndex >= 0 ? originalName.slice(dotIndex + 1) : "";

    if (!ALLOWED_MAP_EXTENSIONS.includes(ext as (typeof ALLOWED_MAP_EXTENSIONS)[number])) {
        return {
            ok: false,
            error: "Nur PNG, PDF oder SVG erlaubt.",
        };
    }

    // Ins Verzeichnis public/maps schreiben, damit Next.js die Datei statisch
    // ausliefern kann (Pfad ohne /public-Präfix im Browser).
    const targetDir = path.join(process.cwd(), "public", "maps");
    const targetPath = path.join(targetDir, `current_map.${ext}`);
    await mkdir(targetDir, { recursive: true });
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(targetPath, buffer);

    const publicPath = `/maps/current_map.${ext}`;

    // Upsert im config-Table. Admins dürfen laut RLS config.update, aber
    // nicht insert — darum der Admin-Client für den sicheren Upsert.
    const admin = createSupabaseAdminClient();
    const { error } = await admin
        .from("config")
        .upsert({ key: "venue_map_path", value: publicPath }, { onConflict: "key" });

    if (error) {
        return { ok: false, error: error.message };
    }

    revalidatePath("/admin");
    return { ok: true, data: { publicPath } };
}

// ======================================================================
// BATCH TASK UPLOAD
// ======================================================================

// Typ-Definition der Rows, die das UI nach der Validierung hochschickt.
// Pflichtfelder orientieren sich an docs/visualizations.md §4.3.
export type ParsedTaskRow = {
    zone: string;
    task_name: string;
    shift_start: string; // ISO-Timestamp
    shift_end: string; // ISO-Timestamp
    people_needed: number;
    skills: string;
    description: string;
    priority: TaskPriority;
};

// All-or-nothing: wenn auch nur eine Zeile scheitert, wird nichts geschrieben.
// Supabase kann keinen echten Transaktionsblock über den PostgREST-Client,
// aber wir haben das Bulk-Insert: Schlägt er fehl, sind null Zeilen geschrieben.
export async function bulkInsertTasksAction(
    rows: ParsedTaskRow[],
): Promise<ActionResult<{ inserted: number }>> {
    const guard = await assertAdmin();
    if (!guard.ok) return guard;

    if (rows.length === 0) {
        return { ok: false, error: "Keine Zeilen zum Importieren." };
    }
    if (rows.length > 500) {
        return { ok: false, error: "Maximal 500 Zeilen pro Import." };
    }

    // created_by auf den aktuellen Admin setzen, damit man den Import später
    // im Audit-Log nachvollziehen kann.
    const payload = rows.map((row) => ({
        zone: row.zone,
        task_name: row.task_name,
        shift_start: row.shift_start,
        shift_end: row.shift_end,
        people_needed: row.people_needed,
        slots_remaining: row.people_needed, // Start: alle Plätze noch offen.
        skills: row.skills || null,
        description: row.description || null,
        priority: row.priority,
        status: "open" as const,
        created_by: guard.adminId,
    }));

    const supabase = await createSupabaseServerClient();
    const { error, count } = await supabase
        .from("tasks")
        .insert(payload, { count: "exact" });

    if (error) {
        return { ok: false, error: error.message };
    }

    revalidatePath("/admin");
    revalidatePath("/project");
    await triggerForecastUpdate();
    return { ok: true, data: { inserted: count ?? rows.length } };
}
