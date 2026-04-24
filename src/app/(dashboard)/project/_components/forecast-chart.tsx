// ML-Tagesprognose-Chart: Balkendiagramm für die 9 Build-Week-Tage.
// Höhe jedes Balkens = vorhergesagter Personalbedarf, Farbe = Status vom Python-Modell.
// Inline SVG ohne externe Charting-Bibliothek — hält die Bundle-Größe klein
// und erlaubt volle Kontrolle über Farben und Brand-Identity.

export type ForecastDay = {
    day: number;
    predictedPeople: number;
    status: "on_track" | "at_risk" | "behind";
    tasksActive: string;
};

type ForecastChartProps = {
    days: ForecastDay[];
};

// Beschriftungen für die X-Achse — Index 0 = Tag 1
const DAY_LABELS = [
    "Tag 1", "Tag 2", "Tag 3", "Tag 4", "Tag 5",
    "Tag 6", "Tag 7", "Tag 8", "Tag 9",
];

// Phasenzuordnung pro Tag: spiegelt die Build-Week-Struktur wider
// (Setup 1–5, Showday 6–7, Teardown 8–9)
const PHASE_LABELS: Record<number, string> = {
    1: "Setup", 2: "Setup", 3: "Setup", 4: "Setup", 5: "Setup",
    6: "Showday", 7: "Showday",
    8: "Teardown", 9: "Teardown",
};

// Farben nach Ampel-Logik: Signal Yellow für at_risk kommt aus der Brand-Identity
const STATUS_COLORS: Record<string, string> = {
    on_track: "#3ECF8E",
    at_risk: "#F5C800",   // Signal Yellow (#F5C800) aus docs/brand_guidelines.md
    behind: "#FF4D4D",
};

// Feste SVG-Dimensionen damit das viewBox-Skalieren konsistent funktioniert
const CHART_WIDTH = 720;
const CHART_HEIGHT = 280;
// PADDING_X gibt Platz für die Y-Achsen-Beschriftung links und Abstand rechts
const PADDING_X = 50;
const PADDING_TOP = 16;
// PADDING_BOTTOM muss Tag-Label + Phase-Label + etwas Abstand fassen
const PADDING_BOTTOM = 56;
const TOTAL_DAYS = 9;

