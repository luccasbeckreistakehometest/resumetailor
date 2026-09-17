/** A legal document as data: rendered by app/legal/LegalView.tsx in the visitor's language. */
export type Block = string | { list: string[] };
export interface LegalSection { h: string; body: Block[] }
export interface LegalDoc { title: string; summary: string; sections: LegalSection[] }
export type LegalLang = "en" | "pt" | "es";
export const LEGAL_UPDATED = "2026-09-17";
