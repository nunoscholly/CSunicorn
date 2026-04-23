// Batch-Upload für den Bauplan: CSV → Validierung → Preview (10 Zeilen)
// → Bestätigen → Bulk-Insert. All-or-nothing, wie in docs/user_profiles.md
// festgelegt. Parsen passiert clientseitig, damit der User Fehler sofort sieht.

"use client";

import { useRef, useState, useTransition, type ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { bulkInsertTasksAction, type ParsedTaskRow } from "../actions";
import type { TaskPriority } from "@/lib/supabase/types";

// Erwartete Spalten gemäss docs/visualizations.md §4.3.
const REQUIRED_COLUMNS = [
    "zone",
    "task_name",
    "shift_start",
    "shift_end",
    "people_needed",
    "skills",
    "description",
    "priority",
] as const;

type RequiredColumn = (typeof REQUIRED_COLUMNS)[number];

type RowValidation = {
    index: number; // 1-basiert, damit Fehlermeldungen "Zeile 3" statt "Zeile 2" sagen.
    row: Partial<Record<RequiredColumn, string>>;
    parsed?: ParsedTaskRow;
    errors: string[];
};

const VALID_PRIORITIES: TaskPriority[] = ["critical", "warning", "normal"];

// ----------------------------------------------------------------------
// CSV-Parser
// ----------------------------------------------------------------------
// Simple, quote-aware Parser. Unterstützt doppelte Anführungszeichen als
// Escape ("" → "), CR/LF Zeilenumbrüche, Kommas innerhalb von Quotes.
// Reicht für gut geformte Exports aus Excel / Google Sheets aus und erspart
// eine zusätzliche NPM-Abhängigkeit.
function parseCsv(text: string): string[][] {
    const rows: string[][] = [];
    let current: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const c = text[i];

        if (inQuotes) {
            if (c === '"') {
                // Escape: "" innerhalb eines Feldes → einfaches "
                if (text[i + 1] === '"') {
                    field += '"';
                    i++;
                } else {
                    inQuotes = false;
                }
            } else {
                field += c;
            }
            continue;
        }

        if (c === '"') {
            inQuotes = true;
        } else if (c === ",") {
            current.push(field);
            field = "";
        } else if (c === "\n" || c === "\r") {
            // \r\n als einen Umbruch behandeln, damit keine leeren Zeilen entstehen.
            if (c === "\r" && text[i + 1] === "\n") i++;
            current.push(field);
            rows.push(current);
            current = [];
            field = "";
        } else {
            field += c;
        }
    }

    // Letzte Zeile (ohne abschliessenden Umbruch) nicht vergessen.
    if (field.length > 0 || current.length > 0) {
        current.push(field);
        rows.push(current);
    }

    // Komplett leere Zeilen rausfiltern.
    return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

// Versucht, einen String in einen ISO-Timestamp zu drehen. Akzeptiert bereits
// gültige ISO-Strings sowie Formate, die Date() selbst versteht (Browser-
// Implementation variiert, daher die Erfolgs-Prüfung über NaN).
function toIsoTimestamp(raw: string): string | null {
    const trimmed = raw.trim();
    if (!trimmed) return null;
    const date = new Date(trimmed);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
}

// Validiert eine einzelne Zeile und gibt die geparste Version zurück, falls
// alles okay ist. Fehler werden gesammelt, damit der User sie alle auf einmal
// sieht — nicht einen nach dem anderen im Pingpong.
function validateRow(
    index: number,
    record: Partial<Record<RequiredColumn, string>>,
): RowValidation {
    const errors: string[] = [];

    const zone = (record.zone ?? "").trim();
    const task_name = (record.task_name ?? "").trim();
    const shift_start_raw = (record.shift_start ?? "").trim();
    const shift_end_raw = (record.shift_end ?? "").trim();
    const people_needed_raw = (record.people_needed ?? "").trim();
    const priority_raw = ((record.priority ?? "").trim() || "normal").toLowerCase();

    if (!zone) errors.push("zone fehlt");
    if (!task_name) errors.push("task_name fehlt");

    const shift_start = toIsoTimestamp(shift_start_raw);
    const shift_end = toIsoTimestamp(shift_end_raw);
    if (!shift_start) errors.push("shift_start ist kein gültiger Zeitstempel");
    if (!shift_end) errors.push("shift_end ist kein gültiger Zeitstempel");
    if (shift_start && shift_end && shift_start >= shift_end) {
        errors.push("shift_end liegt nicht nach shift_start");
    }

    const people_needed = Number.parseInt(people_needed_raw, 10);
    if (!Number.isInteger(people_needed) || people_needed < 1) {
        errors.push("people_needed muss eine ganze Zahl ≥ 1 sein");
    }

    if (!VALID_PRIORITIES.includes(priority_raw as TaskPriority)) {
        errors.push(
            "priority muss einer von: critical, warning, normal sein",
        );
    }

    if (errors.length === 0) {
        const parsed: ParsedTaskRow = {
            zone,
            task_name,
            shift_start: shift_start!,
            shift_end: shift_end!,
            people_needed,
            skills: (record.skills ?? "").trim(),
            description: (record.description ?? "").trim(),
            priority: priority_raw as TaskPriority,
        };
        return { index, row: record, parsed, errors };
    }
    return { index, row: record, errors };
}

// ----------------------------------------------------------------------
// Komponente
// ----------------------------------------------------------------------

export function BatchTaskUpload() {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [validations, setValidations] = useState<RowValidation[]>([]);
    const [headerError, setHeaderError] = useState<string | null>(null);
    const [flash, setFlash] = useState<
        { kind: "ok" | "error"; message: string } | null
    >(null);
    const [isPending, startTransition] = useTransition();

    async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        setFlash(null);
        setHeaderError(null);
        setValidations([]);

        const file = event.target.files?.[0];
        if (!file) {
            setFileName(null);
            return;
        }
        setFileName(file.name);

        const text = await file.text();
        const rows = parseCsv(text);

        if (rows.length < 2) {
            setHeaderError("CSV enthält keine Datenzeilen.");
            return;
        }

        const header = rows[0].map((cell) => cell.trim().toLowerCase());
        const missing = REQUIRED_COLUMNS.filter((col) => !header.includes(col));
        if (missing.length > 0) {
            setHeaderError(
                `Fehlende Pflichtspalten: ${missing.join(", ")}`,
            );
            return;
        }

        // Map Spaltenname → Index, damit wir robust gegen Spaltenreihenfolge sind.
        const columnIndex: Record<RequiredColumn, number> = {} as Record<
            RequiredColumn,
            number
        >;
        for (const col of REQUIRED_COLUMNS) {
            columnIndex[col] = header.indexOf(col);
        }

        const parsed: RowValidation[] = rows.slice(1).map((cells, i) => {
            const record: Partial<Record<RequiredColumn, string>> = {};
            for (const col of REQUIRED_COLUMNS) {
                record[col] = cells[columnIndex[col]] ?? "";
            }
            return validateRow(i + 2, record); // i+2: +1 fürs Header, +1 für 1-basierte Zählung
        });
        setValidations(parsed);
    }

    function handleImport() {
        // .parsed ist dank des Filters nie undefined, daher reicht das
        // Non-Null-Assert — der zusätzliche Cast wäre redundant.
        const rowsToInsert: ParsedTaskRow[] = validations
            .filter((v) => v.parsed)
            .map((v) => v.parsed!);

        startTransition(async () => {
            const res = await bulkInsertTasksAction(rowsToInsert);
            if (res.ok) {
                setFlash({
                    kind: "ok",
                    message: `${res.data?.inserted ?? rowsToInsert.length} Tasks importiert.`,
                });
                setValidations([]);
                setFileName(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            } else {
                setFlash({ kind: "error", message: res.error });
            }
        });
    }

    const errorRows = validations.filter((v) => v.errors.length > 0);
    const validRows = validations.filter((v) => v.parsed);
    const hasErrors = errorRows.length > 0;
    // Preview: bis zu zehn Zeilen zeigen — Fehler zuerst, damit der User sie
    // nicht scrollen muss.
    const previewRows = [...errorRows, ...validRows].slice(0, 10);

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Bauplan-Import</h2>
                <p className="text-sm text-foreground/60">
                    CSV mit Spalten: {REQUIRED_COLUMNS.join(", ")}. All-or-nothing.
                </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
                <input
                    ref={fileInputRef}
                    id="batch-task-file"
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleFileChange}
                    className="hidden"
                />
                {/* Label fungiert optisch als Button. Damit Keyboard-User
                    ihn erreichen, bekommt er tabIndex=0 und löst bei
                    Enter/Space einen Click auf das verborgene File-Input aus. */}
                <label
                    htmlFor="batch-task-file"
                    tabIndex={0}
                    role="button"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }}
                    className="cursor-pointer rounded-md border border-concrete/40 bg-background px-3 py-2 text-sm text-foreground/80 hover:border-signal-yellow hover:text-signal-yellow focus:border-signal-yellow focus:text-signal-yellow focus:outline-none"
                >
                    CSV wählen
                </label>
                <span className="text-sm text-foreground/60">
                    {fileName ?? "Keine Datei ausgewählt"}
                </span>
            </div>

            {headerError ? (
                <div className="mt-4 rounded border border-urgent-red/40 bg-urgent-red/10 px-3 py-2 text-sm text-urgent-red">
                    {headerError}
                </div>
            ) : null}

            {validations.length > 0 ? (
                <div className="mt-6 space-y-4">
                    <div className="flex flex-wrap items-center gap-4 text-sm">
                        <StatusBadge
                            label={`${validRows.length} gültig`}
                            variant="success"
                        />
                        {hasErrors ? (
                            <StatusBadge
                                label={`${errorRows.length} fehlerhaft`}
                                variant="urgent"
                            />
                        ) : null}
                        <span className="text-foreground/60">
                            Vorschau: erste {previewRows.length} von {validations.length} Zeilen
                        </span>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full border-separate border-spacing-0 text-xs">
                            <thead>
                                <tr className="text-left uppercase tracking-[0.08em] text-concrete">
                                    <th className="border-b border-concrete/20 px-2 py-2 font-bold">
                                        Zeile
                                    </th>
                                    {REQUIRED_COLUMNS.map((col) => (
                                        <th
                                            key={col}
                                            className="border-b border-concrete/20 px-2 py-2 font-bold"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                    <th className="border-b border-concrete/20 px-2 py-2 font-bold">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.map((v) => (
                                    <tr
                                        key={v.index}
                                        className={
                                            v.errors.length > 0
                                                ? "bg-urgent-red/5"
                                                : ""
                                        }
                                    >
                                        <td className="border-b border-concrete/10 px-2 py-1.5 text-foreground/60">
                                            {v.index}
                                        </td>
                                        {REQUIRED_COLUMNS.map((col) => (
                                            <td
                                                key={col}
                                                className="max-w-[180px] truncate border-b border-concrete/10 px-2 py-1.5 text-foreground/80"
                                                title={v.row[col]}
                                            >
                                                {v.row[col] || (
                                                    <span className="text-concrete">—</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="border-b border-concrete/10 px-2 py-1.5">
                                            {v.errors.length === 0 ? (
                                                <StatusBadge
                                                    label="OK"
                                                    variant="success"
                                                />
                                            ) : (
                                                <span
                                                    className="text-urgent-red"
                                                    title={v.errors.join("; ")}
                                                >
                                                    {v.errors.join("; ")}
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="flex items-center gap-3">
                        <Button
                            type="button"
                            onClick={handleImport}
                            disabled={isPending || hasErrors || validRows.length === 0}
                        >
                            {isPending
                                ? "Importiere…"
                                : `${validRows.length} Tasks importieren`}
                        </Button>
                        {hasErrors ? (
                            <span className="text-sm text-urgent-red">
                                Erst alle Fehler beheben, dann importieren.
                            </span>
                        ) : null}
                    </div>
                </div>
            ) : null}

            {flash ? (
                <div
                    className={[
                        "mt-4 rounded border px-3 py-2 text-sm",
                        flash.kind === "ok"
                            ? "border-success-green/40 bg-success-green/10 text-success-green"
                            : "border-urgent-red/40 bg-urgent-red/10 text-urgent-red",
                    ].join(" ")}
                >
                    {flash.message}
                </div>
            ) : null}
        </section>
    );
}
