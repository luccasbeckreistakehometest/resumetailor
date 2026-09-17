/**
 * Everything the product does, as short cards (landing pages, home, the tools hub), plus the
 * pricing checklist and the "what's new" strip. pt is the product's own voice for Brazil.
 */
export type FeatureKey =
  | "match" | "meter" | "fit" | "truth" | "human" | "numbers" | "editor" | "voice" | "interview" | "pitch"
  | "tracker" | "webcv" | "letters" | "linkedin" | "calculator" | "compare" | "intl" | "codes" | "ats";
type Card = { t: string; d: string };

const en: { cards: Record<FeatureKey, Card>; free: string; kit: string; kitTitle: string; freeTitle: string; freeIntro: string; priceTitle: string; priceLine: (p: string) => string; noSub: string; seeAll: string; faqTitle: string; ctaFinal: string; checklistTitle: string; checklist: (c: Caps) => string[]; checklistFooter: string; whatsNew: string; whatsNewItems: string; whatsNewCta: string; dismiss: string; hubTitle: string; navLabel: string; hubIntro: string; hubFree: string; hubKit: string; open: string; heroBullets: string[]; positioning: string } = {
  cards: {
    match: { t: "Match score, before and after", d: "See how well your résumé matches the posting — and how much the kit improves it." },
    meter: { t: "Is it really tailored?", d: "A meter shows how much of the posting your résumé uses, and one click goes deeper." },
    fit: { t: "Am I a fit?", d: "Every requirement marked found, partial or missing, with the line that proves it." },
    truth: { t: "Truth check", d: "The AI doesn't make up experience — and you can see it: every number, employer and date checked against what you gave us." },
    human: { t: "Sounds human?", d: "Reads like ChatGPT? We tell you before the recruiter does, and show the phrase that gave it away." },
    numbers: { t: "Missing numbers? It asks.", d: "Up to five quick questions — “how many customers a day?” — and the bullet comes back with a real result." },
    editor: { t: "Editor, Word and form mode", d: "Change anything, go back to the AI version, download .docx and paste into application forms field by field." },
    voice: { t: "Just talk", d: "You speak, it waits for you to finish and asks what's missing. Nothing you said gets lost." },
    interview: { t: "Mock interview out loud", d: "Questions from the job, a score for every answer, your pace and filler words, and a stronger version." },
    pitch: { t: "Video intro without freezing", d: "A script in your voice, a teleprompter and a stopwatch. The video stays on your phone — we never see it." },
    tracker: { t: "Tracker with a follow-up radar", d: "Ghosted after the interview? The radar tells you when to follow up, with the message ready and a calendar reminder." },
    webcv: { t: "Your résumé as a web page", d: "A clean page at its own link, readable by people and parsers — with a PIN if you want." },
    letters: { t: "Letters in 4 tones + 3 e-mails", d: "Formal, warm, direct or confident — and the e-mails for after applying, after the interview and after silence." },
    linkedin: { t: "LinkedIn for the role", d: "Headlines, About, bullets and the skills to pin — with the search terms you now cover." },
    calculator: { t: "CLT or PJ?", d: "Do the math with the 2026 tables before you answer the salary question. Free." },
    compare: { t: "Compare up to 5 jobs", d: "Find where you really stand — and which postings look like scams." },
    intl: { t: "Résumé for jobs abroad", d: "In the local format, no ID or age, without inflating your English." },
    codes: { t: "Have a code?", d: "Redeem it and start. Invite a friend: when they buy, you both get a kit." },
    ats: { t: "Free ATS check", d: "What the filtering software sees in your résumé, with the fixes in order. No account." },
  },
  free: "free", kit: "in the kit",
  kitTitle: "What's in the kit", freeTitle: "Free before you pay", freeIntro: "Try these first — no credit, most without an account.",
  priceTitle: "One credit unlocks all of this", priceLine: (p) => `From ${p} per kit`, noSub: "No subscription. Nothing renews.",
  seeAll: "Everything you can do →", faqTitle: "Questions", ctaFinal: "Start free",
  checklistTitle: "One credit unlocks all of this",
  checklist: (c) => ["Tailored résumé — edit it, Word (.docx) and PDF", "Cover letter in 4 tones + 3 recruiter e-mails", "Full LinkedIn pass", `Up to ${c.interviews} mock interviews`, `${c.deepen} “go deeper” pass${c.deepen === 1 ? "" : "es"}`, `${c.quantify} “missing numbers” round${c.quantify === 1 ? "" : "s"}`, `${c.intl} international version${c.intl === 1 ? "" : "s"}`, `Video-intro script and ${c.pitch} take ratings`, "Truth check and what-changed view", "Your résumé as a web page"],
  checklistFooter: "No subscription. No trial that turns into a charge. Credits never expire.",
  whatsNew: "New:", whatsNewItems: "truth check · editor with Word · job comparator · video-intro studio · follow-up radar", whatsNewCta: "See everything", dismiss: "Dismiss",
  hubTitle: "Everything you can do", navLabel: "Tools", hubIntro: "Free tools first; the rest comes with a kit (your first one is on us with an account).",
  hubFree: "Free", hubKit: "With a kit", open: "Open",
  heroBullets: ["It doesn't make things up — and it proves it", "Edit, export to Word, paste field by field", "Rank up to 5 jobs and spot the scams", "No subscription. Nothing renews."],
  positioning: "ChatGPT gives you text. We give you the whole application — and prove nothing was made up.",
};
export type Caps = { deepen: number; interviews: number; quantify: number; intl: number; pitch: number };

