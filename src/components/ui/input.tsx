// Text-/Select-Inputs mit dunklem Feld und gelbem Focus-Ring.
// Begleit-Label (optional) in ALL CAPS gemäss brand_guidelines.md.

import { useId, type FormEvent } from "react";
import type {
    InputHTMLAttributes,
    SelectHTMLAttributes,
    TextareaHTMLAttributes,
} from "react";

const fieldBase =
    "w-full rounded-md border border-concrete/30 bg-surface px-3 py-2 text-sm text-foreground placeholder:text-concrete focus:border-signal-yellow focus:outline-none disabled:opacity-60";

// Label-Style in eine Konstante gezogen, damit wir ihn auch ausserhalb dieser
// Komponenten (z. B. für Radio-Gruppen) wiederverwenden können.
export const labelClass =
    "mb-1 block text-[10px] font-bold uppercase tracking-[0.1em] text-concrete";

// Deutsche Fehlermeldungen für die native HTML5-Validierung. Der Browser
// liefert die Standardtexte sonst in der OS-Sprache — meist englisch —
// was mit der deutschen UI bricht (docs/ux_findings_playwright.md §UX-1).
// Wir lesen `validity`-Flags und setzen passende setCustomValidity-Texte.
function applyGermanValidity(
    target: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
) {
    const v = target.validity;
    if (v.valid) {
        target.setCustomValidity("");
        return;
    }
    if (v.valueMissing) {
        target.setCustomValidity("Bitte ausfüllen.");
        return;
    }
    if (v.typeMismatch) {
        // Differenzieren wir grob nach Typ, damit die Meldung nützlich ist.
        if ((target as HTMLInputElement).type === "email") {
            target.setCustomValidity("Bitte eine gültige E-Mail eingeben.");
        } else {
            target.setCustomValidity("Ungültiger Wert.");
        }
        return;
    }
    if (v.tooShort) {
        target.setCustomValidity(
            `Mindestens ${(target as HTMLInputElement).minLength} Zeichen.`,
        );
        return;
    }
    if (v.rangeUnderflow) {
        target.setCustomValidity(
            `Mindestens ${(target as HTMLInputElement).min}.`,
        );
        return;
    }
    if (v.rangeOverflow) {
        target.setCustomValidity(
            `Höchstens ${(target as HTMLInputElement).max}.`,
        );
        return;
    }
    if (v.patternMismatch) {
        target.setCustomValidity("Format stimmt nicht.");
        return;
    }
    target.setCustomValidity("Bitte Eingabe prüfen.");
}

// onInput-Handler räumt die Custom-Message wieder weg, sobald der User
// korrigiert — sonst bliebe der rote Rand ewig kleben, auch wenn der
// Wert inzwischen gültig ist.
function clearCustomValidityOnInput(
    event: FormEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
) {
    event.currentTarget.setCustomValidity("");
}

type BaseLabelProps = {
    label?: string;
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & BaseLabelProps;

export function Input({
    label,
    id,
    className = "",
    onInvalid,
    onInput,
    ...props
}: InputProps) {
    // Wenn der Caller keine id mitgibt, vergeben wir eine stabile. Sonst zeigt
    // `htmlFor` auf undefined und Screenreader/Axe warnen.
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <label className="block" htmlFor={fieldId}>
            {label ? <span className={labelClass}>{label}</span> : null}
            <input
                id={fieldId}
                {...props}
                onInvalid={(event) => {
                    applyGermanValidity(event.currentTarget);
                    onInvalid?.(event);
                }}
                onInput={(event) => {
                    clearCustomValidityOnInput(event);
                    onInput?.(event);
                }}
                className={`${fieldBase} ${className}`.trim()}
            />
        </label>
    );
}

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & BaseLabelProps;

export function Textarea({
    label,
    id,
    className = "",
    onInvalid,
    onInput,
    ...props
}: TextareaProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <label className="block" htmlFor={fieldId}>
            {label ? <span className={labelClass}>{label}</span> : null}
            <textarea
                id={fieldId}
                {...props}
                onInvalid={(event) => {
                    applyGermanValidity(event.currentTarget);
                    onInvalid?.(event);
                }}
                onInput={(event) => {
                    clearCustomValidityOnInput(event);
                    onInput?.(event);
                }}
                className={`${fieldBase} min-h-[80px] ${className}`.trim()}
            />
        </label>
    );
}

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & BaseLabelProps;

export function Select({
    label,
    id,
    className = "",
    children,
    onInvalid,
    onInput,
    ...props
}: SelectProps) {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
        <label className="block" htmlFor={fieldId}>
            {label ? <span className={labelClass}>{label}</span> : null}
            <select
                id={fieldId}
                {...props}
                onInvalid={(event) => {
                    applyGermanValidity(event.currentTarget);
                    onInvalid?.(event);
                }}
                onInput={(event) => {
                    clearCustomValidityOnInput(event);
                    onInput?.(event);
                }}
                className={`${fieldBase} ${className}`.trim()}
            >
                {children}
            </select>
        </label>
    );
}
