"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";

/**
 * First-visit guided tour. Steps anchor to `data-tour` attributes across the landing and the app;
 * progress and completion are saved on the server (per user, or per anonymous cookie) so it never
 * replays, and the first session's actions are logged with it.
 */
type Rect = { top: number; left: number; width: number; height: number };
/** Tour v2: six steps; the free tools and the finale live on the tools hub (in the visitor's language). */
const ANCHORS = ["choose", "free-tools", "credits", "nav-library", "interview", "hub"];
const routeFor = (anchor: string, hub: string): string | undefined =>
  ({ choose: "/start", "free-tools": hub, "nav-library": "/library", interview: "/library", hub } as Record<string, string>)[anchor];

/** The first anchor for a step that is actually on screen (desktop and mobile render different ones). */
function visibleAnchor(name: string): HTMLElement | null {
  const all = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${name}"]`));
  return all.find((el) => {
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) return false;
    const style = window.getComputedStyle(el);
    return style.visibility !== "hidden" && style.display !== "none";
  }) ?? null;
}

export function Tour() {
  const { x, l, r, to } = useI18n();
  const hub = to("tools");
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "welcome" | "running" | "done">("idle");
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);
  // Which way the visitor is moving, so a step with nothing visible (e.g. a desktop-only link on a phone) is skipped in that direction.
  const direction = useRef<1 | -1>(1);

  useEffect(() => {
    // Never on the admin panel, the print view, or a résumé someone was sent a link to.
    if (pathname.startsWith("/admin") || pathname.startsWith("/print") || pathname.startsWith("/cv/")) return;
    fetch("/api/tour", { cache: "no-store" }).then((r) => r.json()).then((j) => {
      if (j.tourCompleted) return setState("done");
      const seen = sessionStorage.getItem("rt_tour_seen");
      if (!seen) {
        sessionStorage.setItem("rt_tour_seen", "1");
        fetch("/api/tour", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "visit", meta: { path: pathname } }) });
      }
      if (j.tourStep > 0 && j.tourStep < ANCHORS.length) { setStep(j.tourStep); setState("running"); }
      else if (!seen) setState("welcome");
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const save = useCallback((s: number, completed = false, event?: string) => {
    fetch("/api/tour", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ step: s, completed, event }) }).catch(() => {});
  }, []);

  const measure = useCallback(() => {
    if (state !== "running") return;
    const el = visibleAnchor(ANCHORS[step]);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
  }, [state, step]);

  useLayoutEffect(() => {
    if (state !== "running") return;
    const wanted = routeFor(ANCHORS[step], hub);
    if (wanted && pathname !== wanted) { router.push(wanted as never); return; }
    const id = window.setTimeout(measure, 120);
    // Nothing to point at once the page has settled: move on instead of showing an empty spotlight.
    const skip = window.setTimeout(() => {
      if (visibleAnchor(ANCHORS[step])) return;
      const next = step + direction.current;
      if (next < 0 || next >= ANCHORS.length) { setState("done"); save(step, true, "tour_done"); return; }
      setStep(next); save(next);
    }, 1500);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { window.clearTimeout(id); window.clearTimeout(skip); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [state, step, pathname, measure, router, save, hub]);

  useEffect(() => {
    if (state !== "running" || !rect) return;
    visibleAnchor(ANCHORS[step])?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state, step, rect]);

  if (state === "idle" || state === "done") return null;

  if (state === "welcome") {
    return (
      <div className="fixed bottom-5 left-5 z-[85] w-[min(92vw,360px)]" data-testid="tour-welcome">
        <div className="card p-5">
          <p className="eyebrow">ResumeTailor</p>
          <p className="font-display mt-1 text-xl text-ink">{l.tourWelcome}</p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary !py-2 !text-sm" onClick={() => { setState("running"); setStep(0); save(0, false, "tour_start"); }} data-testid="tour-start">{x.tour.start}</button>
            <button className="btn btn-ghost !py-2 !text-sm" onClick={() => { setState("done"); save(0, true, "tour_skip"); }} data-testid="tour-later">{x.tour.later}</button>
          </div>
        </div>
      </div>
    );
  }

  const s = r.tour.steps[step];
  const last = step === ANCHORS.length - 1;
  const cardStyle = rect
    ? { top: Math.min(window.innerHeight - 220, rect.top + rect.height + 12), left: Math.max(12, Math.min(rect.left, window.innerWidth - 360)) }
    : { bottom: 20, right: 20 };

  return (
    <>
      {/* Nothing to point at (hidden on this screen): no empty spotlight, just the card. */}
      <div className="tour-mask">{rect && <div className="tour-hole" data-testid="tour-hole" style={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }} />}</div>
      <div className="tour-card card p-5" style={cardStyle} data-testid="tour-step" data-step={step} data-total={ANCHORS.length}>
        <p className="eyebrow">{step + 1} / {ANCHORS.length}</p>
        <p className="font-display mt-1 text-xl text-ink">{s.t}</p>
        <p className="mt-2 text-sm text-ink-2">{s.b}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="text-sm text-muted hover:text-ink" onClick={() => { setState("done"); save(step, true, "tour_skip"); }}>{x.tour.skip}</button>
          <div className="flex gap-2">
            {step > 0 && <button className="btn btn-ghost !py-1.5 !text-sm" onClick={() => { direction.current = -1; setStep(step - 1); save(step - 1); }}>{x.tour.back}</button>}
            <button className="btn btn-ink !py-1.5 !text-sm" data-testid="tour-next" onClick={() => {
              direction.current = 1;
              if (last) { setState("done"); save(step, true, "tour_done"); } else { setStep(step + 1); save(step + 1); }
            }}>{last ? x.tour.done : x.tour.next}</button>
          </div>
        </div>
      </div>
    </>
  );
}
