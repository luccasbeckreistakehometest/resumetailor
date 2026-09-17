/**
 * Search and share copy for the localized public pages (server-rendered: titles, descriptions,
 * the "see this page in your language" pill). pt is written for Brazil, es for Latin America
 * and Spain alike.
 */
type Meta = { title: string; description: string };
export type SeoCopy = {
  site: Meta;
  home: Meta;
  pricing: Meta;
  fit: Meta;
  tools: Meta;
  compare: Meta;
  calculator?: Meta;
  lp: Partial<Record<"jobseeker" | "firstjob" | "careerchange" | "vschatgpt" | "layoff" | "interview" | "gupy", Meta>>;
  pill: string;
  pillClose: string;
};

const en: SeoCopy = {
  site: {
    title: "ResumeTailor — Your résumé, tailored to the job in 30 seconds",
    description: "Paste a job posting and your résumé, or just talk. Get a résumé rewritten for that exact role, a cover letter, a LinkedIn About and interview prep — with a match score that proves it.",
  },
  home: {
    title: "ResumeTailor — It doesn't make things up, and it proves it",
    description: "Tailor your résumé to any job in 30 seconds, check every number against what you gave us, edit and export to Word, rehearse the interview out loud. No subscription.",
  },
  pricing: { title: "Pricing — prepaid credits, no subscription", description: "Previews are free and your first full kit is free with an account. One credit unlocks one full kit. No subscription, nothing renews, credits never expire." },
  fit: { title: "Am I a fit for this job? Free pre-check", description: "Paste a job posting and your résumé: every must-have marked found, partial or missing with the line that proves it, a fit score and the three gaps that matter." },
  tools: { title: "Everything ResumeTailor does — free and paid tools", description: "ATS check, fit check, job comparator, résumé editor with Word export, mock interview, video-intro studio, follow-up radar and more — in one place." },
  compare: { title: "Compare up to 5 jobs by fit — and spot the scams", description: "Paste or import up to five postings and see where you really stand: a fit score, the biggest gaps and warning signs for fake or stale jobs." },
  lp: {
    jobseeker: { title: "Stop getting ghosted — tailor your résumé to every job", description: "Tailor your résumé to any posting in 30 seconds, with a match score before and after, a cover letter, LinkedIn and interview practice. Free preview." },
    firstjob: { title: "Your first résumé, built honestly — no experience needed", description: "No CV yet? Talk or type about your studies, projects and skills and get an honest first résumé, cover letter and interview practice. Free preview." },
    careerchange: { title: "Changing careers? Make recruiters see the fit", description: "Your real experience reframed for the new field: transferable skills first, a match score for the target role, and a cover letter that explains the switch." },
    vschatgpt: { title: "More than ChatGPT: a ready-to-send application kit", description: "A quantified match score, a truth check on every number, a scored mock interview — no prompting skills needed. Free preview." },
    layoff: { title: "Laid off? Run your job search with a method", description: "A saved base résumé, a new tailored kit in two clicks, a follow-up radar with calendar reminders and interview practice. No subscription." },
    interview: { title: "Rehearse your interview out loud — scored answer by answer", description: "A voice mock interview built from the job: a score per answer, pace and filler words, and a stronger version of what you said." },
  },
  pill: "See this page in English →",
  pillClose: "Dismiss",
};

