// ML-Bemannungs-Prognose-Chart (§1.2).
// Gruppierter Balkenchart über die acht 2h-Slots einer Build-Schicht.
// Pro Slot drei Balken:
//   - "Ist"         → gelb, gefüllt
//   - "Prognose"    → transparent mit gelbem Rand
//   - "Fehlbedarf"  → rot, nur wenn Ist < Prognose
// Slots in der Zukunft bekommen 40% Deckkraft, damit klar ist: hier ist
// nichts passiert, nur vorhergesagt.
//
// Umsetzung als inline SVG — keine zusätzliche Charting-Bibliothek. Das
// Schaubild muss nicht interaktiv sein, nur klar lesbar.

export type ForecastSlot = {
    label: string; // "07:00", "09:00", ...
    actual: number;
    predicted: number;
    isFuture: boolean;
};

type ForecastChartProps = {
    slots: ForecastSlot[];
};

// SVG-Viewport. Wir nutzen feste Einheiten und lassen das <svg> preserveAspectRatio
// die Grösse dynamisch anpassen.
const CHART_WIDTH = 720;
const CHART_HEIGHT = 260;
const PADDING_X = 40;
const PADDING_TOP = 16;
const PADDING_BOTTOM = 40;
const BAR_GROUP_GAP_RATIO = 0.35; // 35% der Gruppenbreite als Abstand zur nächsten.

export function ForecastChart({ slots }: ForecastChartProps) {
    // Gesamtes Maximum für die Y-Skalierung: wir nehmen den höheren Wert
    // von actual oder predicted. Mindestens 1, damit der Chart bei leerem
    // Datensatz nicht kollabiert.
    const maxValue = Math.max(
        1,
        ...slots.map((s) => Math.max(s.actual, s.predicted)),
    );

    const innerWidth = CHART_WIDTH - PADDING_X * 2;
    const innerHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM;

    // Breite einer Slot-Gruppe (3 Balken + Abstand zur nächsten Gruppe).
    const groupWidth = innerWidth / slots.length;
    const barsAreaWidth = groupWidth * (1 - BAR_GROUP_GAP_RATIO);
    const barWidth = barsAreaWidth / 3;

    function yFor(value: number) {
        return PADDING_TOP + innerHeight * (1 - value / maxValue);
    }

    // Drei Y-Axis-Ticks: 0, maxValue/2, maxValue. Gerundet, und dupliziert-
    // Werte entfernt — bei sehr kleinem maxValue (z. B. 1) kollabieren sonst
    // zwei Ticks auf denselben Wert und React meldet doppelte Keys.
    const ticks = Array.from(
        new Set([0, Math.round(maxValue / 2), Math.round(maxValue)]),
    ).sort((a, b) => a - b);

    return (
        <div className="rounded-xl border border-concrete/20 bg-surface p-6">
            <div className="mb-4 flex items-baseline justify-between">
                <div>
                    <h2 className="text-lg font-bold">Bemannung heute</h2>
                    <p className="text-sm text-foreground/60">
                        Ist vs. Prognose über den Tag — 2h-Slots 07:00–21:00.
                    </p>
                </div>
                <Legend />
            </div>

            <svg
                viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
                preserveAspectRatio="xMidYMid meet"
                className="w-full"
                role="img"
                aria-label="Bemannungs-Prognose pro 2h-Slot"
            >
                {/* Y-Achse-Ticks + horizontale Hilfslinien */}
                {ticks.map((tick) => {
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

                {/* Balkengruppen pro Slot */}
                {slots.map((slot, idx) => {
                    const groupStartX = PADDING_X + groupWidth * idx;
                    const actualX = groupStartX;
                    const predictedX = groupStartX + barWidth;
                    const shortage = Math.max(0, slot.predicted - slot.actual);
                    const shortageX = groupStartX + barWidth * 2;

                    // Zukunftsslots werden abgedunkelt. "actual" ist dort per
                    // Definition 0 — daher nicht sichtbar, aber wir malen ihn
                    // trotzdem, um die Gruppenbreite konstant zu halten.
                    const opacity = slot.isFuture ? 0.4 : 1;

                    const yActual = yFor(slot.actual);
                    const yPredicted = yFor(slot.predicted);
                    const yShortage = yFor(shortage);

                    return (
                        <g key={slot.label} opacity={opacity}>
                            {/* Ist (gelb gefüllt) */}
                            <rect
                                x={actualX}
                                y={yActual}
                                width={barWidth}
                                height={Math.max(0, CHART_HEIGHT - PADDING_BOTTOM - yActual)}
                                fill="#F5C800"
                            />
                            {/* Prognose (nur Rand) */}
                            <rect
                                x={predictedX}
                                y={yPredicted}
                                width={barWidth}
                                height={Math.max(
                                    0,
                                    CHART_HEIGHT - PADDING_BOTTOM - yPredicted,
                                )}
                                fill="transparent"
                                stroke="#F5C800"
                                strokeWidth={1.5}
                            />
                            {/* Fehlbedarf (rot) — nur rendern, wenn positiv */}
                            {shortage > 0 ? (
                                <rect
                                    x={shortageX}
                                    y={yShortage}
                                    width={barWidth}
                                    height={Math.max(
                                        0,
                                        CHART_HEIGHT - PADDING_BOTTOM - yShortage,
                                    )}
                                    fill="#FF4D4D"
                                />
                            ) : null}
                            {/* X-Achse-Label */}
                            <text
                                x={groupStartX + barsAreaWidth / 2}
                                y={CHART_HEIGHT - PADDING_BOTTOM + 18}
                                fontSize={11}
                                textAnchor="middle"
                                fill="#bbb"
                            >
                                {slot.label}
                            </text>
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

            {slots.every((s) => s.predicted === 0 && s.actual === 0) ? (
                <p className="mt-3 text-center text-xs text-concrete">
                    Noch keine Prognose verfügbar.
                </p>
            ) : null}
        </div>
    );
}

// Mini-Legende oben rechts. Drei Swatches + Text.
function Legend() {
    return (
        <div className="flex flex-wrap items-center gap-3 text-[10px] font-bold uppercase tracking-[0.08em] text-concrete">
            <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 bg-signal-yellow" />
                Ist
            </span>
            <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 border border-signal-yellow" />
                Prognose
            </span>
            <span className="flex items-center gap-1">
                <span className="inline-block h-3 w-3 bg-urgent-red" />
                Fehlbedarf
            </span>
        </div>
    );
}
