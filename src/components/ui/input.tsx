// Text-/Select-Inputs mit dunklem Feld und gelbem Focus-Ring.
// Begleit-Label (optional) in ALL CAPS gemäss brand_guidelines.md.

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

type BaseLabelProps = {
    label?: string;
};

type InputProps = InputHTMLAttributes<HTMLInputElement> & BaseLabelProps;

export function Input({ label, id, className = "", ...props }: InputProps) {
    return (
        <label className="block" htmlFor={id}>
            {label ? <span className={labelClass}>{label}</span> : null}
            <input
                id={id}
                {...props}
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
    ...props
}: TextareaProps) {
    return (
        <label className="block" htmlFor={id}>
            {label ? <span className={labelClass}>{label}</span> : null}
            <textarea
                id={id}
                {...props}
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
    ...props
}: SelectProps) {
    return (
        <label className="block" htmlFor={id}>
            {label ? <span className={labelClass}>{label}</span> : null}
            <select
                id={id}
                {...props}
                className={`${fieldBase} ${className}`.trim()}
            >
                {children}
            </select>
        </label>
    );
}
