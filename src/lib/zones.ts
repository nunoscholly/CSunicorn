// Feste Liste der physischen Zonen auf dem Build-Gelände. Quelle:
// docs/visualizations.md §1.3 und §3.2. An einer Stelle pflegen, damit
// Dropdowns, Fortschrittsbalken und die Sektor-Map identisch sind.

export const ZONES = [
    "Stage A",
    "Stage B",
    "Catering",
    "Entrance",
    "Backstage",
    "AV/Tech",
    "Main Hall",
] as const;

export type Zone = (typeof ZONES)[number];
