import { foldText } from "@/lib/ats/truth";

/**
 * "Sounds human?": the phrases and patterns that make a résumé read like it came out of a chatbot,
 * per language, with the lines that gave it away and a 0–100 score. Pure, no AI; also used in the
 * free ATS check (in the browser) and, for the top phrases, as a "never write these" prompt rule.
 */
export type ClicheLang = "en" | "pt" | "es";

export const CLICHES: Record<ClicheLang, string[]> = {
  en: [
    "results-driven", "results-oriented", "spearheaded", "leverage", "leveraged", "synergy", "synergies", "passionate about", "go-getter", "dynamic",
    "detail-oriented", "team player", "self-starter", "proactive", "hard-working", "hardworking", "think outside the box", "best-in-class", "cutting-edge",
    "seasoned professional", "proven track record", "track record of success", "strategic thinker", "value-add", "move the needle", "game-changer",
    "thought leader", "rockstar", "ninja", "guru", "wear many hats", "fast-paced environment", "excellent communication skills", "strong work ethic",
    "go above and beyond", "dedicated professional", "highly motivated", "motivated professional", "in today's", "delve", "tapestry", "robust",
    "seamlessly", "meticulous",
  ],
  pt: [
    "proativo", "proativa", "dinamico", "dinamica", "apaixonado por", "apaixonada por", "vasta experiencia", "ampla experiencia", "sinergia",
    "pensar fora da caixa", "focado em resultados", "focada em resultados", "orientado a resultados", "orientada a resultados", "perfil multitarefa",
    "multitarefa", "trabalho em equipe", "facilidade de aprendizado", "facilidade em aprender", "comprometido", "comprometida", "responsavel e pontual",
    "vestir a camisa", "sede de aprender", "busco novos desafios", "em busca de novos desafios", "agregar valor", "alavancar", "alavanquei",
    "profissional dedicado", "profissional dedicada", "altamente motivado", "altamente motivada", "excelente comunicacao", "boa comunicacao",
    "perfil analitico", "resiliente", "fora da curva", "de ponta a ponta", "robusto", "robusta",
  ],
  es: [
    "proactivo", "proactiva", "dinamico", "dinamica", "apasionado por", "apasionada por", "orientado a resultados", "orientada a resultados",
    "sinergia", "sinergias", "pensar fuera de la caja", "amplia experiencia", "vasta experiencia", "trabajo en equipo", "multitarea", "comprometido",
    "comprometida", "altamente motivado", "altamente motivada", "aportar valor", "agregar valor", "apalancar", "profesional dedicado",
    "profesional dedicada", "excelente comunicacion", "capacidad de aprendizaje", "nuevos retos", "nuevos desafios", "resiliente", "de punta a punta",
    "lider nato", "lider nata", "enfocado en resultados", "enfocada en resultados", "alto rendimiento", "entorno dinamico", "robusto", "robusta",
    "de manera eficiente", "de alto impacto",
  ],
};

const VAGUE = /\b(responsible for|helped( with)?|worked on|participated in|involved in|responsavel por|ajudei|auxiliei|participei|atuei em|encargad[oa] de|responsable de|ayude|particip[eé] en|trabaj[eé] en)\b/;

export interface ClicheHit { phrase: string; line: string }
export interface ClichePattern { kind: "dashes" | "sameOpener" | "vague"; line: string }
export interface ClicheReport { score: number; hits: ClicheHit[]; patterns: ClichePattern[] }

export function clicheCheck(text: string, lang: ClicheLang): ClicheReport {
  const hits: ClicheHit[] = [];
  const patterns: ClichePattern[] = [];
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const phrases = [...new Set([...CLICHES[lang], ...(lang === "en" ? [] : CLICHES.en.filter((p) => p.includes("-")))])];
  const seen = new Set<string>();
  for (const line of lines) {
    const f = ` ${foldText(line)} `;
    for (const p of phrases) {
      if (seen.has(p)) continue;
      if (new RegExp(`[^a-z]${p.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^a-z]`).test(f)) { seen.add(p); hits.push({ phrase: p, line: line.trim().slice(0, 200) }); }
    }
  }
  // Three bullets in a row opening with the same verb.
  const bullets = lines.map((l) => l.match(/^\s*[-*•]\s+(\S+)/)?.[1] ?? null);
  for (let i = 2; i < bullets.length; i++) {
    const [a, b, c] = [bullets[i - 2], bullets[i - 1], bullets[i]].map((w) => (w ? foldText(w).replace(/[^a-z]/g, "") : null));
    if (a && a === b && b === c) patterns.push({ kind: "sameOpener", line: lines[i].trim() });
  }
  for (const line of lines) {
    const b = line.match(/^\s*[-*•]\s+(.*)$/);
    if (b && !/\d/.test(b[1]) && VAGUE.test(foldText(b[1]))) patterns.push({ kind: "vague", line: line.trim() });
  }
  const words = text.split(/\s+/).filter(Boolean).length || 1;
  const dashes = (text.match(/—/g) ?? []).length;
  if (words > 40 && (dashes / words) * 100 > 2) patterns.push({ kind: "dashes", line: `— ×${dashes}` });
  const penalty = hits.length * 6 + patterns.filter((p) => p.kind === "sameOpener").length * 8 + patterns.filter((p) => p.kind === "vague").length * 3 + (patterns.some((p) => p.kind === "dashes") ? 5 : 0);
  return { score: Math.max(0, 100 - penalty), hits, patterns };
}

/** The phrases the kit prompt tells the model never to write. */
export const promptBanList = (lang: ClicheLang) => CLICHES[lang].slice(0, 15);
