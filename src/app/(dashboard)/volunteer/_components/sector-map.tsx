// Venue-Sektor-Map (§3.2). Kein interaktives Kartenwidget — laut docs
// bewusst ein Raster aus farbkodierten Kacheln. Farben nach
// staffed/required-Verhältnis: < 50 % rot, 50–89 % gelb, ≥ 90 % grün.

import type { Zone } from "@/lib/zones";

export type SectorTile = {
    zone: Zone;
    staffed: number;
    required: number;
};

type SectorMapProps = {
    tiles: SectorTile[];
};

export function SectorMap({ tiles }: SectorMapProps) {
    return (
        <section className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4">
                <h2 className="text-lg font-bold">Sektor-Karte</h2>
                <p className="text-sm text-foreground/60">
                    Wo wird gerade am meisten Hilfe gebraucht? Rot = unter 50 % besetzt.
                </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                {tiles.map((tile) => (
                    <SectorTileCard key={tile.zone} tile={tile} />
                ))}
            </div>
        </section>
    );
}

function SectorTileCard({ tile }: { tile: SectorTile }) {
    const ratio = tile.required > 0 ? tile.staffed / tile.required : 0;
    // Regeln direkt aus docs/user_profiles.md §Volunteer-Dev-Notes.
    const tone =
        ratio >= 0.9 ? "green" : ratio >= 0.5 ? "yellow" : "red";

    // Farbstufen als Klassen-Maps — Tailwind 4 greift "text-success-green" etc.
    // aus dem @theme-Block auf. Opacity-Werte halten die Kacheln dunkel-freundlich.
    const classes =
        tone === "green"
            ? "border-success-green/50 bg-success-green/10 text-success-green"
            : tone === "yellow"
              ? "border-signal-yellow/50 bg-signal-yellow/10 text-signal-yellow"
              : "border-urgent-red/50 bg-urgent-red/10 text-urgent-red";

    const pct = tile.required > 0 ? Math.round(ratio * 100) : 0;

    return (
        <div
            className={`rounded-lg border p-4 ${classes}`}
            // Kein Button — die Kacheln sind informativ, nicht interaktiv.
        >
            <div className="text-[10px] font-bold uppercase tracking-[0.08em] opacity-80">
                {tile.zone}
            </div>
            <div className="mt-1 text-2xl font-bold">{pct}%</div>
            <div className="mt-0.5 text-xs opacity-80">
                {tile.staffed} / {tile.required}
            </div>
        </div>
    );
}
