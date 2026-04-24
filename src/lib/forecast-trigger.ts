import { execFile } from "node:child_process";
import path from "node:path";

let running: Promise<void> | null = null;

export async function triggerForecastUpdate(): Promise<void> {
    if (running) {
        console.log("[forecast] Lauf bereits aktiv, überspringe.");
        return;
    }

    running = runForecast();
    try {
        await running;
    } finally {
        running = null;
    }
}

async function runForecast(): Promise<void> {
    const projectRoot = process.cwd();
    const pythonPath = path.join(projectRoot, "ml", ".venv", "bin", "python");
    const scriptPath = path.join(projectRoot, "ml", "forecast.py");
    const cwd = path.join(projectRoot, "ml");

    return new Promise((resolve) => {
        execFile(
            pythonPath,
            [scriptPath],
            { cwd, timeout: 15_000 },
            (error, stdout, stderr) => {
                if (error) {
                    console.error("[forecast] Python-Fehler:", error.message);
                    if (stderr) console.error("[forecast] stderr:", stderr);
                } else {
                    console.log("[forecast] Prognose aktualisiert.");
                    if (stdout) {
                        const lines = stdout.trim().split("\n");
                        const summary = lines.slice(-12);
                        console.log("[forecast]", summary.join("\n[forecast] "));
                    }
                }
                resolve();
            },
        );
    });
}
