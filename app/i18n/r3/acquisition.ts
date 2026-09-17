/** Admin "Aquisição" tab (operator-facing; kept short). */
const en = {
  tab: "Acquisition", period: "Period", days: (n: number) => `${n} days`,
  kpi: { visitors: "Visitors", previews: "Previews", signups: "Sign-ups", unlocks: "Unlocks", payers: "Paying customers", revenue: "Revenue" },
  steps: { page_view: "Visitors", preview_ready: "Preview", signup: "Sign-up", unlock: "Unlock", purchase: "Purchase" } as Record<string, string>,
  bySource: "By source / medium / campaign", byLanding: "By landing page", byLang: "By language", daily: "Per day",
  source: "Source", medium: "Medium", campaign: "Campaign", landing: "Landing page", lang: "Language", cr: "Visitor → purchase",
  tours: (s: number, d: number) => `Tour: ${s} started · ${d} finished`,
  builder: "UTM link builder", base: "Page", copy: "Copy link", copied: "Copied",
  empty: "No visits recorded in this period yet.",
  note: "First-party only: no third-party script, no IP stored; visitors with Do Not Track / GPC are not counted. Conversions are recorded on the server.",
};
const pt: typeof en = {
  tab: "Aquisição", period: "Período", days: (n: number) => `${n} dias`,
  kpi: { visitors: "Visitantes", previews: "Prévias", signups: "Cadastros", unlocks: "Kits liberados", payers: "Clientes pagantes", revenue: "Receita" },
  steps: { page_view: "Visitantes", preview_ready: "Prévia", signup: "Cadastro", unlock: "Liberou", purchase: "Comprou" } as Record<string, string>,
  bySource: "Por origem / mídia / campanha", byLanding: "Por página de entrada", byLang: "Por idioma", daily: "Por dia",
  source: "Origem", medium: "Mídia", campaign: "Campanha", landing: "Página de entrada", lang: "Idioma", cr: "Visitante → compra",
  tours: (s: number, d: number) => `Tour: ${s} começaram · ${d} terminaram`,
  builder: "Gerador de link com UTM", base: "Página", copy: "Copiar link", copied: "Copiado",
  empty: "Nenhuma visita registrada nesse período ainda.",
  note: "Só dados próprios: nenhum script de terceiros, nenhum IP guardado; quem pede Do Not Track / GPC não é contado. Conversões são registradas no servidor.",
};
const es: typeof en = {
  tab: "Adquisición", period: "Período", days: (n: number) => `${n} días`,
  kpi: { visitors: "Visitantes", previews: "Vistas previas", signups: "Registros", unlocks: "Kits desbloqueados", payers: "Clientes que pagan", revenue: "Ingresos" },
  steps: { page_view: "Visitantes", preview_ready: "Vista previa", signup: "Registro", unlock: "Desbloqueo", purchase: "Compra" } as Record<string, string>,
  bySource: "Por fuente / medio / campaña", byLanding: "Por página de entrada", byLang: "Por idioma", daily: "Por día",
  source: "Fuente", medium: "Medio", campaign: "Campaña", landing: "Página de entrada", lang: "Idioma", cr: "Visitante → compra",
  tours: (s: number, d: number) => `Tour: ${s} iniciados · ${d} terminados`,
  builder: "Generador de enlaces UTM", base: "Página", copy: "Copiar enlace", copied: "Copiado",
  empty: "Aún no hay visitas en este período.",
  note: "Solo datos propios: sin scripts de terceros, sin IP; quien pide Do Not Track / GPC no se cuenta. Las conversiones se registran en el servidor.",
};
export const acquisitionCopy = { en, pt, es };
