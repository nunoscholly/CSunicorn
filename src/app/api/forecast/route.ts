import { NextResponse } from "next/server";
import { triggerForecastUpdate } from "@/lib/forecast-trigger";

export async function POST() {
    try {
        await triggerForecastUpdate();
        return NextResponse.json({ ok: true });
    } catch {
        return NextResponse.json(
            { ok: false, error: "Forecast-Update fehlgeschlagen." },
            { status: 500 },
        );
    }
}
