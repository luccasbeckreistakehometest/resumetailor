import type { LegalDoc, LegalLang } from "./types";

const en: LegalDoc = {
  title: "Cookie Notice",
  summary: "ResumeTailor uses only first-party cookies and browser storage: what it needs to work, plus its own visit statistics without your IP. There are no advertising cookies and no third-party analytics or tracking scripts.",
  sections: [
    { h: "Cookies we set", body: [{ list: [
      "rt_session — keeps you signed in (30 days). Secure, not readable by scripts.",
      "rt_anon — a random visitor ID (1 year). It ties the previews you make before creating an account to your browser, so they can move into your account when you sign up, and it counts your visits in our own statistics (see below). It identifies no one by itself.",
      "rt_ref — the referral code from a friend's invite link, so the invite is credited when you sign up (30 days; removed at signup).",
      "rt_cv_… — remembers that you typed the right PIN for a protected web résumé (30 days, only on that page).",
    ] }] },
    { h: "Browser storage", body: [{ list: [
      "rt_lang — the language you picked.",
      "rt_last_gen — the last kit you opened, to take you back to it after paying.",
      "rt_lang_pill_off, rt_whatsnew_r3 — that you closed the language suggestion or the “what's new” strip.",
      "rt_tour_seen, rt_checkout, rt_fit_carry — short-lived notes for the first-visit tour, the payment confirmation and carrying texts from the fit check or the job comparison to the kit (cleared when the tab closes).",
      "rt_sid — a random ID for the current browsing session, used only in our statistics (cleared when the tab closes).",
    ] }] },
    { h: "Our own statistics", body: [
      "To know which pages and campaigns bring people who find the service useful, we record first-party events: the pages you open, the campaign tags (UTM) and referring site of your first visit, your language, whether you use a phone or a computer, and steps such as “made a preview”, “created an account” or “bought credits”. They are linked to the rt_anon ID and, once you have an account, to that account. No IP address is stored with them, nothing is shared with advertising or analytics companies, and no third-party script is loaded.",
      "We rely on legitimate interest (LGPD art. 7, IX). Raw events are deleted after 180 days, and so is the first-visit record of visitors who never create an account; deleting your account removes that record and unlinks the events from you. If your browser sends Global Privacy Control or Do Not Track, we record nothing about your visit.",
    ] },
    { h: "Other sites", body: ["When you pay, you are on Mercado Pago's or Stripe's page, which set their own cookies under their own policies. Links to WhatsApp or LinkedIn work the same way."] },
    { h: "Your choices", body: ["You can delete these cookies in your browser settings at any time. If you do, you will be signed out, previews made without an account will no longer be linked to you, and your next visit counts as a new visitor. To be left out of our statistics, turn on Global Privacy Control or Do Not Track in your browser."] },
  ],
};

const pt: LegalDoc = {
  title: "Aviso de Cookies",
  summary: "O ResumeTailor usa só cookies e armazenamento do navegador próprios: o que ele precisa pra funcionar, mais uma estatística de visitas feita por nós mesmos, sem guardar seu IP. Não há cookies de publicidade nem scripts de analytics ou rastreamento de terceiros.",
  sections: [
    { h: "Cookies que a gente usa", body: [{ list: [
      "rt_session — mantém você conectado (30 dias). Seguro e inacessível a scripts.",
      "rt_anon — um identificador aleatório de visitante (1 ano). Liga ao seu navegador as prévias que você faz antes de criar a conta, pra que elas passem pra sua conta quando você se cadastrar, e conta suas visitas na nossa estatística (veja abaixo). Sozinho, não identifica ninguém.",
      "rt_ref — o código de indicação do link de convite de um amigo, pra que a indicação seja registrada quando você se cadastrar (30 dias; apagado no cadastro).",
      "rt_cv_… — lembra que você digitou o PIN certo de um currículo protegido (30 dias, só naquela página).",
    ] }] },
    { h: "Armazenamento do navegador", body: [{ list: [
      "rt_lang — o idioma que você escolheu.",
      "rt_last_gen — o último kit que você abriu, pra te levar de volta a ele depois do pagamento.",
      "rt_lang_pill_off, rt_whatsnew_r3 — que você fechou a sugestão de idioma ou a faixa de novidades.",
      "rt_tour_seen, rt_checkout, rt_fit_carry — anotações de curta duração do tour de boas-vindas, da confirmação de pagamento e da passagem dos textos do teste de fit ou do comparador de vagas pro kit (somem quando a aba fecha).",
      "rt_sid — um identificador aleatório da visita atual, usado só na nossa estatística (some quando a aba fecha).",
    ] }] },
    { h: "Nossa própria estatística", body: [
      "Pra saber quais páginas e campanhas trazem gente que acha o serviço útil, a gente registra eventos próprios: as páginas que você abre, as etiquetas de campanha (UTM) e o site de origem da sua primeira visita, o idioma, se você usa celular ou computador, e etapas como “fez uma prévia”, “criou a conta” ou “comprou créditos”. Eles ficam ligados ao identificador rt_anon e, depois que você cria a conta, à sua conta. Nenhum endereço IP é guardado junto, nada é repassado a empresas de publicidade ou de analytics, e nenhum script de terceiros é carregado.",
      "A base legal é o legítimo interesse (LGPD, art. 7º, IX). Os eventos brutos são apagados depois de 180 dias, assim como o registro da primeira visita de quem nunca cria conta; ao excluir a conta, esse registro é apagado e os eventos deixam de estar ligados a você. Se o seu navegador envia Global Privacy Control ou Do Not Track, a gente não registra nada da sua visita.",
    ] },
    { h: "Outros sites", body: ["Na hora de pagar você está na página do Mercado Pago ou do Stripe, que usam os próprios cookies conforme as próprias políticas. Links pro WhatsApp ou pro LinkedIn funcionam do mesmo jeito."] },
    { h: "Suas escolhas", body: ["Você pode apagar esses cookies nas configurações do navegador quando quiser. Se fizer isso, vai sair da conta, as prévias feitas sem conta deixam de estar ligadas a você e a próxima visita conta como a de um visitante novo. Pra ficar fora da nossa estatística, ative o Global Privacy Control ou o Do Not Track no navegador."] },
  ],
};

