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

const RULES: [FlagKind, RegExp][] = [
  ["fee", /(taxa|pagar|pagamento|pague|deposit\w*|pix|custo|valor de r\$|investimento)[^.\n]{0,50}(curso|treinamento|exame|inscricao|cadastro|material|uniforme|kit|equipamento|apostila)|(curso|treinamento|exame|kit|apostila|material)[^.\n]{0,40}(pago|a pagar|taxa|no valor de|custa)|(pay|fee|deposit)[^.\n]{0,40}(training|course|exam|equipment|registration|starter kit)|(pagar|cuota|tarifa|costo)[^.\n]{0,40}(curso|capacitacion|examen|equipo|inscripcion)/],
  ["messaging", /(somente|apenas|so|exclusivamente|only|solo|unicamente)\s+(pelo|por|via|no|on|by|through|en)?\s*(whats\s?app|zap|telegram)|(chame|chama|fale|contact|contacto|escribe)\w*\s+(no|pelo|on|por|al)?\s*(whats\s?app|zap|telegram)|(whats\s?app|telegram)\s*:?\s*\(?\+?\d/],
  ["freemail", /\b[\w.+-]*(rh|recrutamento|recrutador|vagas|hr|recruit\w*|rrhh|talent\w*|jobs)[\w.+-]*@(gmail|hotmail|outlook|live|yahoo|bol|uol|icloud)\./],
  ["tasks", /renda extra|tarefas simples|curtir (videos|posts)|avaliar produtos|assistir videos e ganhe|trabalhe de casa e ganhe|ganhe ate r\$|ganhos diarios|like videos|earn up to \$|daily earnings|gana hasta|ingresos diarios/],
  ["data", /(envie|informe|mande|enviar|informar|send|provide|envia|enviar)[^.\n]{0,40}(cpf|rg|dados bancarios|cartao|conta bancaria|chave pix|bank (details|account)|card number|ssn|social security|numero de tarjeta|datos bancarios|cuenta bancaria)/],
];

export function redFlags(text: string, meta: { postedAt?: string | null; now?: number } = {}): RedFlags {
  const f = fold(text);
  const flags: FlagKind[] = [];
  for (const [kind, re] of RULES) if (re.test(f)) flags.push(kind);
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
