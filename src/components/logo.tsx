// START CREW Doppel-Keil-Wordmark. START-Block gelb/schwarz, CREW-Block
// transparent mit weisser Schrift. Regel aus docs/brand_guidelines.md:
// Gewicht 900 nur auf ALL CAPS, Tracking leicht offen.

type LogoProps = {
    size?: "sm" | "md";
};

export function Logo({ size = "md" }: LogoProps) {
    const textSize = size === "sm" ? "text-sm" : "text-base";
    const padding = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";

    return (
        <div className="inline-flex items-stretch select-none">
            <span
                className={`bg-signal-yellow text-background font-black tracking-[0.05em] ${textSize} ${padding}`}
            >
                START
            </span>
            <span
                className={`bg-white/10 text-foreground font-black tracking-[0.05em] ${textSize} ${padding}`}
            >
                CREW
            </span>
        </div>
    );
}