const pt: typeof en = {
  cards: {
    match: { t: "Nota antes e depois", d: "Veja o quanto seu currículo combina com a vaga — e quanto o kit melhora isso." },
    meter: { t: "Tá personalizado mesmo?", d: "Um medidor mostra quanto da vaga seu currículo usa, e um clique aprofunda." },
    fit: { t: "Sou um fit?", d: "Cada requisito marcado como tem, tem em parte ou não tem, com a linha que prova." },
    truth: { t: "Checagem de verdade", d: "A IA não inventa experiência. E agora você vê: cada número, empresa e data conferidos com o que você mandou." },
    human: { t: "Soa humano?", d: "Tem cara de ChatGPT? A gente avisa antes do recrutador — e mostra a frase que entregou." },
    numbers: { t: "Faltou número? Ele pergunta.", d: "Até cinco perguntas rápidas — “quantos clientes por dia?” — e o tópico volta com resultado de verdade." },
    editor: { t: "Editor + Word + modo formulário", d: "Mexe no que quiser, volta pra versão da IA quando quiser, baixa em .docx e cola na Gupy campo por campo." },
    voice: { t: "É só conversar", d: "Você fala, ele espera você terminar e pergunta o que faltou. Nada do que você contou se perde." },
    interview: { t: "Entrevista simulada falando", d: "Perguntas da vaga, nota em cada resposta, ritmo e vícios de linguagem, e a versão mais forte do que você disse." },
    pitch: { t: "Vídeo de apresentação sem travar", d: "Roteiro do seu jeito, teleprompter e cronômetro. O vídeo fica no seu celular — a gente nem vê." },
    tracker: { t: "Tracker com radar de follow-up", d: "Sumiram depois da entrevista? O radar diz a hora certa de cobrar e já te dá a mensagem, com lembrete na agenda." },
    webcv: { t: "Seu currículo como página", d: "Uma página limpa com link próprio, legível pra gente e pra robô — com PIN, se quiser." },
    letters: { t: "Carta em 4 tons + 3 e-mails", d: "Formal, calorosa, direta ou confiante — e os e-mails de depois da candidatura, da entrevista e do silêncio." },
    linkedin: { t: "LinkedIn pra vaga", d: "Títulos, Sobre, tópicos e as competências pra fixar — com os termos de busca que você passou a cobrir." },
    calculator: { t: "CLT ou PJ?", d: "Faz a conta com as tabelas de 2026 antes de responder a pretensão. Grátis." },
    compare: { t: "Compare até 5 vagas", d: "Descubra onde você tem chance de verdade — e quais têm cara de golpe." },
    intl: { t: "Currículo pra vaga gringa", d: "No padrão de fora, sem CPF nem idade, sem inflar seu inglês." },
    codes: { t: "Tem um código?", d: "Resgata e começa. Indicou um amigo e ele comprou? Os dois ganham um kit." },
    ats: { t: "Teste de ATS grátis", d: "O que o robô de triagem vê no seu currículo, com as correções em ordem. Sem cadastro." },
  },
  free: "grátis", kit: "no kit",
  kitTitle: "O que vem no kit", freeTitle: "Grátis antes de pagar", freeIntro: "Testa estes primeiro — sem crédito, a maioria sem cadastro.",
  priceTitle: "Um crédito libera tudo isto", priceLine: (p) => `A partir de ${p} por kit`, noSub: "Sem assinatura. Nada renova sozinho.",
  seeAll: "Tudo que dá pra fazer →", faqTitle: "Perguntas", ctaFinal: "Começar grátis",
  checklistTitle: "Um crédito libera tudo isto",
  checklist: (c) => ["Currículo ajustado — editável, em Word (.docx) e PDF", "Carta em 4 tons + 3 e-mails pro recrutador", "LinkedIn completo pra vaga", `Até ${c.interviews} entrevistas simuladas`, `${c.deepen} ${c.deepen === 1 ? "aprofundamento" : "aprofundamentos"}`, `${c.quantify} ${c.quantify === 1 ? "rodada" : "rodadas"} de números`, `${c.intl} ${c.intl === 1 ? "versão internacional" : "versões internacionais"}`, `Roteiro de vídeo e ${c.pitch} avaliações de gravação`, "Checagem de verdade e o que mudou, linha por linha", "Seu currículo como página na web"],
  checklistFooter: "Sem assinatura. Sem teste que vira cobrança. O crédito não vence.",
  whatsNew: "Novo:", whatsNewItems: "checagem de verdade · editor com Word · comparador de vagas · estúdio de vídeo · radar de follow-up", whatsNewCta: "Ver tudo", dismiss: "Fechar",
  hubTitle: "Tudo que dá pra fazer", navLabel: "Recursos", hubIntro: "Primeiro o que é grátis; o resto vem no kit (o primeiro é por nossa conta com uma conta).",
  hubFree: "Grátis", hubKit: "No kit", open: "Abrir",
  heroBullets: ["Checagem de verdade: todo número do currículo novo veio de você. Se não veio, a gente marca.", "Editou, baixou em Word, colou na Gupy — cada campo com botão de copiar.", "Fala uma vez. O perfil fica salvo e a próxima vaga sai em dois cliques.", "Sem assinatura. Nada renova sozinho."],
  positioning: "O ChatGPT te dá texto. A gente te dá a candidatura inteira — e prova que não inventou nada.",
};

