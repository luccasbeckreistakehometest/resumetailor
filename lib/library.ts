export type InterviewPrep = {
  talkingPoints: string[];
  technical: string[];
  behavioral: string[];
  questionsToAsk: string[];
};

export type StoredResult = {
  resume: string;
  coverLetter: string;
  linkedinAbout?: string;
  matchBefore: number;
  matchAfter: number;
  keywords: { term: string; before: boolean; after: boolean }[];
  emphasis?: string[];
  interviewPrep?: InterviewPrep;
  matchNotes: string;
};

export type LibraryItem = {
  id: string;
  title: string;
  mode: string;
  matchAfter: number;
  createdAt: number;
  result: StoredResult;
};

const KEY = "rt_library";
const PAID = "rt_paid";

function safeParse<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function getLibrary(): LibraryItem[] {
  if (typeof window === "undefined") return [];
  return safeParse<LibraryItem[]>(localStorage.getItem(KEY), []);
}

/** Derive a human title from the resume (usually the candidate's name on line 1). */
export function titleFromResult(r: StoredResult): string {
  const firstLine = (r.resume || "")
    .split("\n")
    .map((l) => l.replace(/^#+\s*/, "").trim())
    .find((l) => l.length > 0);
  return (firstLine || "Resume").slice(0, 60);
}

export function saveToLibrary(item: LibraryItem) {
  if (typeof window === "undefined") return;
  const list = getLibrary().filter((i) => i.id !== item.id);
  list.unshift(item);
  localStorage.setItem(KEY, JSON.stringify(list.slice(0, 50)));
}

export function removeFromLibrary(id: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(getLibrary().filter((i) => i.id !== id)));
}

export function renameInLibrary(id: string, title: string) {
  if (typeof window === "undefined") return;
  const list = getLibrary().map((i) => (i.id === id ? { ...i, title: title.slice(0, 80) } : i));
  localStorage.setItem(KEY, JSON.stringify(list));
}

/** Load an item back as the active result so /print and /success can render it. */
export function setActiveResult(item: LibraryItem) {
  if (typeof window === "undefined") return;
  localStorage.setItem("rt_result", JSON.stringify(item.result));
}

export function isPaid(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(PAID) === "1";
}

export function markPaid() {
  if (typeof window === "undefined") return;
  localStorage.setItem(PAID, "1");
}
