// Button-Primitive für die App. Nur zwei Varianten, damit die Brand-Regel
// "Gelb ist Aktion, nicht Dekoration" wirklich durchgezogen wird:
//   - primary  → gelb mit schwarzer Schrift (Haupt-CTA pro Section)
//   - secondary → transparent, gelber Rand (Zweitoptionen, Abbrechen)
// Disabled-State ist in beiden Varianten grau, wie in brand_guidelines.md.

import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: "primary" | "secondary";
};

export function Button({
    variant = "primary",
    className = "",
    ...props
}: ButtonProps) {
    const base =
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-bold transition-colors disabled:cursor-not-allowed";

    // Disabled-Styles bewusst am Ende angehängt, damit sie Hover etc. überschreiben.
    // Primary-Disabled: transparent + Rand, Text auf foreground/70 — so liest
    // sich der Button weiter als Button, erfüllt aber WCAG-AA-Kontrast (≈4.8:1),
    // statt der alten grau-auf-schwarz-Kombination mit ca. 2.4:1 (UI-1).
    const styles =
        variant === "primary"
            ? "bg-signal-yellow text-background hover:bg-signal-yellow-hover disabled:border disabled:border-concrete/60 disabled:bg-transparent disabled:text-foreground/70"
            : "border border-signal-yellow text-signal-yellow hover:bg-signal-yellow/10 disabled:border-concrete/60 disabled:text-foreground/70 disabled:hover:bg-transparent";

    return (
        <button
            {...props}
            className={`${base} ${styles} ${className}`.trim()}
        />
    );
}
