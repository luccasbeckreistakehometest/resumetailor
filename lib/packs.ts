/** Credit packs. One credit unlocks one full kit; packs never expire. Shared by pricing and checkout. */
export interface Pack { key: string; credits: number; usd: number; brl: number }
export const PACKS: Pack[] = [
  { key: "1", credits: 1, usd: 9, brl: 39 },
  { key: "5", credits: 5, usd: 35, brl: 149 },
  { key: "15", credits: 15, usd: 75, brl: 349 },
];
export const packByKey = (key: string) => PACKS.find((p) => p.key === key) ?? PACKS[0];