export function ForecastChart({ days }: ForecastChartProps) {
    const maxValue = Math.max(1, ...days.map((d) => d.predictedPeople));

    const innerWidth = CHART_WIDTH - PADDING_X * 2;
    const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    // Jeder Tag bekommt eine gleich breite Gruppe; der Balken nutzt 60% davon,
    // der Rest bleibt als Abstand zwischen den Balken
    const barGroupWidth = innerWidth / TOTAL_DAYS;
    const barWidth = barGroupWidth * 0.6;
    const barOffset = (barGroupWidth - barWidth) / 2;

    // SVG-Y wächst nach unten, Werte aber nach oben — Formel dreht das um
    function yFor(value: number) {
        return PADDING_TOP + innerHeight * (1 - value / maxValue);
    }

    // Ticks bei 0 %, 25 %, 50 %, 75 %, 100 % des Maximalwerts
    const ticks = [0, 0.25, 0.5, 0.75, 1].map((r) => Math.round(maxValue * r));
    // Duplikate entfernen, die bei kleinen Maximalwerten entstehen können
    // (z. B. maxValue = 2: round(0) = round(0.25*2=0.5) = 0 oder 1)
    const uniqueTicks = Array.from(new Set(ticks)).sort((a, b) => a - b);

    return (
        <div className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4 flex items-baseline justify-between">
                <div>
                    <h2 className="text-lg font-bold">Tagesprognose — Personalbedarf</h2>
                    <p className="text-sm text-foreground/60">
                        ML-Vorhersage: Wie viele Leute brauchen wir pro Tag?
                    </p>
                </div>
                <Legend />
            </div>

            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full"
                role="img"
                aria-label="Tagesprognose Personalbedarf pro Tag"
            >
                {/* Y-Achse: Hilfslinien und Beschriftung */}
                {uniqueTicks.map((tick) => {
                    const y = yFor(tick);
                    return (
                        <g key={tick}>
                            <line
                                x1={PADDING_X}
                                x2={CHART_WIDTH - PADDING_X}
                                y1={y}
                                y2={y}
                                stroke="#2a2a2a"
                                strokeWidth={1}
                            />
                            <text
                                x={PADDING_X - 8}
                                y={y + 3}
                                fontSize={10}
                                textAnchor="end"
                                fill="#888"
                            >
                                {tick}
                            </text>
                        </g>
                    );
                })}

                {/* Balken pro Tag — Array.from erzeugt [1, 2, …, 9] ohne lodash */}
                {Array.from({ length: TOTAL_DAYS }, (_, i) => i + 1).map((dayNum) => {
                    // Fallback auf 0 / on_track wenn für diesen Tag noch keine Daten da sind
                    const dayData = days.find((d) => d.day === dayNum);
                    const people = dayData?.predictedPeople ?? 0;
                    const status = dayData?.status ?? "on_track";
                    const tasks = dayData?.tasksActive ?? "";

                    const x = PADDING_X + barGroupWidth * (dayNum - 1) + barOffset;
                    const barY = yFor(people);
                    // Math.max(0, …) verhindert negative Höhe bei Rundungsfehlern
                    const barHeight = Math.max(0, CHART_HEIGHT - PADDING_BOTTOM - barY);
                    const fill = STATUS_COLORS[status] ?? STATUS_COLORS.on_track;

                    return (
                        <g key={dayNum}>
                            {/* Balken — opacity 0.15 bei 0 Personen zeigt den Tag als
                                "leer" an ohne ihn komplett zu verstecken */}
                            <rect
                                x={x}
                                y={barY}
                                width={barWidth}
                                height={barHeight}
                                fill={fill}
                                opacity={people === 0 ? 0.15 : 0.85}
                                rx={3}  /* leicht abgerundete Ecken für weicheres Aussehen */
                            />
                            {/* Personenzahl über dem Balken */}
                            {people > 0 ? (
                                <text
                                    x={x + barWidth / 2}
                                    y={barY - 4}
                                    fontSize={11}
                                    fontWeight="bold"
                                    textAnchor="middle"
                                    fill="#eee"
                                >
                                    {people}
                                </text>
                            ) : null}
                            {/* Tag-Label */}
                            <text
                                x={x + barWidth / 2}
                                y={CHART_HEIGHT - PADDING_BOTTOM + 16}
                                fontSize={11}
                                textAnchor="middle"
                                fill="#bbb"
                            >
                                {DAY_LABELS[dayNum - 1]}
                            </text>
                            {/* Phase-Label */}
                            <text
                                x={x + barWidth / 2}
                                y={CHART_HEIGHT - PADDING_BOTTOM + 30}
                                fontSize={9}
                                textAnchor="middle"
                                fill="#666"
                            >
                                {PHASE_LABELS[dayNum]}
                            </text>
                            {/* Tooltip-Titel (hover) */}
                            <title>
                                {`Tag ${dayNum}: ${people} Personen (${status})\n${tasks}`}
                            </title>
                        </g>
                    );
                })}

                {/* Bodenlinie */}
                <line
                    x1={PADDING_X}
                    x2={CHART_WIDTH - PADDING_X}
                    y1={CHART_HEIGHT - PADDING_BOTTOM}
                    y2={CHART_HEIGHT - PADDING_BOTTOM}
                    stroke="#444"
                    strokeWidth={1}
                />
            </svg>

            {/* Leerer Zustand: erscheint wenn das Python-Skript noch nicht gelaufen ist */}
            {days.length === 0 ? (
                <p className="mt-3 text-center text-xs text-concrete">
                    Noch keine Forecast-Daten. Forecast wird automatisch
                    aktualisiert sobald Aufgaben geändert werden.
                </p>
            ) : null}
        </div>
    );
}

// Legende: Farbschlüssel für die drei Status-Stufen.
function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.08em] text-concrete">
            <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS.on_track }} />
                Im Plan
            </span>
            <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS.at_risk }} />
                Kritisch
            </span>
            <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 rounded-sm" style={{ background: STATUS_COLORS.behind }} />
                Verzögert
            </span>
        </div>
    );
}
