/**
 * Ad-landing copy for the angles added in round 3 (the first four live in dictionaries.ts).
 * Gupy is named only as "compatível, sem afiliação" and exists in Portuguese only.
 */
type Angle = { title: string; subtitle: string; bullets: string[] };
export type LpCopy = { angles: Partial<Record<"layoff" | "interview" | "gupy", Angle>> };

const en: LpCopy = {
  angles: {
    layoff: {
      title: "Laid off? Take a breath. Today you get organised.",
      subtitle: "A saved base résumé, a tailored kit for each job in two clicks, a follow-up radar with calendar reminders — and interview practice out loud.",
      bullets: ["Your base résumé saved once, reused for every job", "Follow-up radar: when to nudge, with the message ready", "Interview practice with a score per answer", "No subscription — nothing renews"],
    },
    interview: {
      title: "Rehearse the interview out loud. Get a score for every answer.",
      subtitle: "An AI interviewer asks the questions this job will ask. You answer by voice; it scores structure, specifics and relevance — and counts your filler words.",
      bullets: ["Questions built from the posting and your résumé", "Pace and filler words on every answer", "Video-intro studio with a teleprompter", "The stronger version of what you said"],
    },
  },
};

const pt: LpCopy = {
  angles: {
    layoff: {
      title: "Foi desligado? Respira. Hoje você organiza a busca.",
      subtitle: "Currículo base salvo, um kit ajustado pra cada vaga em dois cliques, radar de follow-up com lembrete na agenda e CLT ou PJ na ponta do lápis.",
      bullets: ["Currículo base salvo uma vez, usado em toda vaga", "Radar de follow-up: a hora certa de cobrar, com a mensagem pronta", "Calculadora CLT × PJ com as tabelas de 2026", "Sem assinatura — nada renova sozinho"],
    },
    interview: {
      title: "Treina a entrevista falando. Nota em cada resposta.",
      subtitle: "Um entrevistador de IA faz as perguntas que essa vaga vai fazer. Você responde em voz alta e recebe nota de estrutura, especificidade e relevância — e a contagem dos seus “né” e “tipo”.",
      bullets: ["Perguntas montadas a partir da vaga e do seu currículo", "Ritmo e vícios de linguagem em toda resposta", "Estúdio pro vídeo de apresentação, com teleprompter", "A versão mais forte do que você disse"],
    },
    gupy: {
      title: "Seu currículo passa na triagem da Gupy?",
      subtitle: "Passar na triagem começa no currículo e termina no vídeo. Check grátis, modo formulário pra colar campo por campo e estúdio de pitch. (Compatível com a Gupy, sem afiliação.)",
      bullets: ["Teste de ATS grátis, sem cadastro", "Modo formulário: cada campo com botão de copiar", "Baixa em Word (.docx) e em PDF", "Vídeo de apresentação ensaiado, que fica no seu celular"],
    },
  },
};

const es: LpCopy = {
  angles: {
    layoff: {
      title: "¿Te despidieron? Respira. Hoy ordenas tu búsqueda.",
      subtitle: "Un CV base guardado, un kit ajustado para cada oferta en dos clics, un radar de seguimiento con recordatorios en tu calendario — y práctica de entrevista hablando.",
      bullets: ["Tu CV base guardado una vez, usado en cada oferta", "Radar de seguimiento: cuándo escribir, con el mensaje listo", "Práctica de entrevista con nota por respuesta", "Sin suscripción — nada se renueva solo"],
    },
    interview: {
      title: "Practica la entrevista hablando. Nota en cada respuesta.",
      subtitle: "Un entrevistador de IA hace las preguntas que hará esta oferta. Respondes en voz alta y recibes nota de estructura, detalle y relevancia — y el conteo de tus muletillas.",
      bullets: ["Preguntas armadas con la oferta y tu CV", "Ritmo y muletillas en cada respuesta", "Estudio para tu video de presentación, con teleprompter", "La versión más fuerte de lo que dijiste"],
    },
  },
};

export const lpCopy: Record<"en" | "pt" | "es", LpCopy> = { en, pt, es };
