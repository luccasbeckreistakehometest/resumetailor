import { describe, expect, it } from "vitest";
import { deliveryMetrics, targetWords } from "@/lib/speech/metrics";

describe("delivery metrics", () => {
  it("counts Portuguese fillers", () => {
    expect(deliveryMetrics("então, tipo… né", 3, "pt").fillers).toBe(3);
    expect(deliveryMetrics("então, tipo, eu fiz… né", 5, "pt").fillers).toBe(3);
    expect(deliveryMetrics("Eu tipo assim fiz o projeto", 5, "pt").fillers).toBe(1);
    expect(deliveryMetrics("então, tipo… né", 3, "pt").fillerWords.map((f) => f.word)).toEqual(["né", "tipo", "então"]);
  });
  it("measures pace in words per minute and bands it", () => {
    const text = Array.from({ length: 130 }, (_, i) => `palavra${i}`).join(" ");
    const m = deliveryMetrics(text, 60, "pt");
    expect(m.wpm).toBe(130);
    expect(m.pace).toBe("good");
    expect(deliveryMetrics(text, 30, "pt").pace).toBe("fast");
    expect(targetWords(90)).toBe(195);
  });
  it("gives zeros for an empty transcript, and spots repeated words and pauses", () => {
    expect(deliveryMetrics("", 0, "en")).toMatchObject({ words: 0, wpm: 0, fillers: 0, fillersPer100: 0, pace: null });
    const m = deliveryMetrics("I led the project, the project grew, and the project shipped. Um, like, basically done.", 12, "en", [0, 1500, 5200, 6000]);
    expect(m.repeated).toEqual([{ word: "project", count: 3 }]);
    expect(m.fillers).toBe(3);
    expect(m.longestPauseSec).toBe(3.7);
  });
});
