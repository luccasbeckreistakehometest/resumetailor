"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

const noop = () => () => {};

/**
 * Renders overlays on document.body. The sticky header uses backdrop-filter, which would make it
 * the containing block of any `position: fixed` child — a modal inside it would be clipped.
 */
export function Portal({ children }: { children: React.ReactNode }) {
  const client = useSyncExternalStore(noop, () => true, () => false);
  return client ? createPortal(children, document.body) : null;
}
