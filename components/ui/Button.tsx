"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Icon, type IconName } from "./Icon";

/**
 * Button (docs/DESIGN.md §11.1). Four variants and no more.
 *
 *   primary   ink ground        the one action this view is for. ONE per view.
 *   mark      oxblood ground    destructive or corrective only — "Delete", "It's not mine".
 *                               It is never the buy button; red is a proofreader's pencil.
 *   outline   1px rule-field    the alternatives
 *   quiet     no chrome         the ones a first-time reader should not see
 *
 * States: rest / hover / :focus-visible (the one ring, from globals.css) / active (1px down) /
 * disabled (real tokens, 3.39:1 — never opacity, which fails contrast silently) / loading (the
 * label stays, a spinner takes the icon slot and the width is frozen so nothing jumps).
 *
 *   <Button>Download the kit</Button>
 *   <Button variant="outline" icon="print">Print</Button>
 *   <Button variant="mark" icon="trash" label="Delete this version" />   // icon-only: needs a name
 *   <Button loading>Saving…</Button>
 *   <Button href="/pricing" variant="quiet">See the packs</Button>
 */

type Variant = "primary" | "mark" | "outline" | "quiet";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, string> = {
  primary: "bg-[var(--ink)] text-[color:var(--on-ink)] border border-[var(--ink)] hover:bg-[var(--ink-hover)] hover:border-[var(--ink-hover)]",
  mark: "bg-[var(--mark)] text-[color:var(--on-mark)] border border-[var(--mark)] hover:bg-[var(--mark-deep)] hover:border-[var(--mark-deep)]",
  outline: "bg-transparent text-[color:var(--ink)] border border-[var(--rule-field)] hover:bg-[var(--sunken)] hover:border-[var(--ink-40)]",
  quiet: "bg-transparent text-[color:var(--ink-2)] border border-transparent hover:bg-[var(--sunken)] hover:text-[color:var(--ink)]",
};

const SIZE: Record<Size, string> = {
  sm: "h-[var(--control-h-sm)] px-[var(--s-4)] text-[length:var(--ui-13)]",
  md: "h-[var(--control-h)] px-[var(--s-6)] text-[length:var(--ui-15)]",
  lg: "h-[calc(var(--control-h)+8px)] px-[var(--s-8)] text-[length:var(--ui-17)]",
};

const BASE =
  "relative inline-flex items-center justify-center gap-[var(--s-3)] rounded-[var(--r-2)] " +
  "font-sans font-semibold leading-none whitespace-nowrap align-middle cursor-pointer " +
  "transition-[background-color,border-color,color,transform] duration-[var(--dur-1)] ease-[var(--ease-move)] " +
  "active:translate-y-px " +
  // Disabled is a real ground and a real ink, so the label stays readable at 3.39:1.
  "disabled:bg-[var(--sunken)] disabled:text-[color:var(--ink-40)] disabled:border-[var(--rule)] " +
  "disabled:cursor-not-allowed disabled:translate-y-0 disabled:pointer-events-none";

export type ButtonProps = {
  children?: ReactNode;
  variant?: Variant;
  size?: Size;
  icon?: IconName;
  /** Puts the icon after the label — for "next" and "external" actions. */
  iconEnd?: boolean;
  loading?: boolean;
  /** Required when there is no visible label. */
  label?: string;
  href?: string;
  /** Opens in a new tab, with the rel a new tab needs. For the print view and anything external. */
  newTab?: boolean;
  className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">;

export function Button({
  children, variant = "primary", size = "md", icon, iconEnd = false, loading = false,
  label, href, newTab = false, className = "", disabled, ...rest
}: ButtonProps) {
  const iconOnly = !children && (icon || label);
  const cls = [
    BASE,
    VARIANT[variant],
    iconOnly ? `h-[var(--control-h)] w-[var(--control-h)] px-0` : SIZE[size],
    className,
  ].join(" ");

  const iconSize = size === "sm" ? 16 : 20;
  const mark = loading ? <Spinner size={iconSize} /> : icon ? <Icon name={icon} size={iconSize} /> : null;

  const inner = (
    <>
      {!iconEnd && mark}
      {children}
      {iconEnd && mark}
    </>
  );

  if (href) {
    // `rest` goes onto the link too. It did not at first, and a Button rendered as a link silently
    // dropped its data-testid and its onClick — which is how "Practice interview" stopped being
    // findable and eleven e2e specs timed out waiting for it.
    const { type: _type, ...linkRest } = rest as Record<string, unknown>;
    void _type;
    return (
      <Link
        href={href as never}
        className={cls}
        aria-label={label}
        aria-disabled={disabled || undefined}
        target={newTab ? "_blank" : undefined}
        rel={newTab ? "noopener noreferrer" : undefined}
        {...linkRest}
      >
        {inner}
      </Link>
    );
  }
  return (
    <button
      type="button"
      className={cls}
      aria-label={label}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      {...rest}
    >
      {inner}
    </button>
  );
}

/** A 1px ring with one quarter inked. The global reduced-motion rule freezes it after one turn. */
export function Spinner({ size = 16, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`inline-block shrink-0 animate-spin rounded-full border-2 border-current border-r-transparent align-middle ${className}`}
      style={{ width: size, height: size, animationDuration: "700ms" }}
      aria-hidden
    />
  );
}
