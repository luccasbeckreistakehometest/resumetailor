import { z } from "zod";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { EXTRACT_MODEL, aiMock, costOf, getClient } from "@/lib/ai/client";
import type { Kit, Lang } from "@/lib/ai/kit";

/**
 * The international version of a kit: the résumé and letter rewritten for jobs in another
 * language and market — local conventions, no national ID, age, photo or marital status, degrees
 * with the original name in parentheses, every number and date kept, language levels never raised.
 */
export const IntlSchema = z.object({ resume: z.string(), coverLetter: z.string(), notes: z.array(z.string()) });
export type IntlVersion = z.infer<typeof IntlSchema>;
const LANG_NAME: Record<Lang, string> = { en: "English", pt: "Brazilian Portuguese", es: "Spanish" };
const MARKET: Record<Lang, string> = {
  en: "English-speaking employers (US, UK, remote international): sections Summary / Experience / Education / Skills / Languages; dates like “Jan 2024 – Present”; city and country only",
  es: "Spanish-speaking employers (Latin America and Spain): sections Perfil / Experiencia / Formación / Habilidades / Idiomas; dates like “ene. 2024 – actualidad”; city and country only",
  pt: "Brazilian employers: sections Resumo / Experiência / Formação / Competências / Idiomas; dates like “jan/2024 – atual”; city and state only",
};

export function mockIntl(kit: Kit, target: Lang): IntlVersion {
  const label = { en: "International version", pt: "Versão internacional", es: "Versión internacional" }[target];
  return {
    resume: `${kit.resume.replace(/São Paulo/g, "São Paulo, Brazil")}\n\n[demo · ${label} · ${target}]`,
    coverLetter: `${kit.coverLetter}\n\n[demo · ${target}]`,
    notes: {
      en: ["Dates written as “2021 – 2026”.", "No national ID, age or photo — none were present.", "Degree names keep the Brazilian name in parentheses."],
      es: ["Fechas en formato “2021 – 2026”.", "Sin documento, edad ni foto — no había ninguno.", "Los títulos mantienen el nombre original entre paréntesis."],
      pt: ["Datas no formato “2021 – 2026”.", "Sem documento, idade ou foto — não havia nenhum.", "Formação com o nome original entre parênteses."],
    }[target],
  };
}

export async function generateIntl(a: { kit: Kit; from: Lang; target: Lang; role: string }): Promise<{ version: IntlVersion; model: string; costUsd: number }> {
  if (aiMock()) return { version: mockIntl(a.kit, a.target), model: "mock", costUsd: 0 };
  const response = await getClient().messages.stream({
    model: EXTRACT_MODEL,
    max_tokens: 6000,
    system: `You adapt a candidate's résumé (Markdown) and cover letter (plain text) from ${LANG_NAME[a.from]} into ${LANG_NAME[a.target]} for ${MARKET[a.target]}. This is localisation, not a literal translation. Rules: remove national ID numbers (CPF, RG, DNI), age, birth date, marital status, photo references and full street address; write degree names in the target language with the original in parentheses and the country (e.g. "Bachelor's degree in Business (Bacharelado em Administração, Brazil)"); keep EVERY number, percentage, amount and date exactly as given; never raise a stated language level; never add employers, tools, results or claims; keep the same Markdown structure style. "notes" lists, in ${LANG_NAME[a.target]}, each thing you removed or adapted (short sentences).`,
    messages: [{ role: "user", content: `ROLE: ${a.role}\n\nRÉSUMÉ:\n${a.kit.resume.slice(0, 9000)}\n\nCOVER LETTER:\n${a.kit.coverLetter.slice(0, 3000)}` }],
    output_config: { format: zodOutputFormat(IntlSchema) },
  }).finalMessage();
  if (response.stop_reason === "max_tokens" || !response.parsed_output) throw new Error("incomplete: the international version came back truncated");
  const v = response.parsed_output as IntlVersion;
  return { version: { resume: v.resume.slice(0, 20000), coverLetter: v.coverLetter.slice(0, 5000), notes: v.notes.slice(0, 12) }, model: EXTRACT_MODEL, costUsd: costOf(response.usage, EXTRACT_MODEL) };
}
