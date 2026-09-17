/**
 * What the person has said in one spoken turn. Chrome's recogniser stops by itself after a
 * pause and has to be restarted; every restart begins a fresh result list, so the words from the
 * earlier runs must be banked or they are lost (the old briefing flow lost them this way).
 */
export interface TranscriptAccumulator {
  /** A recogniser result event: all final text and the live partial of the CURRENT run. */
  result(finals: string, partial: string): void;
  /** The recogniser ended and is being restarted: bank what this run heard. */
  restart(): void;
  /** Replace everything (the e2e feed). */
  set(text: string): void;
  reset(): void;
  text(): string;
  partial(): string;
}

const join = (...parts: string[]) => parts.map((p) => p.trim()).filter(Boolean).join(" ");

export function createTranscript(): TranscriptAccumulator {
  let banked = "";
  let runFinals = "";
  let live = "";
  return {
    result(finals, partial) { runFinals = finals; live = partial; },
    // A partial that never became final before the pause is still something the person said.
    restart() { banked = join(banked, runFinals, live); runFinals = ""; live = ""; },
    set(text) { banked = text; runFinals = ""; live = ""; },
    reset() { banked = ""; runFinals = ""; live = ""; },
    text: () => join(banked, runFinals, live),
    partial: () => join(banked, runFinals, live),
  };
}
