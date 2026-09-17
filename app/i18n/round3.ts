import { seoCopy } from "./r3/seo";
import { lpCopy } from "./r3/lp";

/**
 * Round-3 copy, one file per feature under ./r3, exposed as `r` by useI18n(). Every feature
 * file exports { en, pt, es } with the same shape (pt written natively for Brazil).
 */
const build = (lang: "en" | "pt" | "es") => ({
  seo: seoCopy[lang],
  lp: lpCopy[lang],
});
export type Round3 = ReturnType<typeof build>;
export const round3: Record<"en" | "pt" | "es", Round3> = { en: build("en"), pt: build("pt"), es: build("es") };
