"use client";

import { useId, type ReactNode, type TextareaHTMLAttributes, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { Icon } from "./Icon";

/**
 * Form controls (docs/DESIGN.md §11.2). The label sits ABOVE the field and stays visible — a
 * placeholder is not a label. Every state is designed: rest, hover, focus, filled, invalid,
 * disabled, read-only, loading, and with a counter when there is a maxLength.
 *
 *   <Field label="Your e-mail" help="We only use it to send the kit.">
 *     {(p) => <Input {...p} type="email" placeholder="you@example.com" />}
 *   </Field>
 *
 *   <Field label="Paste the job ad" error="Paste at least 200 characters." count={{ value, max: 8000 }}>
 *     {(p) => <Textarea {...p} rows={6} value={value} onChange={…} />}
 *   </Field>
 *
 * The render-prop hands the control its id, aria-describedby and aria-invalid, so the label, the
 * help line and the error are wired to the right element without the caller remembering to.
 */

export type ControlProps = {
  id: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
  invalid?: boolean;
};

export function Field({
  label, help, error, count, required, optional, children, className = "",
}: {
  label: string;
  help?: string;
  error?: string;
  count?: { value: number; max: number };
  required?: boolean;
  /** Says so in words rather than leaving the reader to infer it from a missing asterisk. */
  optional?: boolean;
  children: (props: ControlProps) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;
  const pct = count ? count.value / count.max : 0;

  return (
    <div className={`flex flex-col gap-[var(--s-3)] ${className}`}>
      <label htmlFor={id} className="flex items-baseline gap-[var(--s-3)] font-sans text-[length:var(--density-label)] font-medium text-[var(--ink-2)]">
        {label}
        {required && <span className="text-[var(--mark)]" aria-hidden>·</span>}
        {optional && <span className="text-[var(--ink-muted)] font-normal">optional</span>}
      </label>
      {children({ id, "aria-describedby": describedBy, "aria-invalid": error ? true : undefined, invalid: !!error })}
      {(error || help || count) && (
        <div className="flex items-baseline justify-between gap-[var(--s-4)]">
          <div className="min-w-0">
            {error && (
              <p id={errorId} className="flex items-center gap-[var(--s-2)] font-sans text-[length:var(--ui-13)] text-[var(--mark)]">
                <Icon name="flag" size={16} /> {error}
              </p>
            )}
            {help && !error && <p id={helpId} className="font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[var(--ink-muted)]">{help}</p>}
          </div>
          {count && (
            <span
              className="shrink-0 font-mono text-[length:var(--ui-12)] tabular-nums"
              style={{ color: pct >= 1 ? "var(--mark)" : pct >= 0.9 ? "var(--query)" : "var(--ink-muted)" }}
            >
              {count.value.toLocaleString()}/{count.max.toLocaleString()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* The one edge, the one ring. A field is discernible without relying on its placeholder: the
   border is 3.19:1 in light and 3.67:1 in dark, both past WCAG 1.4.11. */
const CONTROL =
  "w-full rounded-[var(--r-1)] border bg-[var(--sheet)] px-[var(--s-4)] font-sans " +
  "text-[length:var(--density-body)] text-[var(--ink)] " +
  "transition-[border-color] duration-[var(--dur-1)] ease-[var(--ease-move)] " +
  "placeholder:text-[var(--ink-40)] " +
  "hover:enabled:border-[var(--ink-40)] focus:border-[var(--ink)] focus:outline-none " +
  "disabled:cursor-not-allowed disabled:bg-[var(--sunken)] disabled:border-[var(--rule)] disabled:text-[var(--ink-40)] " +
  "read-only:bg-[var(--sunken)] read-only:border-[var(--rule-hairline)]";

const edge = (invalid?: boolean) => (invalid ? "border-[var(--mark)]" : "border-[var(--rule-field)]");

export function Input({ invalid, className = "", ...rest }: { invalid?: boolean } & InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${CONTROL} ${edge(invalid)} h-[var(--control-h)] ${className}`} {...rest} />;
}

export function Select({ invalid, className = "", children, ...rest }: { invalid?: boolean } & SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select className={`${CONTROL} ${edge(invalid)} h-[var(--control-h)] appearance-none pr-[var(--s-9)] ${className}`} {...rest}>
        {children}
      </select>
      <Icon name="chevron-down" size={16} className="pointer-events-none absolute right-[var(--s-4)] top-1/2 -translate-y-1/2 text-[var(--ink-muted)]" />
    </div>
  );
}

export function Textarea({ invalid, className = "", ...rest }: { invalid?: boolean } & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${CONTROL} ${edge(invalid)} resize-y py-[var(--s-4)] leading-[var(--doc-15-lh)] ${className}`} {...rest} />;
}

/** A 20px box we draw, because a native control cannot be given the system's edge or its ring. */
export function Checkbox({ label, className = "", ...rest }: { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <Tick type="checkbox" label={label} className={className} {...rest} />;
}

export function Radio({ label, className = "", ...rest }: { label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  return <Tick type="radio" label={label} className={className} {...rest} />;
}

function Tick({ type, label, className = "", ...rest }: { type: "checkbox" | "radio"; label: ReactNode } & Omit<InputHTMLAttributes<HTMLInputElement>, "type">) {
  const round = type === "radio" ? "rounded-full" : "rounded-[var(--r-1)]";
  return (
    <label className={`group inline-flex cursor-pointer items-start gap-[var(--s-3)] font-sans text-[length:var(--density-body)] text-[var(--ink)] has-[:disabled]:cursor-not-allowed has-[:disabled]:text-[var(--ink-40)] ${className}`}>
      <span className="relative mt-[2px] grid h-5 w-5 shrink-0 place-items-center">
        <input type={type} className="peer absolute inset-0 h-5 w-5 cursor-pointer appearance-none disabled:cursor-not-allowed" {...rest} />
        <span
          aria-hidden
          className={`pointer-events-none grid h-5 w-5 place-items-center border border-[var(--rule-field)] bg-[var(--sheet)] ${round}
            transition-colors duration-[var(--dur-1)]
            group-hover:border-[var(--ink-40)]
            peer-checked:border-[var(--ink)] peer-checked:bg-[var(--ink)] peer-checked:text-[var(--on-ink)]
            peer-checked:[&_*]:opacity-100
            peer-disabled:border-[var(--rule)] peer-disabled:bg-[var(--sunken)] peer-disabled:text-[var(--ink-40)]`}
        >
          {type === "checkbox"
            ? <Icon name="check" size={16} className="opacity-0" />
            : <span className="h-2 w-2 rounded-full bg-current opacity-0" />}
        </span>
      </span>
      <span>{label}</span>
    </label>
  );
}
