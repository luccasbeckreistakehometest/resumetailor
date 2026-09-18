"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Portal } from "@/components/Portal";
import { useDialog } from "@/components/useDialog";
import { Button } from "./Button";
import { Icon } from "./Icon";

/**
 * Things that sit over the page (docs/DESIGN.md §11.5). Every one of them: focus moves in, Tab
 * stays inside, Escape closes, focus returns where it was — that behaviour lives in useDialog and
 * is not re-implemented per overlay. Nothing here slides across the screen; entering moves ≤8px.
 *
 * The floating support circle is NOT here, and is not coming back: nothing floats over content at
 * 390px. Support is a quiet button in the footer and in the account menu.
 */

/** A dialog: --r-3, the one pop shadow, 480px, actions right-aligned with the primary last. */
export function Dialog({
  open, onClose, title, children, actions, width = 480,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  width?: number;
}) {
  if (!open) return null;
  return (
    <Portal>
      <DialogBody onClose={onClose} title={title} actions={actions} width={width}>{children}</DialogBody>
    </Portal>
  );
}

function DialogBody({ onClose, title, children, actions, width }: { onClose: () => void; title: string; children: ReactNode; actions?: ReactNode; width: number }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center overflow-y-auto bg-[rgba(28,25,19,.55)] p-0 sm:items-center sm:p-[var(--s-7)]">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="enter w-full rounded-t-[var(--r-3)] border border-[var(--rule)] bg-[var(--page)] shadow-[var(--shadow-pop)] sm:rounded-[var(--r-3)]"
        style={{ maxWidth: width }}
      >
        <header className="flex items-start justify-between gap-[var(--s-5)] border-b border-[var(--rule-hairline)] px-[var(--s-7)] py-[var(--s-5)]">
          <h2 className="ui-21 text-[var(--ink)]">{title}</h2>
          <Button variant="quiet" size="sm" icon="close" label="Close" onClick={onClose} />
        </header>
        <div className="px-[var(--s-7)] py-[var(--s-6)] font-sans text-[length:var(--ui-15)] leading-[var(--ui-15-lh)] text-[var(--ink-2)]">{children}</div>
        {actions && (
          <footer className="flex flex-wrap justify-end gap-[var(--s-3)] border-t border-[var(--rule-hairline)] px-[var(--s-7)] py-[var(--s-5)]">{actions}</footer>
        )}
      </div>
    </div>
  );
}

/** A drawer is the phone's answer to a rail: same content, off the right edge, full height. */
export function Drawer({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  if (!open) return null;
  return (
    <Portal>
      <DrawerBody onClose={onClose} title={title}>{children}</DrawerBody>
    </Portal>
  );
}

function DrawerBody({ onClose, title, children }: { onClose: () => void; title: string; children: ReactNode }) {
  const ref = useDialog<HTMLDivElement>(onClose);
  return (
    <div className="fixed inset-0 z-[100] flex justify-end bg-[rgba(28,25,19,.55)]">
      <div ref={ref} role="dialog" aria-modal="true" aria-label={title} className="enter-x flex h-full w-full max-w-[360px] flex-col border-l border-[var(--rule)] bg-[var(--page)]">
        <header className="flex items-center justify-between gap-[var(--s-5)] border-b border-[var(--rule-hairline)] px-[var(--s-6)] py-[var(--s-4)]">
          <h2 className="ui-19 text-[var(--ink)]">{title}</h2>
          <Button variant="quiet" size="sm" icon="close" label="Close" onClick={onClose} />
        </header>
        <div className="flex-1 overflow-y-auto p-[var(--s-6)]">{children}</div>
      </div>
    </div>
  );
}

/**
 * A tooltip names an icon-only control. It is not a place for prose, it appears on hover AND on
 * keyboard focus, and it is the control's accessible description rather than its name.
 */
export function Tooltip({ text, children, className = "" }: { text: string; children: ReactNode; className?: string }) {
  const [show, setShow] = useState(false);
  return (
    <span
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      {children}
      {show && (
        <span role="tooltip" className="enter pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] px-[var(--s-3)] py-[var(--s-2)] font-sans text-[length:var(--ui-12)] text-[var(--ink)] shadow-[var(--shadow-pop)]">
          {text}
        </span>
      )}
    </span>
  );
}

/**
 * A toast reports what just happened, in the corner, and leaves. It is polite by default and
 * assertive when it is a mark — an error must interrupt a screen reader, a save must not.
 */
export function Toast({
  message, tone = "neutral", onDone, ms = 4000,
}: { message: string; tone?: "neutral" | "mark" | "kept"; onDone: () => void; ms?: number }) {
  const done = useRef(onDone);
  useEffect(() => { done.current = onDone; }, [onDone]);
  useEffect(() => {
    const id = window.setTimeout(() => done.current(), ms);
    return () => window.clearTimeout(id);
  }, [ms]);

  const icon = tone === "mark" ? "flag" : tone === "kept" ? "check" : "document";
  const ink = tone === "mark" ? "var(--mark)" : tone === "kept" ? "var(--kept)" : "var(--ink-muted)";
  return (
    <Portal>
      <div role="status" aria-live={tone === "mark" ? "assertive" : "polite"} className="fixed bottom-[var(--s-6)] left-1/2 z-[110] w-[min(420px,calc(100vw-32px))] -translate-x-1/2 sm:left-auto sm:right-[var(--s-6)] sm:translate-x-0">
        <div className="enter flex items-start gap-[var(--s-4)] rounded-[var(--r-2)] border border-[var(--rule)] bg-[var(--raised)] px-[var(--s-5)] py-[var(--s-4)] shadow-[var(--shadow-pop)]">
          <span style={{ color: ink }} className="mt-[1px]"><Icon name={icon} size={16} /></span>
          <p className="flex-1 font-sans text-[length:var(--ui-13)] leading-[var(--ui-13-lh)] text-[var(--ink)]">{message}</p>
          <button type="button" onClick={onDone} aria-label="Dismiss" className="cursor-pointer text-[var(--ink-muted)] hover:text-[var(--ink)]"><Icon name="close" size={16} /></button>
        </div>
      </div>
    </Portal>
  );
}
