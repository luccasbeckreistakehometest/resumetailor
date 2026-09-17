import { seoCopy } from "./r3/seo";
import { lpCopy } from "./r3/lp";
import { profileCopy } from "./r3/profile";

/**
 * Round-3 copy, one file per feature under ./r3, exposed as `r` by useI18n(). Every feature
 * file exports { en, pt, es } with the same shape (pt written natively for Brazil).
 */
type L = "en" | "pt" | "es";
const build = (lang: L) => ({
  seo: seoCopy[lang],
  lp: lpCopy[lang],
  profile: profileCopy[lang],
});
export type Round3 = ReturnType<typeof build>;
export const round3: Record<L, Round3> = { en: build("en"), pt: build("pt"), es: build("es") };
