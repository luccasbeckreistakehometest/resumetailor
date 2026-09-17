import { ImageResponse } from "next/og";
import { getGeneration } from "@/lib/server/generations";
import { getPublicBySlug } from "@/lib/server/publicResumes";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Web résumé on ResumeTailor";

/**
 * The card WhatsApp and LinkedIn unfurl. A PIN-protected or unavailable page shows nothing
 * personal; an open one shows the name and the target role. Satori: every div with more than
 * one child is display:flex.
 */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const row = getPublicBySlug(slug);
  const gen = row && row.enabled === 1 && !row.pinHash ? getGeneration(row.generationId) : null;
  const name = gen?.title ?? "Résumé";
  const role = gen?.targetRole ?? "";
  const locked = !!row?.pinHash;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f4efe6", color: "#1b1713", fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", width: 44, height: 44, alignItems: "center", justifyContent: "center", borderRadius: 10, background: "#1b1713", color: "#f4efe6", fontSize: 30 }}>R</div>
          <div style={{ display: "flex", fontSize: 30, letterSpacing: -0.5 }}>ResumeTailor</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "flex", fontSize: 22, letterSpacing: 4, textTransform: "uppercase", color: "#6f655b" }}>{locked ? "Protected web résumé" : "Web résumé"}</div>
          <div style={{ display: "flex", fontSize: locked ? 56 : 78, lineHeight: 1.05, fontWeight: 700 }}>{locked ? "Open with the PIN" : name}</div>
          {role && !locked ? <div style={{ display: "flex", fontSize: 36, color: "#8a2432" }}>{role}</div> : null}
        </div>
        <div style={{ display: "flex", height: 14, width: "100%", background: "#8a2432", borderRadius: 7 }} />
      </div>
    ),
    size,
  );
}
