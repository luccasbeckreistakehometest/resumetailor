import type { Lang } from "@/lib/ats/check";

/**
 * The search-facing copy of the free ATS check, one voice per market. pt is written for Brazil
 * (Gupy is the ATS people meet there), not translated from en.
 */
export interface AtsCopy {
  title: string; description: string; badge: string; h1: string; intro: string;
  stepsTitle: string; steps: string[];
  faqTitle: string; faq: { q: string; a: string }[];
}

export const ATS_COPY: Record<Lang, AtsCopy> = {
  en: {
    title: "Free ATS résumé check — score in seconds, no signup | ResumeTailor",
    description: "Paste your résumé (and the job posting) and get an ATS score out of 100 with a prioritised fix list: sections, dates, quantified bullets, keyword match and format red flags. No AI, nothing stored.",
    badge: "Free · no signup · nothing stored",
    h1: "Will your résumé get past the ATS?",
    intro: "Most companies filter applications with software before a person reads them. Paste your résumé below and see, in seconds, what a parser sees — and what to fix first. It runs in your browser: no account, no AI, nothing is stored.",
    stepsTitle: "How it works",
    steps: [
      "Paste the text of your résumé — copy it straight from your PDF or Word file.",
      "Optionally paste the job posting to see which of its keywords you're missing.",
      "Get a score out of 100, the fixes in priority order, and a card you can share.",
    ],
    faqTitle: "Questions, answered",
    faq: [
      { q: "What is an ATS?", a: "An Applicant Tracking System — the software (Workday, Greenhouse, Gupy, Lever, SAP SuccessFactors…) that stores applications and lets recruiters search and rank them. If it can't parse your résumé, you're invisible in that search." },
      { q: "Is this the same score a real ATS gives?", a: "No. Each system ranks by its own rules and by the recruiter's filters. This check measures the things every parser depends on — structure, dates, keywords, a parseable layout — so a low score here reliably predicts trouble there." },
      { q: "Do you store my résumé?", a: "No. The text is analysed in your browser and thrown away. The share link only carries the score and the fix list." },
      { q: "How do I fix it fast?", a: "The full kit rewrites your résumé for the exact posting — the missing keywords where they're true of you, quantified bullets, an ATS-safe layout — plus a cover letter, LinkedIn About and interview prep, in about 30 seconds." },
    ],
  },
  pt: {
    title: "Teste de currículo pra ATS e Gupy — nota na hora, sem cadastro | ResumeTailor",
    description: "Cola seu currículo (e a vaga) e recebe uma nota de 0 a 100 com a lista do que arrumar primeiro: seções, datas, resultados com número, palavras-chave da vaga e o que quebra o robô da Gupy. Sem IA, nada fica guardado.",
    badge: "Grátis · sem cadastro · nada fica guardado",
    h1: "Seu currículo passa na triagem da Gupy?",
    intro: "No Brasil, a maioria das vagas passa por um robô — Gupy, Workday, SAP — antes de chegar numa pessoa. Cola seu currículo aqui embaixo e vê em segundos o que o robô enxerga e o que arrumar primeiro. Roda no seu navegador: sem conta, sem IA, nada fica guardado.",
    stepsTitle: "Como funciona",
    steps: [
      "Cola o texto do seu currículo — copia direto do PDF ou do Word.",
      "Se quiser, cola a vaga também pra ver quais palavras-chave dela estão faltando.",
      "Recebe a nota de 0 a 100, a lista do que arrumar por ordem de impacto e um card pra compartilhar.",
    ],
    faqTitle: "Perguntas frequentes",
    faq: [
      { q: "O que é ATS (e o que a Gupy tem a ver)?", a: "ATS é o sistema que recebe as candidaturas e deixa o recrutador buscar e ranquear — Gupy, Workday, SAP SuccessFactors, Greenhouse. No Brasil a Gupy é o mais comum, e a IA dela ordena os candidatos pela aderência do perfil à vaga. Se o robô não lê seu currículo direito, você some da busca." },
      { q: "A nota é a mesma que a Gupy dá?", a: "Não. Cada sistema tem as próprias regras, e o recrutador ainda aplica filtros. Esse teste mede o que todo robô depende — estrutura, datas, palavras-chave, layout legível —, então nota baixa aqui costuma virar silêncio lá." },
      { q: "Vocês guardam meu currículo?", a: "Não. O texto é analisado no seu navegador e descartado. O link de compartilhar só leva a nota e a lista do que arrumar." },
      { q: "Como arrumo isso rápido?", a: "O kit completo reescreve seu currículo pra vaga exata — coloca as palavras-chave que faltam (só as que são verdade), transforma os tópicos em resultados com número e entrega num layout que passa no robô —, mais carta, Sobre do LinkedIn e preparação pra entrevista. Uns 30 segundos." },
    ],
  },
  es: {
    title: "Test ATS gratis para tu CV — puntaje al instante, sin registro | ResumeTailor",
    description: "Pega tu CV (y la oferta) y recibe un puntaje de 0 a 100 con la lista de qué arreglar primero: secciones, fechas, logros con números, palabras clave de la oferta y señales de formato que rompen el parser. Sin IA, nada se guarda.",
    badge: "Gratis · sin registro · nada se guarda",
    h1: "¿Tu CV pasa el filtro del ATS?",
    intro: "La mayoría de las empresas filtran las postulaciones con software antes de que una persona las lea. Pega tu CV abajo y mira en segundos qué ve el parser — y qué arreglar primero. Corre en tu navegador: sin cuenta, sin IA, nada se guarda.",
    stepsTitle: "Cómo funciona",
    steps: [
      "Pega el texto de tu CV — cópialo directo del PDF o del Word.",
      "Si quieres, pega también la oferta para ver qué palabras clave te faltan.",
      "Recibe el puntaje de 0 a 100, los arreglos por orden de impacto y una tarjeta para compartir.",
    ],
    faqTitle: "Preguntas frecuentes",
    faq: [
      { q: "¿Qué es un ATS?", a: "El sistema que recibe las postulaciones y deja al reclutador buscar y ordenar candidatos — Workday, Greenhouse, Lever, SAP SuccessFactors, Gupy. Si no puede leer tu CV, eres invisible en esa búsqueda." },
      { q: "¿Es el mismo puntaje que da un ATS real?", a: "No. Cada sistema ordena con sus propias reglas y con los filtros del reclutador. Este test mide lo que todo parser necesita — estructura, fechas, palabras clave, un diseño legible —, así que un puntaje bajo aquí suele anticipar silencio allá." },
      { q: "¿Guardan mi CV?", a: "No. El texto se analiza en tu navegador y se descarta. El link para compartir solo lleva el puntaje y la lista de arreglos." },
      { q: "¿Cómo lo arreglo rápido?", a: "El kit completo reescribe tu CV para la oferta exacta — las palabras clave que faltan donde sean ciertas, logros con números, un diseño que pasa el parser — más carta, About de LinkedIn y preparación de entrevista, en unos 30 segundos." },
    ],
  },
};
