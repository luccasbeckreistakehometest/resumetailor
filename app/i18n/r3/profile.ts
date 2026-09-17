/** The saved base résumé ("Meu currículo base") and the one-click "new job with this résumé". */
const en = {
  remember: "Remember this résumé for my next applications",
  usingSaved: (date: string) => `Using your saved résumé (updated ${date})`,
  change: "change",
  useSaved: "Use my saved résumé",
  newJob: "New job with this résumé",
  newJobHint: "Opens a new kit with this résumé already filled in — you only paste the next posting.",
  fromKit: "Using the résumé from your kit",
  baseTitle: "My base résumé",
  baseIntro: "Saved once, reused for every job. Edit it here; your kits are never changed by this.",
  baseEmpty: "No base résumé yet. It is saved when you make a kit with “remember this résumé” ticked.",
  factsTitle: (n: number) => `${n} thing${n === 1 ? "" : "s"} you told us that the kit can use`,
  save: "Save", saved: "Saved.", remove: "Delete my base résumé", removed: "Deleted.",
  confirmRemove: "Delete the saved résumé and facts? Your kits stay as they are.",
  updated: (date: string) => `Updated ${date}`,
};

const pt: typeof en = {
  remember: "Lembrar este currículo pras próximas vagas",
  usingSaved: (date: string) => `Usando seu currículo salvo (atualizado em ${date})`,
  change: "trocar",
  useSaved: "Usar meu currículo salvo",
  newJob: "Nova vaga com este currículo",
  newJobHint: "Abre um kit novo com este currículo já preenchido — você só cola a próxima vaga.",
  fromKit: "Usando o currículo do seu kit",
  baseTitle: "Meu currículo base",
  baseIntro: "Salvo uma vez, usado em toda vaga. Edita aqui; seus kits não mudam por causa disso.",
  baseEmpty: "Ainda não tem currículo base. Ele é salvo quando você faz um kit com “lembrar este currículo” marcado.",
  factsTitle: (n: number) => `${n} ${n === 1 ? "coisa que você contou e que o kit pode usar" : "coisas que você contou e que o kit pode usar"}`,
  save: "Salvar", saved: "Salvo.", remove: "Apagar meu currículo base", removed: "Apagado.",
  confirmRemove: "Apagar o currículo salvo e o que você contou? Seus kits continuam como estão.",
  updated: (date: string) => `Atualizado em ${date}`,
};

const es: typeof en = {
  remember: "Recordar este CV para mis próximas postulaciones",
  usingSaved: (date: string) => `Usando tu CV guardado (actualizado el ${date})`,
  change: "cambiar",
  useSaved: "Usar mi CV guardado",
  newJob: "Nueva oferta con este CV",
  newJobHint: "Abre un kit nuevo con este CV ya cargado — solo pegas la próxima oferta.",
  fromKit: "Usando el CV de tu kit",
  baseTitle: "Mi CV base",
  baseIntro: "Se guarda una vez y sirve para cada oferta. Edítalo aquí; tus kits no cambian por esto.",
  baseEmpty: "Aún no tienes CV base. Se guarda cuando haces un kit con “recordar este CV” marcado.",
  factsTitle: (n: number) => `${n} ${n === 1 ? "cosa que nos contaste y que el kit puede usar" : "cosas que nos contaste y que el kit puede usar"}`,
  save: "Guardar", saved: "Guardado.", remove: "Borrar mi CV base", removed: "Borrado.",
  confirmRemove: "¿Borrar el CV guardado y lo que nos contaste? Tus kits quedan como están.",
  updated: (date: string) => `Actualizado el ${date}`,
};

export const profileCopy = { en, pt, es };
