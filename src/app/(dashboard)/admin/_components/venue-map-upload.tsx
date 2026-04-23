// Upload-Widget für die Venue-Map. Neue Datei überschreibt die alte — in der
// Volunteer-Ansicht erscheint automatisch die aktuelle Version (Pfad steht
// im config-Table unter venue_map_path).

"use client";

import { useRef, useState, useTransition, type ChangeEvent, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { uploadVenueMapAction } from "../actions";

type VenueMapUploadProps = {
    currentPath: string | null;
};

export function VenueMapUpload({ currentPath }: VenueMapUploadProps) {
    // Verweis auf das verborgene <input type="file">, damit der Button
    // stilistisch konsistent bleibt und wir den Dateinamen spiegeln können.
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selected, setSelected] = useState<File | null>(null);
    const [flash, setFlash] = useState<
        { kind: "ok" | "error"; message: string } | null
    >(null);
    const [isPending, startTransition] = useTransition();

    function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0] ?? null;
        setSelected(file);
        setFlash(null);
    }

    function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selected) return;

        // FormData ist bei File-Uploads der sauberste Weg: Binary wird ohne
        // Base64-Overhead an die Server Action übertragen.
        const formData = new FormData();
        formData.append("file", selected);

        startTransition(async () => {
            const res = await uploadVenueMapAction(formData);
            if (res.ok) {
                setFlash({
                    kind: "ok",
                    message: "Karte hochgeladen. Alle Rollen sehen jetzt die neue Version.",
                });
                setSelected(null);
                if (fileInputRef.current) fileInputRef.current.value = "";
            } else {
                setFlash({ kind: "error", message: res.error });
            }
        });
    }

    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Venue-Map</h2>
                <p className="text-sm text-foreground/60">
                    PNG, PDF oder SVG. Neuer Upload ersetzt die aktuelle Karte.
                </p>
            </div>

            {currentPath ? (
                <div className="mb-4 rounded border border-concrete/20 bg-background/40 p-3 text-sm">
                    <div className="text-[10px] font-bold uppercase tracking-[0.1em] text-concrete">
                        Aktuell aktiv
                    </div>
                    <a
                        href={currentPath}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 inline-block font-bold text-signal-yellow hover:underline"
                    >
                        {currentPath}
                    </a>
                </div>
            ) : (
                <div className="mb-4 rounded border border-concrete/20 bg-background/40 p-3 text-sm text-foreground/60">
                    Noch keine Karte hochgeladen.
                </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-wrap items-center gap-3">
                <input
                    ref={fileInputRef}
                    id="venue-map-file"
                    type="file"
                    accept=".png,.pdf,.svg,image/png,image/svg+xml,application/pdf"
                    onChange={handleFileChange}
                    className="hidden"
                />
                {/* Label fungiert optisch als Button. Damit Keyboard-User
                    ihn erreichen, bekommt er tabIndex=0 und löst bei
                    Enter/Space einen Click auf das verborgene File-Input aus. */}
                <label
                    htmlFor="venue-map-file"
                    tabIndex={0}
                    role="button"
                    aria-label="Venue-Map-Datei auswählen (PNG, PDF oder SVG)"
                    onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            fileInputRef.current?.click();
                        }
                    }}
                    className="cursor-pointer rounded-md border border-concrete/40 bg-background px-3 py-2 text-sm text-foreground/80 hover:border-signal-yellow hover:text-signal-yellow focus:border-signal-yellow focus:text-signal-yellow focus:outline-none"
                >
                    Datei wählen
                </label>
                <span className="text-sm text-foreground/60">
                    {selected ? selected.name : "Keine Datei ausgewählt"}
                </span>
                <Button type="submit" disabled={!selected || isPending}>
                    {isPending ? "Lade hoch…" : "Hochladen"}
                </Button>
            </form>

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
