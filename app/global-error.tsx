"use client";

import { useSyncExternalStore } from "react";
import { launch } from "./i18n/launch";

const noop = () => () => {};
const browserLang = (): "en" | "pt" | "es" => {
  let saved: string | null = null;
  try { saved = localStorage.getItem("rt_lang"); } catch {}
  const v = (saved || navigator.language || "en").toLowerCase();
  return v.startsWith("pt") ? "pt" : v.startsWith("es") ? "es" : "en";
};

/**
 * Replaces the root layout when it fails: no providers, no global CSS — so it carries its own
 * Paper & Ink styles and picks the language straight from the browser.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const lang = useSyncExternalStore(noop, browserLang, () => "en" as const);
  const E = launch[lang].errorPages;
  const btn = { display: "inline-block", padding: "12px 20px", borderRadius: 999, fontWeight: 600, textDecoration: "none", margin: 6, fontSize: 15 } as const;
  return (
    <html lang={lang === "pt" ? "pt-BR" : lang}>
      <body style={{ margin: 0, minHeight: "100vh", background: "#f4efe6", color: "#1b1713", fontFamily: "Georgia, 'Times New Roman', serif", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
        <title>ResumeTailor</title>
        <main style={{ maxWidth: 520, textAlign: "center" }}>
          <p style={{ fontSize: 22, margin: 0 }}>Resume<span style={{ color: "#8a2432" }}>Tailor</span></p>
          <h1 style={{ fontSize: 32, margin: "28px 0 8px" }}>{E.errorTitle}</h1>
          <p style={{ fontFamily: "system-ui, sans-serif", color: "#3d3630", lineHeight: 1.5 }}>{E.errorText}</p>
          {error.digest && <p style={{ fontFamily: "system-ui, sans-serif", color: "#6f655b", fontSize: 12 }}>ref: {error.digest}</p>}
          <div style={{ marginTop: 24, fontFamily: "system-ui, sans-serif" }}>
            <button onClick={() => retry()} style={{ ...btn, border: 0, background: "#8a2432", color: "#fff", cursor: "pointer" }}>{E.retry}</button>
            {/* Plain anchors on purpose: the router may be what broke, so these reload the page. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...btn, border: "1px solid #c9bda8", color: "#1b1713" }}>{E.home}</a>
            <a href="/contact" style={{ ...btn, border: "1px solid #c9bda8", color: "#1b1713" }}>{E.contact}</a>
          </div>
        </main>
      </body>
    </html>
  );
}
