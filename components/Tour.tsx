"use client";

import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useI18n } from "@/app/i18n/I18nProvider";

/**
 * First-visit guided tour. Steps anchor to `data-tour` attributes across the landing and the app;
 * progress and completion are saved on the server (per user, or per anonymous cookie) so it never
 * replays, and the first session's actions are logged with it.
 */
type Rect = { top: number; left: number; width: number; height: number };
const ANCHORS = ["nav-start", "choose", "credits", "nav-library"];
const ROUTE_FOR: Record<string, string> = { "nav-start": "/", choose: "/start", credits: "/start", "nav-library": "/start" };

export function Tour() {
  const { x } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [state, setState] = useState<"idle" | "welcome" | "running" | "done">("idle");
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (pathname.startsWith("/admin") || pathname.startsWith("/print")) return;
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
    const el = document.querySelector<HTMLElement>(`[data-tour="${ANCHORS[step]}"]`);
    if (!el) return setRect(null);
    const r = el.getBoundingClientRect();
    setRect({ top: r.top - 8, left: r.left - 8, width: r.width + 16, height: r.height + 16 });
  }, [state, step]);

  useLayoutEffect(() => {
    if (state !== "running") return;
    const wanted = ROUTE_FOR[ANCHORS[step]];
    if (wanted && pathname !== wanted) { router.push(wanted as never); return; }
    const id = window.setTimeout(measure, 120);
    window.addEventListener("resize", measure); window.addEventListener("scroll", measure, true);
    return () => { window.clearTimeout(id); window.removeEventListener("resize", measure); window.removeEventListener("scroll", measure, true); };
  }, [state, step, pathname, measure, router]);

  useEffect(() => {
    if (state !== "running" || !rect) return;
    const el = document.querySelector<HTMLElement>(`[data-tour="${ANCHORS[step]}"]`);
    el?.scrollIntoView({ block: "center", behavior: "smooth" });
  }, [state, step, rect]);

  if (state === "idle" || state === "done") return null;

  if (state === "welcome") {
    return (
      <div className="fixed bottom-5 left-5 z-[85] w-[min(92vw,360px)]" data-testid="tour-welcome">
        <div className="card p-5">
          <p className="eyebrow">ResumeTailor</p>
          <p className="font-display mt-1 text-xl text-ink">{x.tour.welcome}</p>
          <div className="mt-4 flex gap-2">
            <button className="btn btn-primary !py-2 !text-sm" onClick={() => { setState("running"); setStep(0); save(0, false, "tour_start"); }} data-testid="tour-start">{x.tour.start}</button>
            <button className="btn btn-ghost !py-2 !text-sm" onClick={() => { setState("done"); save(0, true, "tour_skip"); }} data-testid="tour-later">{x.tour.later}</button>
          </div>
        </div>
      </div>
    );
  }

  const s = x.tour.steps[step];
  const last = step === ANCHORS.length - 1;
  const cardStyle = rect
    ? { top: Math.min(window.innerHeight - 220, rect.top + rect.height + 12), left: Math.max(12, Math.min(rect.left, window.innerWidth - 360)) }
    : { bottom: 20, right: 20 };

  return (
    <>
      <div className="tour-mask"><div className="tour-hole" style={rect ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height } : { top: -9999, left: -9999, width: 0, height: 0 }} /></div>
      <div className="tour-card card p-5" style={cardStyle} data-testid="tour-step" data-step={step}>
        <p className="eyebrow">{step + 1} / {ANCHORS.length}</p>
        <p className="font-display mt-1 text-xl text-ink">{s.t}</p>
        <p className="mt-2 text-sm text-ink-2">{s.b}</p>
        <div className="mt-4 flex items-center justify-between">
          <button className="text-sm text-muted hover:text-ink" onClick={() => { setState("done"); save(step, true, "tour_skip"); }}>{x.tour.skip}</button>
          <div className="flex gap-2">
            {step > 0 && <button className="btn btn-ghost !py-1.5 !text-sm" onClick={() => { setStep(step - 1); save(step - 1); }}>{x.tour.back}</button>}
            <button className="btn btn-ink !py-1.5 !text-sm" data-testid="tour-next" onClick={() => {
              if (last) { setState("done"); save(step, true, "tour_done"); } else { setStep(step + 1); save(step + 1); }
            }}>{last ? x.tour.done : x.tour.next}</button>
          </div>
        </div>
      </div>
    </>
  );
}
