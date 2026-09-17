/** The hands-free voice briefing and the "I'll also use what you told me" chip. */
const en = {
  canSpeak: "Go ahead, I'm listening", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…", paused: "Paused",
  pause: "Pause conversation", resume: "Resume", done: "I'm done", typeInstead: "I'd rather type", talkNow: "Talk now",
  autoHint: "Take your time — when you pause for a moment, I'll take it from there.",
  optional: "Optional — or just press “Looks right”.",
  noSpeech: "I can't hear anything. Check the microphone, or type instead.",
  chip: (a: number, t: number) => `🎙 I'll also use what you told me: ${a} achievement${a === 1 ? "" : "s"} · ${t} tool${t === 1 ? "" : "s"}`,
  chipEdit: "see / edit", chipRemove: "Remove", chipEmpty: "Nothing from the conversation will be used.",
};

const pt: typeof en = {
  canSpeak: "Pode falar, estou ouvindo", listening: "Ouvindo…", thinking: "Pensando…", speaking: "Falando…", paused: "Pausado",
  pause: "Pausar conversa", resume: "Continuar", done: "Terminei", typeInstead: "Prefiro digitar", talkNow: "Falar agora",
  autoHint: "Fala no seu tempo — quando você der uma pausa, eu sigo daqui.",
  optional: "Opcional — ou é só apertar “Tá certo”.",
  noSpeech: "Não estou te ouvindo. Confere o microfone, ou digita.",
  chip: (a: number, t: number) => `🎙 Vou usar também o que você me contou: ${a} ${a === 1 ? "conquista" : "conquistas"} · ${t} ${t === 1 ? "ferramenta" : "ferramentas"}`,
  chipEdit: "ver / editar", chipRemove: "Tirar", chipEmpty: "Nada da conversa vai ser usado.",
};

const es: typeof en = {
  canSpeak: "Adelante, te escucho", listening: "Escuchando…", thinking: "Pensando…", speaking: "Hablando…", paused: "En pausa",
  pause: "Pausar conversación", resume: "Seguir", done: "Terminé", typeInstead: "Prefiero escribir", talkNow: "Hablar ahora",
  autoHint: "Habla con calma — cuando hagas una pausa, sigo yo.",
  optional: "Opcional — o simplemente pulsa “Está bien”.",
  noSpeech: "No te escucho. Revisa el micrófono, o escribe.",
  chip: (a: number, t: number) => `🎙 También usaré lo que me contaste: ${a} ${a === 1 ? "logro" : "logros"} · ${t} ${t === 1 ? "herramienta" : "herramientas"}`,
  chipEdit: "ver / editar", chipRemove: "Quitar", chipEmpty: "No se usará nada de la conversación.",
};

export const voiceCopy = { en, pt, es };
