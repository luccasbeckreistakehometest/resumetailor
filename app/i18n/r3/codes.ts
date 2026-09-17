/** Promo / partner codes and referrals. */
const en = {
  haveCode: "Have a code?", codePh: "Enter your code", redeem: "Redeem", redeeming: "Checking…",
  redeemed: (n: number) => `Done — ${n} credit${n === 1 ? "" : "s"} added to your account.`,
  signIn: "Sign in to use a code — your first kit is free with an account.",
  referTitle: "Invite a friend, both of you get a kit",
  referIntro: (n: number) => `When a friend you invite buys credits for the first time, you both get ${n} credit${n === 1 ? "" : "s"}. Nothing for signing up alone — so nobody spams.`,
  copyLink: "Copy link", copied: "Copied", shareWa: "Share on WhatsApp", shareLi: "Share on LinkedIn",
  shareText: "I'm using ResumeTailor to tailor my résumé to each job and practise interviews. With my link, your first purchase gives us both a kit:",
  stats: (p: number, r: number) => `${p} waiting for a first purchase · ${r} rewarded`,
  admin: {
    tab: "Codes", single: "One code", batch: "Batch of single-use codes", code: "Code (empty = random)", credits: "Credits", uses: "Uses",
    count: "How many", campaign: "Campaign / partner", note: "Note", expires: "Expires on", create: "Create", csv: "Download CSV",
    disable: "Disable", enable: "Enable", redemptions: "Recent redemptions", empty: "No codes yet.", created: (n: number) => `${n} code${n === 1 ? "" : "s"} created.`,
    cols: { code: "Code", credits: "Credits", used: "Used", campaign: "Campaign", expires: "Expires", status: "Status", when: "When", who: "Account" },
    active: "active", off: "disabled",
  },
};
const pt: typeof en = {
  haveCode: "Tem um código?", codePh: "Digite seu código", redeem: "Resgatar", redeeming: "Conferindo…",
  redeemed: (n: number) => `Pronto — ${n} ${n === 1 ? "crédito entrou" : "créditos entraram"} na sua conta.`,
  signIn: "Entre pra usar um código — o primeiro kit é grátis com uma conta.",
  referTitle: "Indique e ganhe: um kit pra cada um",
  referIntro: (n: number) => `Quando um amigo que você indicou comprar créditos pela primeira vez, vocês dois ganham ${n} ${n === 1 ? "crédito" : "créditos"}. Só cadastrar não vale — assim ninguém faz spam.`,
  copyLink: "Copiar link", copied: "Copiado", shareWa: "Mandar no WhatsApp", shareLi: "Postar no LinkedIn",
  shareText: "Tô usando o ResumeTailor pra ajustar o currículo pra cada vaga e treinar entrevista. Com o meu link, na sua primeira compra a gente ganha um kit cada:",
  stats: (p: number, r: number) => `${p} ${p === 1 ? "aguardando" : "aguardando"} a primeira compra · ${r} ${r === 1 ? "recompensado" : "recompensados"}`,
  admin: {
    tab: "Códigos", single: "Um código", batch: "Lote de códigos de uso único", code: "Código (vazio = aleatório)", credits: "Créditos", uses: "Usos",
    count: "Quantos", campaign: "Campanha / parceiro", note: "Observação", expires: "Vence em", create: "Criar", csv: "Baixar CSV",
    disable: "Desativar", enable: "Ativar", redemptions: "Resgates recentes", empty: "Nenhum código ainda.", created: (n: number) => `${n} ${n === 1 ? "código criado" : "códigos criados"}.`,
    cols: { code: "Código", credits: "Créditos", used: "Usados", campaign: "Campanha", expires: "Vence", status: "Status", when: "Quando", who: "Conta" },
    active: "ativo", off: "desativado",
  },
};
const es: typeof en = {
  haveCode: "¿Tienes un código?", codePh: "Escribe tu código", redeem: "Canjear", redeeming: "Verificando…",
  redeemed: (n: number) => `Listo — ${n} ${n === 1 ? "crédito añadido" : "créditos añadidos"} a tu cuenta.`,
  signIn: "Inicia sesión para usar un código — tu primer kit es gratis con una cuenta.",
  referTitle: "Invita y gana: un kit para cada uno",
  referIntro: (n: number) => `Cuando un amigo que invitaste compre créditos por primera vez, ambos reciben ${n} ${n === 1 ? "crédito" : "créditos"}. Registrarse solo no cuenta — así nadie hace spam.`,
  copyLink: "Copiar enlace", copied: "Copiado", shareWa: "Enviar por WhatsApp", shareLi: "Compartir en LinkedIn",
  shareText: "Uso ResumeTailor para ajustar mi CV a cada oferta y practicar entrevistas. Con mi enlace, en tu primera compra ganamos un kit cada uno:",
  stats: (p: number, r: number) => `${p} esperando su primera compra · ${r} ${r === 1 ? "recompensado" : "recompensados"}`,
  admin: {
    tab: "Códigos", single: "Un código", batch: "Lote de códigos de un solo uso", code: "Código (vacío = aleatorio)", credits: "Créditos", uses: "Usos",
    count: "Cuántos", campaign: "Campaña / socio", note: "Nota", expires: "Vence el", create: "Crear", csv: "Descargar CSV",
    disable: "Desactivar", enable: "Activar", redemptions: "Canjes recientes", empty: "Aún no hay códigos.", created: (n: number) => `${n} ${n === 1 ? "código creado" : "códigos creados"}.`,
    cols: { code: "Código", credits: "Créditos", used: "Usados", campaign: "Campaña", expires: "Vence", status: "Estado", when: "Cuándo", who: "Cuenta" },
    active: "activo", off: "desactivado",
  },
};
export const codesCopy = { en, pt, es };
