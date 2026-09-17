import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "ResumeTailor — your résumé, tailored to the job";

/** The default share card: Paper & Ink, one line of promise, the match score motif. Satori needs display:flex on every multi-child div. */
export default function Image() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#f4efe6", color: "#1b1713", fontFamily: "Georgia, serif" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", width: 56, height: 56, alignItems: "center", justifyContent: "center", borderRadius: 12, background: "#1b1713", color: "#f4efe6", fontSize: 38 }}>R</div>
          <div style={{ display: "flex", fontSize: 38, letterSpacing: -0.5 }}>
            <span>Resume</span><span style={{ color: "#8a2432" }}>Tailor</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, maxWidth: 900 }}>
          <div style={{ display: "flex", fontSize: 74, lineHeight: 1.04, fontWeight: 700 }}>Your résumé, tailored to the job.</div>
          <div style={{ display: "flex", fontSize: 32, color: "#3d3630" }}>Résumé · cover letter · LinkedIn · interview practice — EN · PT · ES</div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div style={{ display: "flex", fontSize: 30, color: "#6f655b" }}>Match</div>
          <div style={{ display: "flex", fontSize: 44, color: "#6f655b" }}>41</div>
          <div style={{ display: "flex", fontSize: 44, color: "#b8862b" }}>→</div>
          <div style={{ display: "flex", fontSize: 64, color: "#2e5d4e", fontWeight: 700 }}>89</div>
          <div style={{ display: "flex", flex: 1, height: 12, background: "#8a2432", borderRadius: 6, marginLeft: 24 }} />
        </div>
      </div>
    ),
    size,
  );
}
