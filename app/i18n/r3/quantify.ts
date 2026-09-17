/** "Faltou número? Ele pergunta." — the missing-numbers questions on an unlocked kit. */
const en = {
  title: "Put numbers in your résumé",
  intro: "Recruiters scan for results. We never invent figures — so we ask. Answer what you know; skip the rest.",
  lockedTeaser: (n: number) => `${n} quick question${n === 1 ? "" : "s"} to make your résumé stronger — after you unlock.`,
  value: "Number", context: "What it measures (optional)", dontKnow: "I don't know / doesn't apply",
  speak: "Answer by voice", listening: "Listening…",
  submit: "Update my résumé", working: "Rewriting those bullets…",
  done: (n: number) => (n ? `Done — ${n} bullet${n === 1 ? "" : "s"} now carr${n === 1 ? "ies" : "y"} your numbers. The previous version is in the history.` : "We couldn't place those numbers — edit the bullets by hand."),
  used: "You've used this kit's numbers round. Edit the bullets by hand for more.",
  none: "Every bullet that needed a number already has one.",
  answerOne: "Answer at least one question (or edit by hand).",
};

const pt: typeof en = {
  title: "Deixa seu currículo com números",
  intro: "Recrutador procura resultado. A gente não inventa número nenhum — então pergunta. Responde o que você sabe; pula o resto.",
  lockedTeaser: (n: number) => `${n} ${n === 1 ? "pergunta rápida" : "perguntas rápidas"} pra deixar seu currículo mais forte — depois de liberar.`,
  value: "Número", context: "Do quê (opcional)", dontKnow: "Não sei / não se aplica",
  speak: "Responder falando", listening: "Ouvindo…",
  submit: "Atualizar currículo", working: "Reescrevendo esses tópicos…",
  done: (n: number) => (n ? `Pronto — ${n} ${n === 1 ? "tópico agora traz" : "tópicos agora trazem"} seus números. A versão anterior está no histórico.` : "Não deu pra encaixar esses números — edita os tópicos à mão."),
  used: "Você já usou a rodada de números deste kit. Pra mais, edita os tópicos à mão.",
  none: "Todo tópico que precisava de número já tem.",
  answerOne: "Responde pelo menos uma pergunta (ou edita à mão).",
};

const es: typeof en = {
  title: "Ponle números a tu CV",
  intro: "Los reclutadores buscan resultados. Nunca inventamos cifras — por eso preguntamos. Responde lo que sepas; salta el resto.",
  lockedTeaser: (n: number) => `${n} ${n === 1 ? "pregunta rápida" : "preguntas rápidas"} para fortalecer tu CV — al desbloquear.`,
  value: "Número", context: "De qué (opcional)", dontKnow: "No sé / no aplica",
  speak: "Responder hablando", listening: "Escuchando…",
  submit: "Actualizar mi CV", working: "Reescribiendo esas viñetas…",
  done: (n: number) => (n ? `Listo — ${n} ${n === 1 ? "viñeta ahora muestra" : "viñetas ahora muestran"} tus números. La versión anterior está en el historial.` : "No pudimos ubicar esas cifras — edita las viñetas a mano."),
  used: "Ya usaste la ronda de números de este kit. Para más, edita las viñetas a mano.",
  none: "Cada viñeta que necesitaba un número ya lo tiene.",
  answerOne: "Responde al menos una pregunta (o edita a mano).",
};

export const quantifyCopy = { en, pt, es };
