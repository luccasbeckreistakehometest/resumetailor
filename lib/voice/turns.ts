/**
 * Turn-taking for the spoken briefing, as a pure state machine (time is passed in, so it is
 * unit-tested with fake clocks). The AI voice speaks → the microphone opens by itself → a pause
 * of `silenceMs` after at least `minWords` ends the turn → the server thinks → repeat. Speaking
 * over the AI voice pauses it. The person can pause the whole conversation at any time.
 */
export type TurnPhase = "idle" | "speaking" | "waiting" | "listening" | "thinking" | "paused";
export type TurnEffect = "startMic" | "stopMic" | "pauseAudio" | "endTurn";
export interface TurnState { phase: TurnPhase; words: number; lastResultAt: number | null; turnStartedAt: number | null; openAt: number | null }
export interface TurnConfig { silenceMs: number; minWords: number; maxTurnMs: number; noTtsDelayMs: number }
export type TurnEvent =
  | { type: "prompt"; at: number; tts: boolean }          // a question is on screen (and, with tts, being spoken)
  | { type: "audioEnded"; at: number }
  | { type: "result"; at: number; words: number }         // the recogniser heard something (total words this turn)
  | { type: "tick"; at: number }
  | { type: "sent" }                                       // the turn went to the server
  | { type: "pause" }
  | { type: "resume"; at: number }
  | { type: "stop" };                                      // "I'm done" pressed

export const DEFAULT_TURNS: TurnConfig = { silenceMs: 1800, minWords: 3, maxTurnMs: 90_000, noTtsDelayMs: 700 };
export const initialTurns = (): TurnState => ({ phase: "idle", words: 0, lastResultAt: null, turnStartedAt: null, openAt: null });

const listen = (s: TurnState, at: number): TurnState => ({ ...s, phase: "listening", words: 0, lastResultAt: null, turnStartedAt: at, openAt: null });

export function stepTurns(s: TurnState, e: TurnEvent, cfg: TurnConfig = DEFAULT_TURNS): { state: TurnState; effects: TurnEffect[] } {
  if (s.phase === "paused" && e.type !== "resume") return { state: s, effects: [] };
  switch (e.type) {
    case "prompt":
      return e.tts ? { state: { ...s, phase: "speaking", openAt: null }, effects: [] } : { state: { ...s, phase: "waiting", openAt: e.at + cfg.noTtsDelayMs }, effects: [] };
    case "audioEnded":
      return s.phase === "speaking" ? { state: listen(s, e.at), effects: ["startMic"] } : { state: s, effects: [] };
    case "result": {
      const bargeIn = s.phase === "speaking";
      const base = bargeIn ? listen(s, e.at) : s;
      if (base.phase !== "listening") return { state: s, effects: [] };
      return { state: { ...base, words: e.words, lastResultAt: e.at }, effects: bargeIn ? ["pauseAudio"] : [] };
    }
    case "tick": {
      if (s.phase === "waiting" && s.openAt !== null && e.at >= s.openAt) return { state: listen(s, e.at), effects: ["startMic"] };
      if (s.phase !== "listening" || s.turnStartedAt === null) return { state: s, effects: [] };
      const silent = s.lastResultAt !== null && s.words >= cfg.minWords && e.at - s.lastResultAt >= cfg.silenceMs;
      const tooLong = e.at - s.turnStartedAt >= cfg.maxTurnMs;
      return silent || tooLong ? { state: { ...s, phase: "thinking" }, effects: ["endTurn"] } : { state: s, effects: [] };
    }
    case "stop":
      return s.phase === "listening" ? { state: { ...s, phase: "thinking" }, effects: ["endTurn"] } : { state: s, effects: [] };
    case "sent":
      return { state: { ...s, phase: "thinking" }, effects: [] };
    case "pause":
      return { state: { ...s, phase: "paused" }, effects: s.phase === "listening" ? ["stopMic", "pauseAudio"] : ["pauseAudio"] };
    case "resume":
      return s.phase === "paused" ? { state: listen(s, e.at), effects: ["startMic"] } : { state: s, effects: [] };
  }
}

export const countWords = (text: string) => (text.trim() ? text.trim().split(/\s+/).length : 0);
