import { seoCopy } from "./r3/seo";
import { lpCopy } from "./r3/lp";
import { profileCopy } from "./r3/profile";
import { editorCopy } from "./r3/editor";
import { checksCopy } from "./r3/checks";
import { quantifyCopy } from "./r3/quantify";
import { voiceCopy } from "./r3/voice";
import { acquisitionCopy } from "./r3/acquisition";
import { trackerCopy } from "./r3/tracker";
import { pitchCopy } from "./r3/pitch";
import { compareCopy } from "./r3/compare";
import { intlCopy } from "./r3/intl";
import { codesCopy } from "./r3/codes";
import { showcaseCopy } from "./r3/showcase";
import { angleFaq } from "./r3/angles";

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
  voice: voiceCopy[lang],
  acquisition: acquisitionCopy[lang],
  tracker: trackerCopy[lang],
  pitch: pitchCopy[lang],
  compare: compareCopy[lang],
  intl: intlCopy[lang],
  codes: codesCopy[lang],
  showcase: showcaseCopy[lang],
  angleFaq: angleFaq[lang],
});
export type Round3 = ReturnType<typeof build>;
export const round3: Record<L, Round3> = { en: build("en"), pt: build("pt"), es: build("es") };
