/** International version of the résumé. */
const en = {
  title: "Résumé for jobs abroad",
  intro: "A version in another language, in that market's format: no ID, age or photo, dates and degrees the way employers there read them — and your language level never inflated.",
  langs: { en: "English", pt: "Portuguese", es: "Spanish" } as Record<string, string>,
  make: (l: string) => `Make it in ${l}`, working: "Writing…", open: "Open / print", word: "Word (.docx)", txt: "Text (.txt)",
  notes: "What changed", missing: (n: string) => `Check these numbers — they are in your résumé but not in this version: ${n}`,
  allNumbers: "Every number and date from your résumé is there.",
  left: (n: number) => `${n} language${n === 1 ? "" : "s"} left for this kit`, used: "You've used this kit's international versions.",
  locked: "Unlock the kit to get it in English or Spanish, in the local format.",
};
const pt: typeof en = {
  title: "Currículo pra vaga gringa",
  intro: "Uma versão em outro idioma, no padrão de fora: sem CPF, idade nem foto, datas e formação do jeito que o recrutador de lá lê — e sem inflar seu nível de idioma.",
  langs: { en: "inglês", pt: "português", es: "espanhol" },
  make: (l: string) => `Fazer em ${l}`, working: "Escrevendo…", open: "Abrir / imprimir", word: "Word (.docx)", txt: "Texto (.txt)",
  notes: "O que mudou", missing: (n: string) => `Confere estes números — estão no seu currículo e não aparecem nesta versão: ${n}`,
  allNumbers: "Todos os números e datas do seu currículo estão lá.",
  left: (n: number) => `${n} ${n === 1 ? "idioma restante" : "idiomas restantes"} neste kit`, used: "Você já usou as versões internacionais deste kit.",
  locked: "Libera o kit pra ter a versão em inglês ou espanhol, no padrão de lá.",
};
const es: typeof en = {
  title: "CV para trabajar en el exterior",
  intro: "Una versión en otro idioma, con el formato de ese mercado: sin documento, edad ni foto, fechas y títulos como se leen allá — y sin inflar tu nivel de idioma.",
  langs: { en: "inglés", pt: "portugués", es: "español" },
  make: (l: string) => `Hacerlo en ${l}`, working: "Escribiendo…", open: "Abrir / imprimir", word: "Word (.docx)", txt: "Texto (.txt)",
  notes: "Qué cambió", missing: (n: string) => `Revisa estos números — están en tu CV y no en esta versión: ${n}`,
  allNumbers: "Todos los números y fechas de tu CV están ahí.",
  left: (n: number) => `${n} ${n === 1 ? "idioma restante" : "idiomas restantes"} en este kit`, used: "Ya usaste las versiones internacionales de este kit.",
  locked: "Desbloquea el kit para tenerlo en inglés o portugués, con el formato local.",
};
export const intlCopy = { en, pt, es };
