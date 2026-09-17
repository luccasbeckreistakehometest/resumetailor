/** The first-visit tour, version 2: six steps. */
type Step = { t: string; b: string };
const en: { steps: Step[] } = {
  steps: [
    { t: "Talk or type — your call", b: "Say who you are and what you're after, or paste your résumé and the posting. Same kit either way." },
    { t: "This part is free", b: "ATS check, “Am I a fit?” and the job comparator — no credit, most without an account." },
    { t: "Your first kit is on us", b: "Previews are free. Create an account and your first full kit is unlocked with the free credit." },
    { t: "Your kits and applications live here", b: "Edit, export to Word, start the next job in two clicks — and the tracker's radar tells you when to follow up." },
    { t: "Rehearse the interview and the video out loud", b: "A score for every answer, your pace and filler words, and a teleprompter for the video intro." },
    { t: "Everything, in one place", b: "Every tool, free ones first. Come back here whenever you need something." },
  ],
};
const pt: typeof en = {
  steps: [
    { t: "Fala ou digita — você escolhe", b: "Conta quem você é e o que procura, ou cola o currículo e a vaga. O kit é o mesmo." },
    { t: "Isto aqui é grátis", b: "Teste de ATS, “sou um fit?”, comparador de vagas e calculadora CLT × PJ — sem crédito, quase tudo sem cadastro." },
    { t: "Seu primeiro kit é por nossa conta", b: "A prévia é grátis. Cria uma conta e o primeiro kit completo sai com o crédito de presente." },
    { t: "Aqui ficam seus kits e suas candidaturas", b: "Edita, baixa em Word, começa a próxima vaga em dois cliques — e o radar do tracker avisa a hora do follow-up." },
    { t: "Treina a entrevista e o vídeo falando", b: "Nota em cada resposta, ritmo e vícios de linguagem, e teleprompter pro vídeo de apresentação." },
    { t: "Tudo que dá pra fazer, num lugar só", b: "Todas as ferramentas, as grátis primeiro. Volta aqui sempre que precisar." },
  ],
};
const es: typeof en = {
  steps: [
    { t: "Habla o escribe — tú eliges", b: "Cuéntanos quién eres y qué buscas, o pega tu CV y la oferta. El kit es el mismo." },
    { t: "Esto es gratis", b: "Test ATS, “¿Encajo?” y el comparador de ofertas — sin crédito, casi todo sin cuenta." },
    { t: "Tu primer kit va por nuestra cuenta", b: "La vista previa es gratis. Crea una cuenta y tu primer kit completo se desbloquea con el crédito de regalo." },
    { t: "Aquí viven tus kits y postulaciones", b: "Edita, descarga en Word, empieza la próxima oferta en dos clics — y el radar te avisa cuándo hacer seguimiento." },
    { t: "Practica la entrevista y el video hablando", b: "Nota en cada respuesta, ritmo y muletillas, y teleprompter para el video de presentación." },
    { t: "Todo, en un solo lugar", b: "Todas las herramientas, primero las gratis. Vuelve aquí cuando lo necesites." },
  ],
};
export const tourCopy = { en, pt, es };
