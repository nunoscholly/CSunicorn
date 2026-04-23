/**
 * Seed-Skript: Demo-Daten über die offizielle Supabase Admin-API anlegen.
 *
 * Erstellt alle Demo-User via supabase.auth.admin.createUser() statt per
 * direktem INSERT INTO auth.users — das ist der einzige zuverlässige Weg,
 * login-fähige Accounts auf gehosteten Supabase-Instanzen zu erzeugen.
 *
 * Ausführen:  npm run seed:demo
 * Voraussetzung: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY
 *                müssen in .env.local gesetzt sein.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

// .env.local laden (Node 22 --env-file unterstützt keine .env.local,
// daher manuell parsen)
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = resolve(__dirname, "..", ".env.local");

try {
  const envContent = readFileSync(envPath, "utf-8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIndex = trimmed.indexOf("=");
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
} catch {
  // .env.local nicht gefunden — Environment-Variablen müssen anders gesetzt sein
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Fehler: NEXT_PUBLIC_SUPABASE_URL und SUPABASE_SERVICE_ROLE_KEY müssen in .env.local gesetzt sein."
  );
  process.exit(1);
}

// Admin-Client mit Service-Role-Key (umgeht RLS)
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ============================================================
// Demo-User-Definitionen
// ============================================================
const DEMO_PASSWORD = "StartCrew123!";

const DEMO_USERS = [
  // Legacy-Demo-Admin: hält die dokumentierten Login-Daten aus früheren
  // Wochen lebendig (admin@start.test / test123). Eigenes Passwort,
  // ansonsten identisch zum normalen Admin-Flow.
  {
    id: "00000000-0000-4000-8000-000000000000",
    email: "admin@start.test",
    name: "Demo Admin",
    role: "admin",
    phone: "+41 79 100 00 00",
    password: "test123",
  },
  // Admin
  {
    id: "00000000-0000-4000-8000-000000000001",
    email: "admin@startcrew.test",
    name: "Ada Admin",
    role: "admin",
    phone: "+41 79 100 00 01",
  },
  // Project Managers
  {
    id: "00000000-0000-4000-8000-000000000002",
    email: "pm.aier@startcrew.test",
    name: "Stefan Aier",
    role: "pm",
    phone: "+41 79 100 00 02",
  },
  {
    id: "00000000-0000-4000-8000-000000000003",
    email: "pm.mayer@startcrew.test",
    name: "Clara Mayer",
    role: "pm",
    phone: "+41 79 100 00 03",
  },
  // Team-Leads
  {
    id: "00000000-0000-4000-8000-000000000010",
    email: "lead.stagea@startcrew.test",
    name: "Luca Hoffmann",
    role: "lead",
    phone: "+41 79 100 00 10",
  },
  {
    id: "00000000-0000-4000-8000-000000000011",
    email: "lead.stageb@startcrew.test",
    name: "Maya Keller",
    role: "lead",
    phone: "+41 79 100 00 11",
  },
  {
    id: "00000000-0000-4000-8000-000000000012",
    email: "lead.catering@startcrew.test",
    name: "Jonas Weber",
    role: "lead",
    phone: "+41 79 100 00 12",
  },
  {
    id: "00000000-0000-4000-8000-000000000013",
    email: "lead.entrance@startcrew.test",
    name: "Sara Frei",
    role: "lead",
    phone: "+41 79 100 00 13",
  },
  {
    id: "00000000-0000-4000-8000-000000000014",
    email: "lead.backstage@startcrew.test",
    name: "Tim Brunner",
    role: "lead",
    phone: "+41 79 100 00 14",
  },
  {
    id: "00000000-0000-4000-8000-000000000015",
    email: "lead.av@startcrew.test",
    name: "Emma Mueller",
    role: "lead",
    phone: "+41 79 100 00 15",
  },
  {
    id: "00000000-0000-4000-8000-000000000016",
    email: "lead.mainhall@startcrew.test",
    name: "Noah Bucher",
    role: "lead",
    phone: "+41 79 100 00 16",
  },
  // Volunteers
  {
    id: "00000000-0000-4000-8000-000000000020",
    email: "volunteer01@startcrew.test",
    name: "Leon Roth",
    role: "volunteer",
    phone: "+41 79 200 00 01",
  },
  {
    id: "00000000-0000-4000-8000-000000000021",
    email: "volunteer02@startcrew.test",
    name: "Mia Schmid",
    role: "volunteer",
    phone: "+41 79 200 00 02",
  },
  {
    id: "00000000-0000-4000-8000-000000000022",
    email: "volunteer03@startcrew.test",
    name: "Finn Graf",
    role: "volunteer",
    phone: "+41 79 200 00 03",
  },
  {
    id: "00000000-0000-4000-8000-000000000023",
    email: "volunteer04@startcrew.test",
    name: "Lea Vogel",
    role: "volunteer",
    phone: "+41 79 200 00 04",
  },
  {
    id: "00000000-0000-4000-8000-000000000024",
    email: "volunteer05@startcrew.test",
    name: "Jan Bosch",
    role: "volunteer",
    phone: "+41 79 200 00 05",
  },
  {
    id: "00000000-0000-4000-8000-000000000025",
    email: "volunteer06@startcrew.test",
    name: "Lena Huber",
    role: "volunteer",
    phone: "+41 79 200 00 06",
  },
  {
    id: "00000000-0000-4000-8000-000000000026",
    email: "volunteer07@startcrew.test",
    name: "Nico Ammann",
    role: "volunteer",
    phone: "+41 79 200 00 07",
  },
  {
    id: "00000000-0000-4000-8000-000000000027",
    email: "volunteer08@startcrew.test",
    name: "Amelie Gerber",
    role: "volunteer",
    phone: "+41 79 200 00 08",
  },
  {
    id: "00000000-0000-4000-8000-000000000028",
    email: "volunteer09@startcrew.test",
    name: "David Kunz",
    role: "volunteer",
    phone: "+41 79 200 00 09",
  },
  {
    id: "00000000-0000-4000-8000-000000000029",
    email: "volunteer10@startcrew.test",
    name: "Sofia Lang",
    role: "volunteer",
    phone: "+41 79 200 00 10",
  },
  {
    id: "00000000-0000-4000-8000-00000000002a",
    email: "volunteer11@startcrew.test",
    name: "Felix Bucher",
    role: "volunteer",
    phone: "+41 79 200 00 11",
  },
  {
    id: "00000000-0000-4000-8000-00000000002b",
    email: "volunteer12@startcrew.test",
    name: "Nina Berger",
    role: "volunteer",
    phone: "+41 79 200 00 12",
  },
];

// ============================================================
// Teams (gleiche UUIDs wie in Migration 008)
// ============================================================
const DEMO_TEAMS = [
  {
    id: "00000000-0000-4000-9000-000000000001",
    name: "Stage A Crew",
    zone: "Stage A",
    lead_id: "00000000-0000-4000-8000-000000000010",
  },
  {
    id: "00000000-0000-4000-9000-000000000002",
    name: "Stage B Crew",
    zone: "Stage B",
    lead_id: "00000000-0000-4000-8000-000000000011",
  },
  {
    id: "00000000-0000-4000-9000-000000000003",
    name: "Catering Crew",
    zone: "Catering",
    lead_id: "00000000-0000-4000-8000-000000000012",
  },
  {
    id: "00000000-0000-4000-9000-000000000004",
    name: "Entrance Crew",
    zone: "Entrance",
    lead_id: "00000000-0000-4000-8000-000000000013",
  },
  {
    id: "00000000-0000-4000-9000-000000000005",
    name: "Backstage Crew",
    zone: "Backstage",
    lead_id: "00000000-0000-4000-8000-000000000014",
  },
  {
    id: "00000000-0000-4000-9000-000000000006",
    name: "AV/Tech Crew",
    zone: "AV/Tech",
    lead_id: "00000000-0000-4000-8000-000000000015",
  },
  {
    id: "00000000-0000-4000-9000-000000000007",
    name: "Main Hall Crew",
    zone: "Main Hall",
    lead_id: "00000000-0000-4000-8000-000000000016",
  },
];

// ============================================================
// Team-Zuordnung für Leads und Volunteers
// ============================================================
const TEAM_ASSIGNMENTS = {
  // Leads → ihr eigenes Team
  "00000000-0000-4000-8000-000000000010":
    "00000000-0000-4000-9000-000000000001",
  "00000000-0000-4000-8000-000000000011":
    "00000000-0000-4000-9000-000000000002",
  "00000000-0000-4000-8000-000000000012":
    "00000000-0000-4000-9000-000000000003",
  "00000000-0000-4000-8000-000000000013":
    "00000000-0000-4000-9000-000000000004",
  "00000000-0000-4000-8000-000000000014":
    "00000000-0000-4000-9000-000000000005",
  "00000000-0000-4000-8000-000000000015":
    "00000000-0000-4000-9000-000000000006",
  "00000000-0000-4000-8000-000000000016":
    "00000000-0000-4000-9000-000000000007",
  // Volunteers → je 2 pro Team, volunteer11+12 bleiben ohne Team
  "00000000-0000-4000-8000-000000000020":
    "00000000-0000-4000-9000-000000000001",
  "00000000-0000-4000-8000-000000000021":
    "00000000-0000-4000-9000-000000000001",
  "00000000-0000-4000-8000-000000000022":
    "00000000-0000-4000-9000-000000000002",
  "00000000-0000-4000-8000-000000000023":
    "00000000-0000-4000-9000-000000000002",
  "00000000-0000-4000-8000-000000000024":
    "00000000-0000-4000-9000-000000000005",
  "00000000-0000-4000-8000-000000000025":
    "00000000-0000-4000-9000-000000000005",
  "00000000-0000-4000-8000-000000000026":
    "00000000-0000-4000-9000-000000000006",
  "00000000-0000-4000-8000-000000000027":
    "00000000-0000-4000-9000-000000000006",
  "00000000-0000-4000-8000-000000000028":
    "00000000-0000-4000-9000-000000000007",
  "00000000-0000-4000-8000-000000000029":
    "00000000-0000-4000-9000-000000000007",
};

// ============================================================
// Heutiges Datum für Shift-Timestamps
// ============================================================
function todayAt(time) {
  const today = new Date().toISOString().slice(0, 10);
  return `${today}T${time}:00`;
}

// ============================================================
// Tasks (gleiche Daten wie Migration 008)
// ============================================================
const DEMO_TASKS = [
  // Stage A
  {
    id: "00000000-0000-4000-a000-000000000001",
    zone: "Stage A",
    task_name: "Traverse aufbauen",
    shift_start: todayAt("08:00"),
    shift_end: todayAt("10:00"),
    people_needed: 4,
    slots_remaining: 0,
    priority: "normal",
    status: "complete",
    description:
      "Haupt-Traverse Stage A montieren und auf Zielhöhe ziehen.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000002",
    zone: "Stage A",
    task_name: "Licht einstellen",
    shift_start: todayAt("13:00"),
    shift_end: todayAt("17:00"),
    people_needed: 3,
    slots_remaining: 1,
    priority: "warning",
    status: "open",
    description:
      "Movinglights auf Presets programmieren, Fokus-Run nach Skript.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000003",
    zone: "Stage A",
    task_name: "Sound-Check",
    shift_start: todayAt("17:00"),
    shift_end: todayAt("19:00"),
    people_needed: 3,
    slots_remaining: 3,
    priority: "critical",
    status: "open",
    description: "Line-Check, Gainstaging, Playback-Test.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  // Stage B
  {
    id: "00000000-0000-4000-a000-000000000011",
    zone: "Stage B",
    task_name: "Bühne aufbauen",
    shift_start: todayAt("07:00"),
    shift_end: todayAt("11:00"),
    people_needed: 5,
    slots_remaining: 0,
    priority: "normal",
    status: "complete",
    description:
      "Modulbühne Stage B stellen und Rückwand montieren.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000012",
    zone: "Stage B",
    task_name: "Kabel verlegen",
    shift_start: todayAt("12:00"),
    shift_end: todayAt("15:00"),
    people_needed: 4,
    slots_remaining: 2,
    priority: "warning",
    status: "open",
    description:
      "Audio- und Netzkabel zur FoH ziehen und sauber abkleben.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000013",
    zone: "Stage B",
    task_name: "Moderatorenpult",
    shift_start: todayAt("15:00"),
    shift_end: todayAt("16:30"),
    people_needed: 2,
    slots_remaining: 2,
    priority: "normal",
    status: "open",
    description: "Pult aufstellen, Mikro und Wasser bereitstellen.",
    created_by: "00000000-0000-4000-8000-000000000003",
  },
  // Catering
  {
    id: "00000000-0000-4000-a000-000000000021",
    zone: "Catering",
    task_name: "Küche vorbereiten",
    shift_start: todayAt("06:00"),
    shift_end: todayAt("09:00"),
    people_needed: 6,
    slots_remaining: 0,
    priority: "normal",
    status: "complete",
    description: "Mise en place, Kaffeemaschinen anheizen.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000022",
    zone: "Catering",
    task_name: "Mittagsservice",
    shift_start: todayAt("11:30"),
    shift_end: todayAt("14:00"),
    people_needed: 8,
    slots_remaining: 8,
    priority: "warning",
    status: "open",
    description: "Mittagessen an Buildweek-Crew ausgeben.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  // Entrance
  {
    id: "00000000-0000-4000-a000-000000000031",
    zone: "Entrance",
    task_name: "Empfangstresen aufstellen",
    shift_start: todayAt("07:00"),
    shift_end: todayAt("09:00"),
    people_needed: 3,
    slots_remaining: 0,
    priority: "normal",
    status: "complete",
    description: "Tresen aufbauen, Banner anbringen.",
    created_by: "00000000-0000-4000-8000-000000000003",
  },
  {
    id: "00000000-0000-4000-a000-000000000032",
    zone: "Entrance",
    task_name: "Badges sortieren",
    shift_start: todayAt("09:00"),
    shift_end: todayAt("11:00"),
    people_needed: 4,
    slots_remaining: 4,
    priority: "normal",
    status: "open",
    description: "Badges alphabetisch nach Firma vorsortieren.",
    created_by: "00000000-0000-4000-8000-000000000003",
  },
  // Backstage
  {
    id: "00000000-0000-4000-a000-000000000041",
    zone: "Backstage",
    task_name: "Catering Backstage",
    shift_start: todayAt("10:00"),
    shift_end: todayAt("13:00"),
    people_needed: 3,
    slots_remaining: 1,
    priority: "warning",
    status: "open",
    description:
      "Kühlschränke bestücken, Getränke nachliefern.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000042",
    zone: "Backstage",
    task_name: "Green Room einrichten",
    shift_start: todayAt("13:00"),
    shift_end: todayAt("15:00"),
    people_needed: 2,
    slots_remaining: 2,
    priority: "normal",
    status: "open",
    description:
      "Sofa stellen, Getränke, WLAN-Codes ausdrucken.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  // AV/Tech
  {
    id: "00000000-0000-4000-a000-000000000051",
    zone: "AV/Tech",
    task_name: "Kameras positionieren",
    shift_start: todayAt("09:00"),
    shift_end: todayAt("12:00"),
    people_needed: 4,
    slots_remaining: 2,
    priority: "critical",
    status: "open",
    description:
      "Drei Kameras aufstellen, Stream-Preview checken.",
    created_by: "00000000-0000-4000-8000-000000000003",
  },
  {
    id: "00000000-0000-4000-a000-000000000052",
    zone: "AV/Tech",
    task_name: "Streaming-Check",
    shift_start: todayAt("14:00"),
    shift_end: todayAt("16:00"),
    people_needed: 2,
    slots_remaining: 2,
    priority: "warning",
    status: "open",
    description:
      "Upload-Bandbreite, OBS-Scenes, Backup-Stream verifizieren.",
    created_by: "00000000-0000-4000-8000-000000000003",
  },
  // Main Hall
  {
    id: "00000000-0000-4000-a000-000000000061",
    zone: "Main Hall",
    task_name: "Stuhlreihen ausrichten",
    shift_start: todayAt("08:00"),
    shift_end: todayAt("11:00"),
    people_needed: 10,
    slots_remaining: 0,
    priority: "normal",
    status: "complete",
    description: "480 Stühle in 12 Reihen ausrichten.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000062",
    zone: "Main Hall",
    task_name: "Teppich verlegen",
    shift_start: todayAt("11:00"),
    shift_end: todayAt("13:30"),
    people_needed: 5,
    slots_remaining: 3,
    priority: "warning",
    status: "open",
    description:
      "Mittelgang-Teppich und Läufer zu den Bühnenseiten.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
  {
    id: "00000000-0000-4000-a000-000000000063",
    zone: "Main Hall",
    task_name: "Notausgänge markieren",
    shift_start: todayAt("14:00"),
    shift_end: todayAt("15:00"),
    people_needed: 2,
    slots_remaining: 2,
    priority: "critical",
    status: "open",
    description:
      "Leuchtmarkierungen anbringen, Fluchtwege freihalten.",
    created_by: "00000000-0000-4000-8000-000000000002",
  },
];

// ============================================================
// Assignments
// ============================================================
const DEMO_ASSIGNMENTS = [
  // Stage A Task 2: 2 Plätze besetzt
  {
    task_id: "00000000-0000-4000-a000-000000000002",
    volunteer_id: "00000000-0000-4000-8000-000000000020",
    team_id: "00000000-0000-4000-9000-000000000001",
    status: "assigned",
  },
  {
    task_id: "00000000-0000-4000-a000-000000000002",
    volunteer_id: "00000000-0000-4000-8000-000000000021",
    team_id: "00000000-0000-4000-9000-000000000001",
    status: "assigned",
  },
  // Stage B Task 2: 2 Plätze besetzt
  {
    task_id: "00000000-0000-4000-a000-000000000012",
    volunteer_id: "00000000-0000-4000-8000-000000000022",
    team_id: "00000000-0000-4000-9000-000000000002",
    status: "assigned",
  },
  {
    task_id: "00000000-0000-4000-a000-000000000012",
    volunteer_id: "00000000-0000-4000-8000-000000000023",
    team_id: "00000000-0000-4000-9000-000000000002",
    status: "assigned",
  },
  // Backstage Task 1: 2 Plätze besetzt
  {
    task_id: "00000000-0000-4000-a000-000000000041",
    volunteer_id: "00000000-0000-4000-8000-000000000024",
    team_id: "00000000-0000-4000-9000-000000000005",
    status: "assigned",
  },
  {
    task_id: "00000000-0000-4000-a000-000000000041",
    volunteer_id: "00000000-0000-4000-8000-000000000025",
    team_id: "00000000-0000-4000-9000-000000000005",
    status: "assigned",
  },
  // AV/Tech Task 1: 2 Plätze besetzt
  {
    task_id: "00000000-0000-4000-a000-000000000051",
    volunteer_id: "00000000-0000-4000-8000-000000000026",
    team_id: "00000000-0000-4000-9000-000000000006",
    status: "assigned",
  },
  {
    task_id: "00000000-0000-4000-a000-000000000051",
    volunteer_id: "00000000-0000-4000-8000-000000000027",
    team_id: "00000000-0000-4000-9000-000000000006",
    status: "assigned",
  },
  // Main Hall Task 2: 2 Plätze besetzt
  {
    task_id: "00000000-0000-4000-a000-000000000062",
    volunteer_id: "00000000-0000-4000-8000-000000000028",
    team_id: "00000000-0000-4000-9000-000000000007",
    status: "assigned",
  },
  {
    task_id: "00000000-0000-4000-a000-000000000062",
    volunteer_id: "00000000-0000-4000-8000-000000000029",
    team_id: "00000000-0000-4000-9000-000000000007",
    status: "assigned",
  },
];

// ============================================================
// Requests
// ============================================================
const DEMO_REQUESTS = [
  {
    team_id: "00000000-0000-4000-9000-000000000001",
    zone: "Stage A",
    people_needed: 2,
    shift_start: todayAt("17:00"),
    shift_end: todayAt("19:00"),
    skills: "Routing, Cableman",
    notes: "Sound-Check braucht dringend zwei extra Hands.",
    status: "open",
  },
  {
    team_id: "00000000-0000-4000-9000-000000000005",
    zone: "Backstage",
    people_needed: 1,
    shift_start: todayAt("10:00"),
    shift_end: todayAt("13:00"),
    skills: null,
    notes: "Eine Person zur Verstärkung im Green Room.",
    status: "partial",
  },
  {
    team_id: "00000000-0000-4000-9000-000000000006",
    zone: "AV/Tech",
    people_needed: 1,
    shift_start: todayAt("09:00"),
    shift_end: todayAt("12:00"),
    skills: "Videotechnik",
    notes: "Kameraführung — gern mit Broadcast-Erfahrung.",
    status: "filled",
  },
  {
    team_id: "00000000-0000-4000-9000-000000000003",
    zone: "Catering",
    people_needed: 3,
    shift_start: todayAt("11:30"),
    shift_end: todayAt("14:00"),
    skills: "Food-Safety-Know-how",
    notes: "Mittagsrush — drei Extras an die Stationen.",
    status: "open",
  },
  {
    team_id: "00000000-0000-4000-9000-000000000007",
    zone: "Main Hall",
    people_needed: 2,
    shift_start: todayAt("13:30"),
    shift_end: todayAt("15:00"),
    skills: null,
    notes: "Teppich bis um 13:30 nicht fertig, wir brauchen Nachschub.",
    status: "open",
  },
];

// ============================================================
// Notifications
// ============================================================
const DEMO_NOTIFICATIONS = [
  {
    from_user_id: "00000000-0000-4000-8000-000000000002",
    to_role: "lead",
    to_user_id: null,
    message:
      "Kickoff-Meeting heute 16:00 im Büro. Kurz und knapp.",
    is_read: false,
  },
  {
    from_user_id: "00000000-0000-4000-8000-000000000003",
    to_role: null,
    to_user_id: "00000000-0000-4000-8000-000000000010",
    message:
      "Stage A — zwei Personen noch für 17:00 gesucht.",
    is_read: false,
  },
  {
    from_user_id: "00000000-0000-4000-8000-000000000002",
    to_role: null,
    to_user_id: "00000000-0000-4000-8000-000000000012",
    message:
      "Danke für den reibungslosen Frühservice!",
    is_read: true,
  },
  {
    from_user_id: "00000000-0000-4000-8000-000000000003",
    to_role: "lead",
    to_user_id: null,
    message:
      "Wetterwarnung ab 18:00 — Equipment drinnen lagern.",
    is_read: false,
  },
  {
    from_user_id: "00000000-0000-4000-8000-000000000002",
    to_role: null,
    to_user_id: "00000000-0000-4000-8000-000000000014",
    message:
      "Künstler X kommt 30min früher. Bitte Backstage vorbereiten.",
    is_read: true,
  },
];

// ============================================================
// Forecasts (7 Zonen x 8 Slots = 56 Rows)
// ============================================================
const ZONES = [
  "Stage A",
  "Stage B",
  "Catering",
  "Entrance",
  "Backstage",
  "AV/Tech",
  "Main Hall",
];
const SLOTS = [
  "07:00",
  "09:00",
  "11:00",
  "13:00",
  "15:00",
  "17:00",
  "19:00",
  "21:00",
];
// Vorhergesagte Werte pro Zone (gleiche wie Migration 008)
const FORECAST_VALUES = {
  "Stage A": [2, 4, 5, 6, 6, 8, 5, 2],
  "Stage B": [3, 5, 6, 7, 7, 6, 4, 2],
  Catering: [5, 4, 8, 8, 3, 5, 6, 3],
  Entrance: [2, 5, 4, 3, 3, 4, 3, 2],
  Backstage: [1, 2, 3, 4, 4, 5, 4, 2],
  "AV/Tech": [2, 4, 5, 6, 6, 7, 5, 2],
  "Main Hall": [3, 6, 8, 9, 7, 10, 6, 3],
};

const DEMO_FORECASTS = [];
for (const zone of ZONES) {
  const values = FORECAST_VALUES[zone];
  for (let i = 0; i < SLOTS.length; i++) {
    DEMO_FORECASTS.push({
      zone,
      shift_slot: SLOTS[i],
      predicted_count: values[i],
    });
  }
}

// ============================================================
// Hauptlogik
// ============================================================
async function main() {
  console.log("=== START CREW Demo-Seed ===\n");

  // Schritt 0: Cleanup — bestehende Demo-Daten löschen
  console.log("Schritt 0: Bestehende Demo-Daten löschen...");

  // Auth-User sammeln: alle @startcrew.test und der Legacy-Admin admin@start.test.
  const { data: existingUsers } =
    await supabase.auth.admin.listUsers({ perPage: 1000 });
  const demoUsers = (existingUsers?.users || []).filter((u) => {
    if (!u.email) return false;
    return (
      u.email.endsWith("@startcrew.test") || u.email === "admin@start.test"
    );
  });
  const demoUserIds = demoUsers.map((u) => u.id);

  // Notifications VOR dem Auth-Cleanup säubern: from_user_id würde sonst
  // per ON DELETE SET NULL auf NULL wandern und die Zuordnung zu Demo-Usern
  // ginge verloren. Zusätzlich als Fallback das alte [DEMO]-Textpattern
  // mitlaufen lassen, falls ältere Seed-Runs noch Reste hinterlassen haben.
  if (demoUserIds.length > 0) {
    await supabase
      .from("notifications")
      .delete()
      .in("from_user_id", demoUserIds);
    await supabase
      .from("notifications")
      .delete()
      .in("to_user_id", demoUserIds);
  }
  await supabase.from("notifications").delete().like("message", "[DEMO]%");

  // Auth-User löschen (cascaded auf profiles)
  for (const u of demoUsers) {
    await supabase.auth.admin.deleteUser(u.id);
  }
  console.log(`  ${demoUsers.length} alte Auth-User entfernt.`);

  // Verwaiste Demo-Daten bereinigen — bevorzugt per fester UUID, mit dem
  // alten Textmuster als Fallback für historische Reseeds.
  const demoTaskIds = DEMO_TASKS.map((t) => t.id);
  const demoTeamIds = DEMO_TEAMS.map((t) => t.id);

  await supabase.from("tasks").delete().in("id", demoTaskIds);
  await supabase.from("tasks").delete().like("task_name", "%[DEMO]");
  await supabase.from("requests").delete().in("team_id", demoTeamIds);
  await supabase.from("requests").delete().like("notes", "[DEMO]%");
  await supabase
    .from("forecasts")
    .delete()
    .gte("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("teams").delete().in("id", demoTeamIds);
  await supabase.from("teams").delete().like("name", "[DEMO]%");
  console.log(
    "  Verwaiste Tasks/Requests/Notifications/Forecasts/Teams entfernt.\n"
  );

  // Schritt 1: Demo-User über Admin-API erstellen
  console.log("Schritt 1: Demo-User erstellen...");
  for (const user of DEMO_USERS) {
    // Per-User-Passwort erlaubt abweichende Logins wie den Legacy-Admin
    // (admin@start.test / test123), ohne den Rest des Seeds zu berühren.
    const password = user.password ?? DEMO_PASSWORD;
    const { data, error } = await supabase.auth.admin.createUser({
      email: user.email,
      password,
      email_confirm: true,
      user_metadata: { name: user.name, role: user.role },
      // Feste UUID damit alle Referenzen (Teams, Assignments) stimmen
      ...(user.id ? { id: user.id } : {}),
    });

    if (error) {
      console.error(`  FEHLER bei ${user.email}: ${error.message}`);
      continue;
    }
    console.log(`  ✓ ${user.email} (${user.role})`);
  }

  // Kurze Pause, damit der Trigger handle_new_user die Profile anlegen kann
  await new Promise((r) => setTimeout(r, 2000));

  // Schritt 2: Teams anlegen
  console.log("\nSchritt 2: Teams anlegen...");
  const { error: teamsError } = await supabase
    .from("teams")
    .insert(DEMO_TEAMS);
  if (teamsError) {
    console.error(`  FEHLER: ${teamsError.message}`);
  } else {
    console.log(`  ✓ ${DEMO_TEAMS.length} Teams angelegt.`);
  }

  // Schritt 3: Profile updaten (phone + team_id)
  console.log("\nSchritt 3: Profile updaten (phone + team_id)...");
  for (const user of DEMO_USERS) {
    const updates = { phone: user.phone };
    if (TEAM_ASSIGNMENTS[user.id]) {
      updates.team_id = TEAM_ASSIGNMENTS[user.id];
    }
    const { error } = await supabase
      .from("profiles")
      .update(updates)
      .eq("id", user.id);
    if (error) {
      console.error(`  FEHLER bei ${user.email}: ${error.message}`);
    }
  }
  console.log("  ✓ Profile aktualisiert.");

  // Schritt 4: Tasks einfügen
  console.log("\nSchritt 4: Tasks anlegen...");
  const { error: tasksError } = await supabase
    .from("tasks")
    .insert(DEMO_TASKS);
  if (tasksError) {
    console.error(`  FEHLER: ${tasksError.message}`);
  } else {
    console.log(`  ✓ ${DEMO_TASKS.length} Tasks angelegt.`);
  }

  // Schritt 5: Assignments einfügen
  console.log("\nSchritt 5: Assignments anlegen...");
  const { error: assignError } = await supabase
    .from("assignments")
    .insert(DEMO_ASSIGNMENTS);
  if (assignError) {
    console.error(`  FEHLER: ${assignError.message}`);
  } else {
    console.log(`  ✓ ${DEMO_ASSIGNMENTS.length} Assignments angelegt.`);
  }

  // Schritt 6: Requests einfügen
  console.log("\nSchritt 6: Requests anlegen...");
  const { error: reqError } = await supabase
    .from("requests")
    .insert(DEMO_REQUESTS);
  if (reqError) {
    console.error(`  FEHLER: ${reqError.message}`);
  } else {
    console.log(`  ✓ ${DEMO_REQUESTS.length} Requests angelegt.`);
  }

  // Schritt 7: Notifications einfügen
  console.log("\nSchritt 7: Notifications anlegen...");
  const { error: notifError } = await supabase
    .from("notifications")
    .insert(DEMO_NOTIFICATIONS);
  if (notifError) {
    console.error(`  FEHLER: ${notifError.message}`);
  } else {
    console.log(`  ✓ ${DEMO_NOTIFICATIONS.length} Notifications angelegt.`);
  }

  // Schritt 8: Forecasts einfügen
  console.log("\nSchritt 8: Forecasts anlegen...");
  const { error: forecastError } = await supabase
    .from("forecasts")
    .insert(DEMO_FORECASTS);
  if (forecastError) {
    console.error(`  FEHLER: ${forecastError.message}`);
  } else {
    console.log(`  ✓ ${DEMO_FORECASTS.length} Forecasts angelegt.`);
  }

  // Schritt 9: Config-Platzhalter für die Venue-Map setzen. value=null
  // sorgt dafür, dass der Admin-Block explizit seinen Upload-Empty-State
  // rendert, statt auf eine fehlende Config-Zeile zu laufen.
  console.log("\nSchritt 9: Config-Platzhalter venue_map_path setzen...");
  const { error: configError } = await supabase
    .from("config")
    .upsert({ key: "venue_map_path", value: null }, { onConflict: "key" });
  if (configError) {
    console.error(`  FEHLER: ${configError.message}`);
  } else {
    console.log("  ✓ config.venue_map_path vorgehalten.");
  }

  // Login-Zusammenfassung
  console.log("\n=== FERTIG ===\n");
  console.log(
    "Passwort für Demo-Accounts: StartCrew123! (Ausnahme unten markiert).\n"
  );
  console.log(
    "Rolle      | Email                            | Name             | Passwort"
  );
  console.log(
    "-----------|----------------------------------|------------------|---------------"
  );
  for (const u of DEMO_USERS) {
    const role = u.role.padEnd(10);
    const email = u.email.padEnd(34);
    const name = u.name.padEnd(16);
    const password = u.password ?? DEMO_PASSWORD;
    console.log(`${role} | ${email} | ${name} | ${password}`);
  }
  console.log(
    "\nvolunteer11 + volunteer12 sind bewusst OHNE Team — perfekt zum Testen."
  );
}

main().catch((err) => {
  console.error("Unerwarteter Fehler:", err);
  process.exit(1);
});
