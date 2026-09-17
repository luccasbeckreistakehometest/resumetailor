import type { FeatureKey } from "./showcase";
import type { AngleKey } from "@/lib/i18n/routes";

/**
 * What each ad landing shows: its features (in order), the free tools strip and its FAQ. The
 * calculator is Brazil-only and is dropped outside Portuguese automatically.
 */
export type FreeTool = "ats" | "fit" | "compare" | "calculator";
export const ANGLE_CONTENT: Record<AngleKey, { features: FeatureKey[]; free: FreeTool[] }> = {
  jobseeker: { features: ["match", "fit", "truth", "editor", "compare", "tracker", "interview", "letters", "webcv"], free: ["ats", "fit", "compare", "calculator"] },
  firstjob: { features: ["voice", "truth", "numbers", "editor", "pitch", "interview", "linkedin", "webcv"], free: ["ats", "fit", "calculator"] },
  careerchange: { features: ["match", "meter", "fit", "truth", "human", "editor", "letters", "interview"], free: ["fit", "ats", "compare"] },
  vschatgpt: { features: ["truth", "human", "numbers", "match", "interview", "editor", "pitch", "compare"], free: ["ats", "fit", "compare"] },
  layoff: { features: ["tracker", "editor", "compare", "calculator", "interview", "letters", "voice", "codes"], free: ["compare", "calculator", "ats", "fit"] },
  interview: { features: ["interview", "pitch", "voice", "tracker", "truth", "letters"], free: ["ats", "fit", "compare"] },
  gupy: { features: ["ats", "editor", "pitch", "truth", "human", "interview", "calculator", "tracker"], free: ["ats", "fit", "calculator", "compare"] },
};

type QA = { q: string; a: string };
type AngleFaq = { base: QA[]; specific: Partial<Record<AngleKey, QA>> };

const en: AngleFaq = {
  base: [
    { q: "Does the AI make things up?", a: "No. It only uses what you gave us — and the truth check lists every number, employer and date it couldn't find in your résumé or in what you told us, so you confirm or fix it." },
    { q: "Is there a subscription?", a: "No. You buy credits once; one credit unlocks one full kit. Nothing renews, and credits never expire. Your first kit is free with an account." },
    { q: "What's free?", a: "The ATS check, “Am I a fit?”, the job comparator and the preview of every kit — no credit needed." },
  ],
  specific: {
    jobseeker: { q: "How fast is it?", a: "About 30 seconds for the kit. The tracker then tells you when to follow up." },
    firstjob: { q: "I have no experience. Will it invent some?", a: "Never. It builds from your studies, projects and skills, and asks for numbers instead of guessing them." },
    careerchange: { q: "Will it pretend I already worked in the new field?", a: "No. It reframes what you really did and shows, line by line, what changed and why." },
    vschatgpt: { q: "Why not just use ChatGPT?", a: "Chat agrees with you. We check your numbers, score your interview answers and warn you when the text sounds like a bot — and the kit comes ready to send." },
    layoff: { q: "Can I use one résumé for many jobs?", a: "Yes. Your base résumé is saved; each new job is two clicks away, and the radar keeps the follow-ups on time." },
    interview: { q: "What does the interview score measure?", a: "Structure, specifics and relevance for each answer, plus your pace and filler words when you answer out loud." },
  },
};
const pt: AngleFaq = {
  base: [
    { q: "A IA inventa coisa?", a: "Não. Ela só usa o que você mandou — e a checagem de verdade lista todo número, empresa e data que não achou no seu currículo nem no que você contou, pra você confirmar ou corrigir." },
    { q: "Tem assinatura?", a: "Não. Você compra créditos uma vez; um crédito libera um kit completo. Nada renova sozinho e o crédito não vence. O primeiro kit é grátis com uma conta." },
    { q: "O que é grátis?", a: "O teste de ATS, o “sou um fit?”, o comparador de vagas, a calculadora CLT × PJ e a prévia de todo kit — sem gastar crédito." },
  ],
  specific: {
    jobseeker: { q: "Quanto tempo leva?", a: "Uns 30 segundos pro kit. Depois o tracker avisa a hora certa de cobrar retorno." },
    firstjob: { q: "Não tenho experiência. Ele vai inventar?", a: "Nunca. Ele monta a partir dos seus estudos, projetos e habilidades — e pergunta os números em vez de chutar." },
    careerchange: { q: "Ele vai fingir que eu já era da área?", a: "Não. Ele reposiciona o que você fez de verdade e mostra, linha por linha, o que mudou e por quê." },
    vschatgpt: { q: "Por que não usar só o ChatGPT?", a: "O chat concorda com você. A gente confere seus números, dá nota pras suas respostas e avisa quando o texto tem cara de robô — e o kit sai pronto pra enviar." },
    layoff: { q: "Dá pra usar um currículo pra várias vagas?", a: "Dá. Seu currículo base fica salvo; cada vaga nova sai em dois cliques, e o radar mantém os follow-ups em dia." },
    interview: { q: "O que a nota da entrevista mede?", a: "Estrutura, especificidade e relevância de cada resposta, além do ritmo e dos vícios de linguagem quando você responde falando." },
    gupy: { q: "Vocês são parceiros da Gupy?", a: "Não. O ResumeTailor é compatível com a Gupy e com outros sistemas de candidatura, mas não tem afiliação com nenhum deles." },
  },
};
const es: AngleFaq = {
  base: [
    { q: "¿La IA inventa cosas?", a: "No. Solo usa lo que nos diste — y la verificación lista cada número, empresa y fecha que no encontró en tu CV ni en lo que contaste, para que lo confirmes o corrijas." },
    { q: "¿Hay suscripción?", a: "No. Compras créditos una vez; un crédito desbloquea un kit completo. Nada se renueva y los créditos no vencen. Tu primer kit es gratis con una cuenta." },
    { q: "¿Qué es gratis?", a: "El test ATS, “¿Encajo?”, el comparador de ofertas y la vista previa de cada kit — sin gastar crédito." },
  ],
  specific: {
    jobseeker: { q: "¿Cuánto tarda?", a: "Unos 30 segundos el kit. Después, el tracker te avisa cuándo hacer seguimiento." },
    firstjob: { q: "No tengo experiencia. ¿Va a inventarla?", a: "Nunca. Arma tu CV con tus estudios, proyectos y habilidades, y pregunta los números en vez de adivinarlos." },
    careerchange: { q: "¿Va a fingir que ya trabajé en el área?", a: "No. Reformula lo que hiciste de verdad y muestra, línea por línea, qué cambió y por qué." },
    vschatgpt: { q: "¿Por qué no usar solo ChatGPT?", a: "El chat te da la razón. Nosotros verificamos tus números, puntuamos tus respuestas y avisamos cuando el texto suena a robot — y el kit sale listo para enviar." },
    layoff: { q: "¿Puedo usar un CV para varias ofertas?", a: "Sí. Tu CV base queda guardado; cada oferta nueva está a dos clics y el radar mantiene los seguimientos al día." },
    interview: { q: "¿Qué mide la nota de la entrevista?", a: "Estructura, detalle y relevancia de cada respuesta, además del ritmo y las muletillas cuando respondes hablando." },
  },
};
export const angleFaq = { en, pt, es };