const pt: SeoCopy = {
  site: {
    title: "ResumeTailor — Seu currículo ajustado pra vaga em 30 segundos",
    description: "Cola a vaga e o seu currículo, ou só fala. Sai um currículo reescrito pra aquela vaga, carta, LinkedIn e treino de entrevista — com uma nota que prova.",
  },
  home: {
    title: "ResumeTailor — O ChatGPT te dá texto. A gente te dá a candidatura inteira",
    description: "Currículo ajustado pra vaga em 30 segundos, checagem de verdade em cada número, editor com Word, treino de entrevista falando. Sem assinatura, nada renova sozinho.",
  },
  pricing: { title: "Preços — créditos pré-pagos, sem assinatura", description: "A prévia é grátis e o primeiro kit completo sai por nossa conta com uma conta. Um crédito libera um kit inteiro. Sem assinatura, nada renova sozinho, o crédito não vence." },
  fit: { title: "Sou um fit pra essa vaga? Checagem grátis", description: "Cola a vaga e o currículo: cada requisito marcado como tem, tem em parte ou não tem, com a linha que prova, uma nota de aderência e as três lacunas que importam." },
  tools: { title: "Tudo que o ResumeTailor faz — ferramentas grátis e do kit", description: "Teste de ATS, sou um fit?, comparador de vagas, calculadora CLT × PJ, editor com Word, entrevista simulada, estúdio de vídeo e radar de follow-up — num lugar só." },
  compare: { title: "Compare até 5 vagas — e descubra quais têm cara de golpe", description: "Cola ou importa até cinco vagas e vê onde você tem chance de verdade: nota de aderência, maiores lacunas e sinais de golpe ou vaga fantasma." },
  calculator: { title: "Calculadora CLT ou PJ 2026 — salário líquido e proposta equivalente", description: "Compare CLT e PJ com as tabelas de 2026 (INSS, IRRF com a isenção até R$ 5.000, FGTS e Simples Nacional). Descubra a nota PJ equivalente e quanto pedir de pretensão. Grátis." },
  lp: {
    jobseeker: { title: "Pare de ser ignorado — currículo ajustado pra cada vaga", description: "Cola a vaga e em 30 segundos você sabe se tem chance — e sai com o kit, o treino de entrevista e o lembrete de follow-up. Prévia grátis." },
    firstjob: { title: "Primeiro emprego: um currículo honesto, mesmo sem experiência", description: "Conta pra gente falando. O currículo sai honesto, com os números que você tem — e o vídeo de apresentação ensaiado. Prévia grátis." },
    careerchange: { title: "Mudando de carreira? Faça o recrutador ver o encaixe", description: "A gente mostra o que muda, linha por linha, e por quê. Nada de fingir que você já era da área." },
    vschatgpt: { title: "O ChatGPT te dá texto. A gente te dá a candidatura inteira", description: "O chat concorda com você. A gente confere seus números, dá nota pras suas respostas e avisa quando o texto tem cara de robô." },
    layoff: { title: "Foi desligado? Hoje você organiza a busca", description: "Currículo base salvo, radar de follow-up com lembrete na agenda, CLT ou PJ na ponta do lápis e treino de entrevista. Sem assinatura." },
    interview: { title: "Treine a entrevista falando — com nota por resposta", description: "Um entrevistador de IA com perguntas da vaga: nota por resposta, ritmo e vícios de linguagem, e a versão mais forte do que você disse." },
    gupy: { title: "Seu currículo passa na triagem da Gupy?", description: "Check de ATS grátis, modo formulário pra colar campo por campo e estúdio pro vídeo de apresentação. Compatível com a Gupy, sem afiliação." },
  },
  pill: "Ver esta página em português →",
  pillClose: "Fechar",
};

const es: SeoCopy = {
  site: {
    title: "ResumeTailor — Tu CV ajustado a la oferta en 30 segundos",
    description: "Pega la oferta y tu CV, o simplemente habla. Obtén un CV reescrito para ese puesto, carta, LinkedIn y preparación de entrevista — con una puntuación que lo demuestra.",
  },
  home: {
    title: "ResumeTailor — No inventa nada, y te lo demuestra",
    description: "CV ajustado a cualquier oferta en 30 segundos, cada número verificado contra lo que nos diste, editor con exportación a Word y entrevista de práctica por voz. Sin suscripción.",
  },
  pricing: { title: "Precios — créditos prepagos, sin suscripción", description: "La vista previa es gratis y tu primer kit completo es gratis con una cuenta. Un crédito desbloquea un kit completo. Sin suscripción, nada se renueva solo, los créditos no vencen." },
  fit: { title: "¿Encajo en esta oferta? Revisión gratis", description: "Pega la oferta y tu CV: cada requisito marcado como lo tienes, en parte o no, con la línea que lo prueba, una puntuación de encaje y las tres brechas que importan." },
  tools: { title: "Todo lo que hace ResumeTailor — herramientas gratis y del kit", description: "Test ATS, ¿encajo?, comparador de ofertas, editor con Word, entrevista de práctica, estudio de video y radar de seguimiento — en un solo lugar." },
  compare: { title: "Compara hasta 5 ofertas — y detecta las estafas", description: "Pega o importa hasta cinco ofertas y ve dónde tienes opciones reales: puntuación de encaje, brechas principales y señales de estafa u ofertas fantasma." },
  lp: {
    jobseeker: { title: "Deja de ser ignorado — CV ajustado a cada oferta", description: "Ajusta tu CV a cualquier oferta en 30 segundos, con puntuación antes y después, carta, LinkedIn y práctica de entrevista. Vista previa gratis." },
    firstjob: { title: "Tu primer CV, honesto — sin experiencia", description: "¿Sin CV todavía? Cuéntanos hablando o escribiendo tus estudios, proyectos y habilidades y obtén un primer CV honesto. Vista previa gratis." },
    careerchange: { title: "¿Cambias de carrera? Haz que vean el encaje", description: "Tu experiencia real reformulada para el nuevo campo: habilidades transferibles primero y una carta que explica el cambio." },
    vschatgpt: { title: "ChatGPT te da texto. Nosotros, la postulación completa", description: "No inventa nada — y te lo demuestra: verificación de cada número, entrevista con puntuación y aviso cuando el texto suena a robot." },
    layoff: { title: "¿Te despidieron? Hoy ordenas tu búsqueda", description: "CV base guardado, radar de seguimiento con recordatorios en tu calendario y práctica de entrevista. Sin suscripción." },
    interview: { title: "Practica la entrevista hablando — con nota por respuesta", description: "Un entrevistador de IA con preguntas de la oferta: nota por respuesta, ritmo y muletillas, y una versión más fuerte de lo que dijiste." },
  },
  pill: "Ver esta página en español →",
  pillClose: "Cerrar",
};

export const seoCopy: Record<"en" | "pt" | "es", SeoCopy> = { en, pt, es };
