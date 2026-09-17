export const ANGLES = ["jobseeker", "firstjob", "careerchange", "vschatgpt"] as const;
export type AngleKey = (typeof ANGLES)[number];
export const isAngle = (v: string): v is AngleKey => (ANGLES as readonly string[]).includes(v);

/** Search/share copy per ad angle (English, like the server-rendered page; round 3 localises the routes). */
export const LP_META: Record<AngleKey, { title: string; description: string }> = {
  jobseeker: { title: "Stop getting ghosted — tailor your résumé to every job", description: "Tailor your résumé to any posting in 30 seconds, with a match score before and after, a cover letter, LinkedIn and interview practice. Free preview." },
  firstjob: { title: "Your first résumé, built honestly — no experience needed", description: "No CV yet? Talk or type about your studies, projects and skills and get an honest first résumé, cover letter and interview practice. Free preview." },
  careerchange: { title: "Changing careers? Make recruiters see the fit", description: "Your real experience reframed for the new field: transferable skills first, a match score for the target role, and a cover letter that explains the switch." },
  vschatgpt: { title: "More than ChatGPT: a ready-to-send application kit", description: "A quantified match score, ATS and designed formats, a scored mock interview — no prompting skills needed. Free preview." },
};
