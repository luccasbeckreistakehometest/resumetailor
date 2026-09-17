import { cookies } from "./content/cookies";
import { privacy } from "./content/privacy";
import { refunds } from "./content/refunds";
import { terms } from "./content/terms";

export const LEGAL_DOCS = { privacy, terms, refunds, cookies } as const;
export type LegalDocKey = keyof typeof LEGAL_DOCS;
export const isLegalDoc = (v: string): v is LegalDocKey => Object.prototype.hasOwnProperty.call(LEGAL_DOCS, v);
