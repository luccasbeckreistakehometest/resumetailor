/** Follow-up radar, interview-day brief, calendar reminders and the offer fields of the tracker. */
type Vars = { company: string; role: string; contact: string; date: string };
type Template = (v: Vars) => { subject: string; body: string };

const en = {
  radarTitle: "Follow-up radar",
  radarStat: "61% of job seekers say they were ghosted after an interview",
  radarStatSource: "Greenhouse, 2024",
  radarEmpty: "Nothing to chase today. We'll tell you when a follow-up is due.",
  kinds: {
    followup: { t: "Time to follow up", d: (n: number) => `${n} days without an answer.` },
    thanks: { t: "Send the thank-you today", d: (n: number) => (n ? `The interview was ${n} day${n === 1 ? "" : "s"} ago.` : "The interview just happened.") },
    prep: { t: "Get ready: interview-day brief", d: () => "Your interview is within 48 hours." },
    offer: { t: "Compare the offer", d: () => "Check the whole package before you answer." },
    feedback: { t: "Ask for feedback", d: () => "One short, polite message — it helps the next application." },
    moveon: { t: "Time to move on", d: (n: number) => `No answer after several follow-ups (${n} days). Put your energy into the next ones — if they reply, great.` },
  } as Record<string, { t: string; d: (n: number) => string }>,
  copy: "Copy message", copied: "Copied", email: "Open in e-mail", whatsapp: "Open in WhatsApp", sent: "I sent it",
  calendar: "Add to calendar", brief: "Open the brief", compare: "Compare CLT × PJ", fromKit: "Written from your kit",
  templates: {
    followup: ((v) => ({ subject: `Following up — ${v.role} application`, body: `Hi ${v.contact || "[name]"},\n\nI'm following up on my application for the ${v.role} role${v.company ? ` at ${v.company}` : ""}, sent on ${v.date}. I'm still very interested and happy to talk whenever it suits you.\n\nIs there an update on the next steps?\n\nThank you,` })) as Template,
    thanks: ((v) => ({ subject: `Thank you — ${v.role} interview`, body: `Hi ${v.contact || "[name]"},\n\nThank you for your time today. I enjoyed learning more about the ${v.role} role${v.company ? ` at ${v.company}` : ""}, especially [the topic we discussed].\n\nThe conversation made me even more interested. Happy to share anything else you need.\n\nBest regards,` })) as Template,
    feedback: ((v) => ({ subject: `Feedback on my ${v.role} application`, body: `Hi ${v.contact || "[name]"},\n\nThank you for letting me know about the ${v.role} role. If you have a minute, I'd really value one or two points I could improve for future opportunities.\n\nThanks again for your time,` })) as Template,
  },
  fields: {
    appliedAt: "Applied on", interviewAt: "Interview (date and time)", contactName: "Contact name", channel: "Channel",
    contactValue: "E-mail / phone / profile", channels: { "": "—", email: "E-mail", whatsapp: "WhatsApp", linkedin: "LinkedIn", other: "Other" } as Record<string, string>,
    offerType: "Offer type", offerAmount: "Offer (gross per month)", clt: "CLT", pj: "PJ",
  },
  interviewChip: (when: string) => `🗓 Interview ${when}`,
  briefTitle: "Interview-day brief",
  briefIntro: "Everything on one screen. Read it on the way.",
  briefSections: { story: "Your story in 3 points", ask: "Questions to ask", rehearse: "What to rehearse", pitch: "Your pitch", notes: "Notes and logistics", company: "About the company", when: "When" },
  briefRehearse: (dim: string) => `Your weakest dimension in practice has been “${dim}”. Rehearse one answer out loud with that in mind.`,
  briefNoPractice: "You haven't practised with this kit yet. Five minutes out loud makes a difference.",
  briefPractice: "Practise 5 minutes now",
  briefGeneric: ["Re-read the job posting and circle three things you can prove.", "Prepare one story with a number: situation, what you did, the result.", "Write two questions for them about the team and what success looks like.", "Check the link, the address or the call time — and arrive 10 minutes early."],
  briefNoKit: "No kit is linked to this application — here's a quick checklist. Link a kit on the tracker card to see your own points.",
  briefBack: "Back to applications",
  briefNotFound: "Application not found.",
};

