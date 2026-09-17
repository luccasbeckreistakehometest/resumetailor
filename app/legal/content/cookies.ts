import type { LegalDoc, LegalLang } from "./types";

const en: LegalDoc = {
  title: "Cookie Notice",
  summary: "ResumeTailor uses only the cookies and browser storage it needs to work. There are no advertising or analytics cookies, so there is nothing to accept or refuse.",
  sections: [
    { h: "Cookies we set", body: [{ list: [
      "rt_session — keeps you signed in (30 days). Secure, not readable by scripts.",
      "rt_anon — ties the previews you make before creating an account to your browser, so they can move into your account when you sign up (1 year). Random; it identifies no one by itself.",
      "rt_cv_… — remembers that you typed the right PIN for a protected web résumé (30 days, only on that page).",
    ] }] },
    { h: "Browser storage", body: [{ list: [
      "rt_lang — the language you picked.",
      "rt_last_gen — the last kit you opened, to take you back to it after paying.",
      "rt_tour_seen, rt_checkout, rt_fit_carry — short-lived notes for the first-visit tour, the payment confirmation and carrying texts from the fit check to the kit (cleared when the tab closes).",
    ] }] },
    { h: "Other sites", body: ["When you pay, you are on Mercado Pago's or Stripe's page, which set their own cookies under their own policies. Links to WhatsApp or LinkedIn work the same way."] },
    { h: "Your choices", body: ["You can delete these cookies in your browser settings at any time. If you do, you will be signed out, and previews made without an account will no longer be linked to you."] },
  ],
};

const pt: LegalDoc = {
  title: "Aviso de Cookies",
  summary: "O ResumeTailor usa só os cookies e o armazenamento do navegador de que precisa pra funcionar. Não há cookies de publicidade nem de analytics, então não há nada pra aceitar ou recusar.",
  sections: [
    { h: "Cookies que a gente usa", body: [{ list: [
      "rt_session — mantém você conectado (30 dias). Seguro e inacessível a scripts.",
      "rt_anon — liga ao seu navegador as prévias que você faz antes de criar a conta, pra que elas passem pra sua conta quando você se cadastrar (1 ano). É aleatório e não identifica ninguém sozinho.",
      "rt_cv_… — lembra que você digitou o PIN certo de um currículo protegido (30 dias, só naquela página).",
    ] }] },
    { h: "Armazenamento do navegador", body: [{ list: [
      "rt_lang — o idioma que você escolheu.",
      "rt_last_gen — o último kit que você abriu, pra te levar de volta a ele depois do pagamento.",
      "rt_tour_seen, rt_checkout, rt_fit_carry — anotações de curta duração do tour de boas-vindas, da confirmação de pagamento e da passagem dos textos do teste de fit pro kit (somem quando a aba fecha).",
    ] }] },
    { h: "Outros sites", body: ["Na hora de pagar você está na página do Mercado Pago ou do Stripe, que usam os próprios cookies conforme as próprias políticas. Links pro WhatsApp ou pro LinkedIn funcionam do mesmo jeito."] },
    { h: "Suas escolhas", body: ["Você pode apagar esses cookies nas configurações do navegador quando quiser. Se fizer isso, vai sair da conta, e as prévias feitas sem conta deixam de estar ligadas a você."] },
  ],
};

const es: LegalDoc = {
  title: "Aviso de cookies",
  summary: "ResumeTailor usa solo las cookies y el almacenamiento del navegador que necesita para funcionar. No hay cookies publicitarias ni de analítica, así que no hay nada que aceptar o rechazar.",
  sections: [
    { h: "Cookies que usamos", body: [{ list: [
      "rt_session — mantiene tu sesión iniciada (30 días). Segura e inaccesible para scripts.",
      "rt_anon — asocia a tu navegador las vistas previas que haces antes de crear la cuenta, para pasarlas a tu cuenta cuando te registres (1 año). Es aleatoria y por sí sola no identifica a nadie.",
      "rt_cv_… — recuerda que escribiste el PIN correcto de un CV protegido (30 días, solo en esa página).",
    ] }] },
    { h: "Almacenamiento del navegador", body: [{ list: [
      "rt_lang — el idioma que elegiste.",
      "rt_last_gen — el último kit que abriste, para volver a él después de pagar.",
      "rt_tour_seen, rt_checkout, rt_fit_carry — notas de corta duración para el recorrido de bienvenida, la confirmación del pago y el paso de los textos de la revisión de encaje al kit (se borran al cerrar la pestaña).",
    ] }] },
    { h: "Otros sitios", body: ["Al pagar estás en la página de Mercado Pago o de Stripe, que usan sus propias cookies según sus propias políticas. Los enlaces a WhatsApp o LinkedIn funcionan igual."] },
    { h: "Tus opciones", body: ["Puedes borrar estas cookies desde la configuración de tu navegador cuando quieras. Si lo haces, se cerrará tu sesión y las vistas previas creadas sin cuenta dejarán de estar asociadas a ti."] },
  ],
};

export const cookies: Record<LegalLang, LegalDoc> = { en, pt, es };
