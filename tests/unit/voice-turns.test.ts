import { describe, expect, it } from "vitest";
import { DEFAULT_TURNS, initialTurns, stepTurns, type TurnEvent, type TurnState } from "@/lib/voice/turns";
import { createTranscript } from "@/lib/client/transcript";

const run = (events: TurnEvent[], s: TurnState = initialTurns()) => {
  const effects: string[] = [];
  for (const e of events) { const r = stepTurns(s, e); s = r.state; effects.push(...r.effects); }
  return { s, effects };
};

describe("voice turn-taking", () => {
  it("opens the mic when the AI voice ends, and only ends the turn after a pause following at least 3 words", () => {
    const { s, effects } = run([
      { type: "prompt", at: 0, tts: true }, { type: "audioEnded", at: 2000 },
      { type: "result", at: 2500, words: 2 }, { type: "tick", at: 6000 },          // 2 words + long silence: keep listening
      { type: "result", at: 6100, words: 5 }, { type: "tick", at: 7000 },          // too soon
    ]);
    expect(effects).toEqual(["startMic"]);
    expect(s.phase).toBe("listening");
    const end = stepTurns(s, { type: "tick", at: 6100 + DEFAULT_TURNS.silenceMs });
    expect(end.effects).toEqual(["endTurn"]);
    expect(end.state.phase).toBe("thinking");
  });

  it("without a voice, listening starts 700 ms after the prompt appears", () => {
    const { s, effects } = run([{ type: "prompt", at: 1000, tts: false }, { type: "tick", at: 1500 }, { type: "tick", at: 1750 }]);
    expect(effects).toEqual(["startMic"]);
    expect(s.phase).toBe("listening");
  });

  it("speaking over the AI voice pauses it; pause stops everything until resumed", () => {
    const barge = run([{ type: "prompt", at: 0, tts: true }, { type: "result", at: 300, words: 1 }]);
    expect(barge.effects).toEqual(["pauseAudio"]);
    expect(barge.s.phase).toBe("listening");
    const paused = run([{ type: "pause" }, { type: "tick", at: 99_999 }, { type: "audioEnded", at: 100_000 }], barge.s);
    expect(paused.s.phase).toBe("paused");
    expect(paused.effects).toEqual(["stopMic", "pauseAudio"]);
    expect(run([{ type: "resume", at: 1 }], paused.s).effects).toEqual(["startMic"]);
  });

  it("caps a turn at 90 seconds even without a pause", () => {
    const { effects } = run([{ type: "prompt", at: 0, tts: false }, { type: "tick", at: 700 }, { type: "result", at: 1000, words: 1 }, { type: "tick", at: 90_700 }]);
    expect(effects).toEqual(["startMic", "endTurn"]);
  });

  it("keeps the words said before each automatic restart", () => {
    const t = createTranscript();
    t.result("I increased retention", " by");
    t.restart();
    t.result("12% with Power BI", "");
    t.restart();
    t.result("", "dashboards");
    expect(t.text()).toBe("I increased retention by 12% with Power BI dashboards");
  });
});