const pt: typeof en = {
  radarTitle: "Radar de follow-up",
  radarStat: "61% dos candidatos dizem ter ficado sem resposta depois de uma entrevista",
  radarStatSource: "Greenhouse, 2024",
  radarEmpty: "Nada pra cobrar hoje. A gente avisa quando for a hora do follow-up.",
  kinds: {
    followup: { t: "Hora do follow-up", d: (n: number) => `${n} dias sem resposta.` },
    thanks: { t: "Mande o agradecimento hoje", d: (n: number) => (n ? `A entrevista foi há ${n} ${n === 1 ? "dia" : "dias"}.` : "A entrevista acabou de acontecer.") },
    prep: { t: "Prepare-se: folha do dia", d: () => "Sua entrevista é nas próximas 48 horas." },
    offer: { t: "Compare a proposta", d: () => "Olha o pacote inteiro antes de responder." },
    feedback: { t: "Peça feedback", d: () => "Uma mensagem curta e educada — ajuda na próxima candidatura." },
    moveon: { t: "Hora de seguir em frente", d: (n: number) => `Sem resposta depois de várias cobranças (${n} dias). Põe sua energia nas próximas — se responderem, ótimo.` },
  },
  copy: "Copiar mensagem", copied: "Copiado", email: "Abrir no e-mail", whatsapp: "Abrir no WhatsApp", sent: "Marquei como enviado",
  calendar: "Adicionar ao calendário", brief: "Abrir a folha do dia", compare: "Comparar CLT × PJ", fromKit: "Escrita a partir do seu kit",
  templates: {
    followup: (v) => ({ subject: `Acompanhando minha candidatura — ${v.role}`, body: `Oi, ${v.contact || "[nome]"}!\n\nPassando pra acompanhar minha candidatura pra vaga de ${v.role}${v.company ? ` na ${v.company}` : ""}, enviada em ${v.date}. Continuo bem interessado e à disposição pra conversar quando for melhor pra vocês.\n\nTem alguma previsão dos próximos passos?\n\nObrigado!` }),
    thanks: (v) => ({ subject: `Obrigado pela conversa — ${v.role}`, body: `Oi, ${v.contact || "[nome]"}!\n\nObrigado pelo tempo hoje. Gostei muito de conhecer melhor a vaga de ${v.role}${v.company ? ` na ${v.company}` : ""}, principalmente [o assunto que conversamos].\n\nSaí da conversa ainda mais animado. Se precisarem de qualquer informação, é só falar.\n\nAbraço,` }),
    feedback: (v) => ({ subject: `Feedback sobre minha candidatura — ${v.role}`, body: `Oi, ${v.contact || "[nome]"}!\n\nObrigado pelo retorno sobre a vaga de ${v.role}. Se tiver um minutinho, eu agradeceria muito um ou dois pontos que eu possa melhorar pras próximas oportunidades.\n\nObrigado de novo pelo tempo,` }),
  },
  fields: {
    appliedAt: "Candidatura em", interviewAt: "Entrevista (data e hora)", contactName: "Nome do contato", channel: "Canal",
    contactValue: "E-mail / telefone / perfil", channels: { "": "—", email: "E-mail", whatsapp: "WhatsApp", linkedin: "LinkedIn", other: "Outro" },
    offerType: "Tipo de proposta", offerAmount: "Proposta (bruto por mês)", clt: "CLT", pj: "PJ",
  },
  interviewChip: (when: string) => `🗓 Entrevista ${when}`,
  briefTitle: "Folha do dia da entrevista",
  briefIntro: "Tudo numa tela. Lê no caminho.",
  briefSections: { story: "Sua história em 3 pontos", ask: "Perguntas pra fazer", rehearse: "O que treinar", pitch: "Seu pitch", notes: "Anotações e logística", company: "Sobre a empresa", when: "Quando" },
  briefRehearse: (dim: string) => `No treino, seu ponto mais fraco tem sido “${dim}”. Ensaia uma resposta em voz alta pensando nisso.`,
  briefNoPractice: "Você ainda não treinou com este kit. Cinco minutos falando em voz alta fazem diferença.",
  briefPractice: "Treinar 5 minutos agora",
  briefGeneric: ["Relê a vaga e marca três coisas que você consegue provar.", "Prepara uma história com número: a situação, o que você fez, o resultado.", "Anota duas perguntas pra eles sobre o time e o que é sucesso na vaga.", "Confere o link, o endereço ou o horário — e chega 10 minutos antes."],
  briefNoKit: "Nenhum kit ligado a esta candidatura — aqui vai um checklist rápido. Liga um kit no card do tracker pra ver seus próprios pontos.",
  briefBack: "Voltar pras candidaturas",
  briefNotFound: "Candidatura não encontrada.",
};

