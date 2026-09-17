/**
 * Warning signs in a job posting. High: patterns public fraud alerts describe for fake job offers
 * (paying for a course, exam or kit; contact only by WhatsApp/Telegram; a free-mail "HR" address;
 * "extra income" tasks; bank or ID data before any interview; very high pay for no experience with
 * an immediate start). Soft: signs the posting may not be a real opening (talent pool, no
 * responsibilities, very short, old). Signals, never accusations — no company is named.
 */
export type FlagKind = "fee" | "messaging" | "freemail" | "tasks" | "data" | "toogood" | "pool" | "noduties" | "short" | "stale";
export interface RedFlags { level: "high" | "soft" | null; flags: FlagKind[] }
export const HIGH: FlagKind[] = ["fee", "messaging", "freemail", "tasks", "data", "toogood"];
export const FEBRABAN_ALERT = "https://portal.febraban.org.br/noticia/4449/pt-br/";

const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * A charge aimed at the candidate. Benefit wording ("benefícios", "auxílio", "a empresa paga/cobre",
 * "reimbursement", "la empresa paga"…) is the opposite and never counts, so each sentence is read
 * on its own and a benefit sentence is skipped.
 */
const FEE = [
  /\b(taxa|tarifa)\s+(de\s+|do\s+|da\s+)?(inscricao|cadastro|matricula|adesao|admissao|exame|treinamento|curso|uniforme|kit|material|apostila)/,
  /\b(voce|candidat[oa]s?|interessad[oa]s?)\s+(precisa|precisara|devera|deve|tera que|tem que)\s+(pagar|depositar|fazer (um )?pix|comprar)/,
  /\b(e necessario|e preciso|e obrigatorio|sera necessario)\s+(pagar|depositar|fazer (um )?pix|comprar)/,
  /\b(pague|deposite|faca um pix|pagar|depositar)\b[^\n]{0,50}\b(curso|treinamento|exame|inscricao|cadastro|material|uniforme|kit|equipamento|apostila)/,
  /\b(curso|treinamento|exame|kit|apostila|material)\b[^\n]{0,40}(a pagar|taxa de|no valor de r\$|custa r\$)/,
  /\b(pix|deposito|transferencia)\s+(de\s+|no valor de\s+)?r\$\s?\d/,
  /\b(pagar|pague|pix|deposit\w*)\b[^\n]{0,40}garantir (a |sua )?vaga/,
  /\b(you|candidates?|applicants?)\s+(must|need to|will need to|have to|are required to)\s+(pay|deposit|buy|purchase)\b/,
  /\b(registration|application|training|exam|starter kit)\s+fee\b/,
  /\b(pay|deposit)\b[^\n]{0,40}\b(for (the |your )?(training|course|exam|equipment|registration|starter kit))/,
  /\b(debes|debera|tendras que|es necesario|hay que)\s+(pagar|depositar|comprar)/,
  /\b(cuota|tarifa)\s+de\s+(inscripcion|capacitacion|curso|examen)/,
];
const BENEFIT = /benefici|auxilio|subsidi|reembols|ajuda de custo|\bvale[- ]|\b(a |nossa )?empresa (paga|cobre|custeia|investe|oferece|arca|financia|banca)|pag[oa]s? pela empresa|custead|patrocin|\b(we|company|employer)\s+(pays?|covers?|funds?|reimburses?|sponsors?)\b|paid by (us|the company)|covered by|reimburs|stipend|allowance|\bperks?\b|la empresa (paga|cubre|financia|ofrece)|pagad[oa]s? por la empresa|\bayuda\b|\bapoyo\b/;
const sentences = (f: string) => f.split(/[.!?](?=\s|$)|[\n;•]/);
const asksForFee = (f: string) => sentences(f).some((s) => !BENEFIT.test(s) && FEE.some((re) => re.test(s)));

/** "HR" on a free e-mail: a recruiting word as its own part of the address (not "christopher@…"). */
const FREEMAIL = /([\w.+-]+)@(gmail|hotmail|outlook|live|yahoo|bol|uol|icloud)\./g;
const RECRUIT_PART = /^(rh|hr|rrhh|recrutamento|recrutador[a]?|recruiting|recruiter|recruitment|vagas?|jobs?|talent[a-z]*|seleccion|selecao|empregos?)$/;
const hrOnFreemail = (f: string) => [...f.matchAll(FREEMAIL)].some((m) => m[1].split(/[._+\-\d]+/).some((part) => RECRUIT_PART.test(part)));

const RULES: [FlagKind, (f: string) => boolean][] = [
  ["fee", asksForFee],
  // Only the "contact ONLY by WhatsApp/Telegram" phrasing: a plain WhatsApp number is normal in Brazil.
  ["messaging", (f) => /\b(somente|apenas|so|exclusivamente|only|solo|unicamente)\s+(pelo|por|via|no|on|by|through|en|al)?\s*(whats\s?app|zap|telegram)\b/.test(f)],
  ["freemail", hrOnFreemail],
  ["tasks", (f) => /renda extra|tarefas simples|curtir (videos|posts)|avaliar produtos|assistir videos e ganhe|trabalhe de casa e ganhe|ganhe ate r\$|ganhos diarios|like videos|earn up to \$|daily earnings|gana hasta|ingresos diarios/.test(f)],
  ["data", (f) => /\b(envie|informe|mande|enviar|informar|send|provide|envia)\b[^.\n]{0,40}\b(cpf|rg|dados bancarios|numero do cartao|cartao de credito|conta bancaria|chave pix|bank (details|account)|card number|ssn|social security|numero de tarjeta|datos bancarios|cuenta bancaria)\b/.test(f)],
];

export function redFlags(text: string, meta: { postedAt?: string | null; now?: number } = {}): RedFlags {
  const f = fold(text);
  const flags: FlagKind[] = [];
  for (const [kind, test] of RULES) if (test(f)) flags.push(kind);
  const noExperience = /sem experiencia|nao precisa de experiencia|no experience|sin experiencia/.test(f);
  const immediate = /inicio imediato|comece hoje|start (immediately|today)|inicio inmediato|empieza hoy/.test(f);
  const bigPay = /(r\$|us\$|\$)\s?([5-9]\.?\d{3}|\d{2}\.?\d{3})/.test(f) || /(5|6|7|8|9|\d{2}) ?mil (reais|por mes)/.test(f);
  if (noExperience && immediate && bigPay) flags.push("toogood");
  const words = f.split(/\s+/).filter(Boolean).length;
  if (/banco de talentos|cadastro reserva|talent pool|bolsa de trabajo|banco de talento|future opportunities/.test(f)) flags.push("pool");
  if (words > 40 && !/responsabilidades|atividades|atribuicoes|o que voce vai fazer|responsibilities|what you.?ll do|duties|funciones|que haras|tareas/.test(f)) flags.push("noduties");
  if (words > 0 && words < 60) flags.push("short");
  const posted = meta.postedAt ? Date.parse(meta.postedAt) : NaN;
  if (Number.isFinite(posted) && (meta.now ?? Date.now()) - posted > 60 * 86_400_000) flags.push("stale");
  const level = flags.some((k) => HIGH.includes(k)) ? "high" : flags.length ? "soft" : null;
  return { level, flags };
}
