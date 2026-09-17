import { seoCopy } from "./r3/seo";
import { lpCopy } from "./r3/lp";
import { profileCopy } from "./r3/profile";
import { editorCopy } from "./r3/editor";
import { checksCopy } from "./r3/checks";
import { quantifyCopy } from "./r3/quantify";

/**
 * Round-3 copy, one file per feature under ./r3, exposed as `r` by useI18n(). Every feature
 * file exports { en, pt, es } with the same shape (pt written natively for Brazil).
 */
type L = "en" | "pt" | "es";
const build = (lang: L) => ({
  seo: seoCopy[lang],
  lp: lpCopy[lang],
  profile: profileCopy[lang],
  editor: editorCopy[lang],
  checks: checksCopy[lang],
  quantify: quantifyCopy[lang],
});
export type Round3 = ReturnType<typeof build>;
export const round3: Record<L, Round3> = { en: build("en"), pt: build("pt"), es: build("es") };