const es: typeof en = {
  radarTitle: "Radar de seguimiento",
  radarStat: "El 61% de quienes buscan empleo dice que no recibió respuesta después de una entrevista",
  radarStatSource: "Greenhouse, 2024",
  radarEmpty: "Nada que perseguir hoy. Te avisamos cuando toque hacer seguimiento.",
  kinds: {
    followup: { t: "Hora del seguimiento", d: (n: number) => `${n} días sin respuesta.` },
    thanks: { t: "Envía el agradecimiento hoy", d: (n: number) => (n ? `La entrevista fue hace ${n} ${n === 1 ? "día" : "días"}.` : "La entrevista acaba de ocurrir.") },
    prep: { t: "Prepárate: hoja del día", d: () => "Tu entrevista es en las próximas 48 horas." },
    offer: { t: "Compara la oferta", d: () => "Mira el paquete completo antes de responder." },
    feedback: { t: "Pide feedback", d: () => "Un mensaje corto y amable — ayuda en la próxima postulación." },
    moveon: { t: "Hora de seguir adelante", d: (n: number) => `Sin respuesta tras varios seguimientos (${n} días). Pon tu energía en las próximas — si responden, genial.` },
  },
  copy: "Copiar mensaje", copied: "Copiado", email: "Abrir en el correo", whatsapp: "Abrir en WhatsApp", sent: "Ya lo envié",
  calendar: "Añadir al calendario", brief: "Abrir la hoja del día", compare: "Comparar CLT × PJ", fromKit: "Escrito desde tu kit",
  templates: {
    followup: (v) => ({ subject: `Seguimiento de mi postulación — ${v.role}`, body: `Hola, ${v.contact || "[nombre]"}:\n\nEscribo para dar seguimiento a mi postulación al puesto de ${v.role}${v.company ? ` en ${v.company}` : ""}, enviada el ${v.date}. Sigo muy interesado y disponible para conversar cuando les venga bien.\n\n¿Hay novedades sobre los próximos pasos?\n\nGracias,` }),
    thanks: (v) => ({ subject: `Gracias por la conversación — ${v.role}`, body: `Hola, ${v.contact || "[nombre]"}:\n\nGracias por su tiempo hoy. Disfruté conocer más sobre el puesto de ${v.role}${v.company ? ` en ${v.company}` : ""}, sobre todo [el tema que conversamos].\n\nSalí aún más interesado. Quedo atento a lo que necesiten.\n\nSaludos,` }),
    feedback: (v) => ({ subject: `Feedback sobre mi postulación — ${v.role}`, body: `Hola, ${v.contact || "[nombre]"}:\n\nGracias por avisarme sobre el puesto de ${v.role}. Si tienen un minuto, valoraría mucho uno o dos puntos que pueda mejorar para futuras oportunidades.\n\nGracias de nuevo,` }),
  },
  fields: {
    appliedAt: "Postulé el", interviewAt: "Entrevista (fecha y hora)", contactName: "Nombre del contacto", channel: "Canal",
    contactValue: "Correo / teléfono / perfil", channels: { "": "—", email: "Correo", whatsapp: "WhatsApp", linkedin: "LinkedIn", other: "Otro" },
    offerType: "Tipo de oferta", offerAmount: "Oferta (bruto por mes)", clt: "Empleado", pj: "Contratista",
  },
  interviewChip: (when: string) => `🗓 Entrevista ${when}`,
  briefTitle: "Hoja del día de la entrevista",
  briefIntro: "Todo en una pantalla. Léela en el camino.",
  briefSections: { story: "Tu historia en 3 puntos", ask: "Preguntas para hacer", rehearse: "Qué practicar", pitch: "Tu pitch", notes: "Notas y logística", company: "Sobre la empresa", when: "Cuándo" },
  briefRehearse: (dim: string) => `En la práctica, tu punto más débil ha sido “${dim}”. Ensaya una respuesta en voz alta pensando en eso.`,
  briefNoPractice: "Aún no practicaste con este kit. Cinco minutos en voz alta marcan la diferencia.",
  briefPractice: "Practicar 5 minutos ahora",
  briefGeneric: ["Relee la oferta y marca tres cosas que puedes demostrar.", "Prepara una historia con un número: la situación, lo que hiciste, el resultado.", "Anota dos preguntas sobre el equipo y qué es el éxito en el puesto.", "Revisa el enlace, la dirección o la hora — y llega 10 minutos antes."],
  briefNoKit: "No hay un kit vinculado a esta postulación — aquí tienes una lista rápida. Vincula un kit en la tarjeta para ver tus propios puntos.",
  briefBack: "Volver a postulaciones",
  briefNotFound: "Postulación no encontrada.",
};

export const trackerCopy = { en, pt, es };
