"use client";

import { useEffect, useRef } from "react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Modal behaviour for a dialog element: focus moves in on open (first field, or the element
 * marked data-autofocus), Tab stays inside, Escape closes, and focus returns where it was.
 */
export function useDialog<T extends HTMLElement>(onClose: () => void) {
  const ref = useRef<T | null>(null);
  const close = useRef(onClose);
  useEffect(() => { close.current = onClose; }, [onClose]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const before = document.activeElement as HTMLElement | null;
    const items = () => Array.from(node.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null || el === document.activeElement);
    const first = node.querySelector<HTMLElement>("[data-autofocus]") ?? items()[0];
    const id = window.setTimeout(() => first?.focus(), 0);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopPropagation(); close.current(); return; }
      if (e.key !== "Tab") return;
      const list = items();
      if (!list.length) return;
      const firstEl = list[0], lastEl = list[list.length - 1];
      if (e.shiftKey && (document.activeElement === firstEl || !node.contains(document.activeElement))) { e.preventDefault(); lastEl.focus(); }
      else if (!e.shiftKey && (document.activeElement === lastEl || !node.contains(document.activeElement))) { e.preventDefault(); firstEl.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener("keydown", onKey);
      try { before?.focus?.(); } catch {}
    };
  }, []);

  return ref;
}