const es: LegalDoc = {
  title: "Aviso de cookies",
  summary: "ResumeTailor usa solo cookies y almacenamiento del navegador propios: lo que necesita para funcionar, más una estadística de visitas hecha por nosotros mismos, sin guardar tu IP. No hay cookies publicitarias ni scripts de analítica o rastreo de terceros.",
  sections: [
    { h: "Cookies que usamos", body: [{ list: [
      "rt_session — mantiene tu sesión iniciada (30 días). Segura e inaccesible para scripts.",
      "rt_anon — un identificador aleatorio de visitante (1 año). Asocia a tu navegador las vistas previas que haces antes de crear la cuenta, para pasarlas a tu cuenta cuando te registres, y cuenta tus visitas en nuestra estadística (ver abajo). Por sí sola no identifica a nadie.",
      "rt_ref — el código de referido del enlace de invitación de un amigo, para registrar la invitación cuando te registres (30 días; se borra al registrarte).",
      "rt_cv_… — recuerda que escribiste el PIN correcto de un CV protegido (30 días, solo en esa página).",
    ] }] },
    { h: "Almacenamiento del navegador", body: [{ list: [
      "rt_lang — el idioma que elegiste.",
      "rt_last_gen — el último kit que abriste, para volver a él después de pagar.",
      "rt_lang_pill_off, rt_whatsnew_r3 — que cerraste la sugerencia de idioma o la franja de novedades.",
      "rt_tour_seen, rt_checkout, rt_fit_carry — notas de corta duración para el recorrido de bienvenida, la confirmación del pago y el paso de los textos de la revisión de encaje o del comparador de ofertas al kit (se borran al cerrar la pestaña).",
      "rt_sid — un identificador aleatorio de la visita actual, usado solo en nuestra estadística (se borra al cerrar la pestaña).",
    ] }] },
    { h: "Nuestra propia estadística", body: [
      "Para saber qué páginas y campañas traen a personas a las que el servicio les resulta útil, registramos eventos propios: las páginas que abres, las etiquetas de campaña (UTM) y el sitio de origen de tu primera visita, tu idioma, si usas móvil o computadora, y pasos como “hizo una vista previa”, “creó la cuenta” o “compró créditos”. Quedan asociados al identificador rt_anon y, cuando tienes cuenta, a tu cuenta. No se guarda ninguna dirección IP con ellos, nada se comparte con empresas de publicidad o analítica y no se carga ningún script de terceros.",
      "La base legal es el interés legítimo (LGPD de Brasil, art. 7, IX). Los eventos brutos se borran a los 180 días, igual que el registro de la primera visita de quien nunca crea una cuenta; al eliminar tu cuenta, ese registro se borra y los eventos dejan de estar asociados a ti. Si tu navegador envía Global Privacy Control o Do Not Track, no registramos nada de tu visita.",
    ] },
    { h: "Otros sitios", body: ["Al pagar estás en la página de Mercado Pago o de Stripe, que usan sus propias cookies según sus propias políticas. Los enlaces a WhatsApp o LinkedIn funcionan igual."] },
    { h: "Tus opciones", body: ["Puedes borrar estas cookies desde la configuración de tu navegador cuando quieras. Si lo haces, se cerrará tu sesión, las vistas previas creadas sin cuenta dejarán de estar asociadas a ti y tu próxima visita contará como la de un visitante nuevo. Para quedar fuera de nuestra estadística, activa Global Privacy Control o Do Not Track en tu navegador."] },
  ],
};

export const cookies: Record<LegalLang, LegalDoc> = { en, pt, es };
