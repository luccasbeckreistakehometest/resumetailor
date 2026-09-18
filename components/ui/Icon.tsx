import type { CSSProperties } from "react";

/**
 * The icon set (docs/DESIGN.md §7.4). No package: 28 marks plus two brand glyphs live in
 * public/icons.svg, drawn twice — once on a 20px grid at 1.5px stroke, once on a 16px grid at
 * 1.25px. `size` picks the drawing; it never scales one into the other.
 *
 *   <Icon name="download" />                      20px, decorative, hidden from a screen reader
 *   <Icon name="check" size={16} />               the dense drawing
 *   <Icon name="trash" label="Delete this kit" /> the icon IS the label: given a role and a name
 *
 * An icon beside ui-15 text sits on the cap height, not the box, so the 16 set is nudged up half
 * a pixel — measured against a baseline overlay, not guessed.
 */

export const ICON_NAMES = [
  "mic", "keyboard", "document", "sheet-stack", "download", "print", "pencil", "check", "close",
  "flag", "search", "link", "external", "chevron-down", "chevron-right", "arrow-right",
  "arrow-left", "plus", "minus", "drag", "trash", "copy", "eye", "lock", "globe", "play",
  "history", "menu",
] as const;

export const BRAND_NAMES = ["linkedin", "whatsapp"] as const;

export type IconName = (typeof ICON_NAMES)[number];
export type BrandName = (typeof BRAND_NAMES)[number];

type Props = {
  name: IconName;
  /** 20 is the button, nav and section size; 16 is for dense rows, chips and inline text. */
  size?: 16 | 20;
  /** Give this when the icon is the only label — it becomes the accessible name. */
  label?: string;
  className?: string;
  style?: CSSProperties;
};

export function Icon({ name, size = 20, label, className = "", style }: Props) {
  return (
    <svg
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      style={{ verticalAlign: "-0.15em", transform: size === 16 ? "translateY(-0.5px)" : undefined, ...style }}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <use href={`/icons.svg#i${size}-${name}`} />
    </svg>
  );
}

/** The two brand marks are filled logos on a 24 grid — a shape, not a stroke (§7.4). */
export function Brand({ name, size = 20, label, className = "" }: { name: BrandName; size?: number; label?: string; className?: string }) {
  return (
    <svg width={size} height={size} className={`shrink-0 ${className}`} role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <use href={`/icons.svg#brand-${name}`} />
    </svg>
  );
}