const es: typeof en = {
  cards: {
    match: { t: "Puntuación antes y después", d: "Mira cuánto encaja tu CV con la oferta — y cuánto lo mejora el kit." },
    meter: { t: "¿De verdad está personalizado?", d: "Un medidor muestra cuánto de la oferta usa tu CV, y un clic profundiza." },
    fit: { t: "¿Encajo?", d: "Cada requisito marcado como lo tienes, en parte o no, con la línea que lo prueba." },
    truth: { t: "Verificación de veracidad", d: "No inventa nada — y te lo demuestra: cada número, empresa y fecha comparados con lo que nos diste." },
    human: { t: "¿Suena humano?", d: "¿Suena a ChatGPT? Te avisamos antes que el reclutador, y te mostramos la frase que lo delató." },
    numbers: { t: "¿Faltan números? Pregunta.", d: "Hasta cinco preguntas rápidas — “¿cuántos clientes por día?” — y la viñeta vuelve con un resultado real." },
    editor: { t: "Editor, Word y modo formulario", d: "Cambia lo que quieras, vuelve a la versión de la IA, descarga en .docx y pega campo por campo." },
    voice: { t: "Solo habla", d: "Hablas, espera a que termines y pregunta lo que falta. No se pierde nada de lo que contaste." },
    interview: { t: "Entrevista de práctica hablando", d: "Preguntas de la oferta, nota en cada respuesta, ritmo y muletillas, y una versión más fuerte." },
    pitch: { t: "Video de presentación sin trabarte", d: "Guion a tu manera, teleprompter y cronómetro. El video queda en tu teléfono — no lo vemos." },
    tracker: { t: "Tracker con radar de seguimiento", d: "¿No te respondieron? El radar te dice cuándo escribir, con el mensaje listo y un recordatorio en tu calendario." },
    webcv: { t: "Tu CV como página web", d: "Una página limpia con su enlace, legible para personas y parsers — con PIN si quieres." },
    letters: { t: "Carta en 4 tonos + 3 correos", d: "Formal, cálida, directa o segura — y los correos de después de postular, de la entrevista y del silencio." },
    linkedin: { t: "LinkedIn para el puesto", d: "Titulares, Acerca de, viñetas y las habilidades a destacar — con los términos que ahora cubres." },
    calculator: { t: "¿CLT o PJ? (Brasil)", d: "Calcula con las tablas de 2026 antes de responder tu pretensión salarial." },
    compare: { t: "Compara hasta 5 ofertas", d: "Descubre dónde tienes opciones reales — y detecta las estafas." },
    intl: { t: "CV para trabajar en el exterior", d: "Con el formato local, sin documento ni edad, sin inflar tu inglés." },
    codes: { t: "¿Tienes un código?", d: "Canjéalo y empieza. Si un amigo que invitaste compra, ambos ganan un kit." },
    ats: { t: "Test ATS gratis", d: "Lo que ve el software de filtrado en tu CV, con las correcciones en orden. Sin cuenta." },
  },
  free: "gratis", kit: "en el kit",
  kitTitle: "Qué incluye el kit", freeTitle: "Gratis antes de pagar", freeIntro: "Prueba esto primero — sin crédito, casi todo sin cuenta.",
  priceTitle: "Un crédito desbloquea todo esto", priceLine: (p) => `Desde ${p} por kit`, noSub: "Sin suscripción. Nada se renueva solo.",
  seeAll: "Todo lo que puedes hacer →", faqTitle: "Preguntas", ctaFinal: "Empezar gratis",
  checklistTitle: "Un crédito desbloquea todo esto",
  checklist: (c) => ["CV ajustado — editable, en Word (.docx) y PDF", "Carta en 4 tonos + 3 correos al reclutador", "LinkedIn completo para el puesto", `Hasta ${c.interviews} entrevistas de práctica`, `${c.deepen} ${c.deepen === 1 ? "pasada" : "pasadas"} de profundización`, `${c.quantify} ${c.quantify === 1 ? "ronda" : "rondas"} de números`, `${c.intl} ${c.intl === 1 ? "versión internacional" : "versiones internacionales"}`, `Guion de video y ${c.pitch} evaluaciones de toma`, "Verificación de veracidad y qué cambió", "Tu CV como página web"],
  checklistFooter: "Sin suscripción. Sin prueba que se convierte en cobro. Los créditos no vencen.",
  whatsNew: "Nuevo:", whatsNewItems: "verificación de veracidad · editor con Word · comparador de ofertas · estudio de video · radar de seguimiento", whatsNewCta: "Ver todo", dismiss: "Cerrar",
  hubTitle: "Todo lo que puedes hacer", navLabel: "Recursos", hubIntro: "Primero lo gratis; lo demás viene con un kit (el primero va por nuestra cuenta con una cuenta).",
  hubFree: "Gratis", hubKit: "Con un kit", open: "Abrir",
  heroBullets: ["No inventa nada — y te lo demuestra", "Edita, descarga en Word y pega campo por campo", "Compara hasta 5 ofertas y detecta estafas", "Sin suscripción. Nada se renueva solo."],
  positioning: "ChatGPT te da texto. Nosotros, la postulación completa — y demostramos que no inventamos nada.",
};

export const showcaseCopy = { en, pt, es };
