import { describe, expect, it } from "vitest";
import { radar, radarFor, type RadarApp } from "@/lib/applications/radar";
import { buildIcs, foldLine } from "@/lib/applications/ics";

const NOW = Date.parse("2026-09-17T12:00:00Z");
const base: RadarApp = { id: "a", stage: "applied", appliedAt: null, interviewAt: null, interviewAtTime: null, rejectedAt: null, lastContactAt: null, followUps: 0, createdAt: "2026-09-01T00:00:00Z" };
const days = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

describe("follow-up radar", () => {
  it("applied 8 days ago → follow-up; 5 days → nothing; after 3 follow-ups → move on", () => {
    expect(radarFor({ ...base, appliedAt: days(8).slice(0, 10) }, NOW)).toMatchObject({ kind: "followup", days: 8 });
    expect(radarFor({ ...base, appliedAt: days(5).slice(0, 10) }, NOW)).toBeNull();
    expect(radarFor({ ...base, appliedAt: days(30).slice(0, 10), lastContactAt: days(8), followUps: 3 }, NOW)).toMatchObject({ kind: "moveon" });
    expect(radarFor({ ...base, appliedAt: days(30).slice(0, 10), lastContactAt: days(2), followUps: 1 }, NOW)).toBeNull();
  });
  it("interview yesterday → thanks (until contacted); tomorrow → prep", () => {
    expect(radarFor({ ...base, stage: "interview", interviewAtTime: days(1) }, NOW)).toMatchObject({ kind: "thanks", days: 1 });
    expect(radarFor({ ...base, stage: "interview", interviewAtTime: days(1), lastContactAt: days(0.5) }, NOW)).toBeNull();
    expect(radarFor({ ...base, stage: "interview", interviewAtTime: new Date(NOW + 20 * 3600_000).toISOString() }, NOW)).toMatchObject({ kind: "prep" });
    expect(radarFor({ ...base, stage: "interview", interviewAtTime: new Date(NOW + 5 * 86_400_000).toISOString() }, NOW)).toBeNull();
  });
  it("offer → compare; rejected → ask for feedback once", () => {
    expect(radarFor({ ...base, stage: "offer" }, NOW)?.kind).toBe("offer");
    expect(radarFor({ ...base, stage: "rejected", rejectedAt: "2026-09-10" }, NOW)?.kind).toBe("feedback");
    expect(radarFor({ ...base, stage: "rejected", rejectedAt: "2026-09-10", lastContactAt: days(1) }, NOW)).toBeNull();
    expect(radarFor({ ...base, stage: "saved" }, NOW)).toBeNull();
    expect(radar([{ ...base, stage: "offer" }, { ...base, id: "b", stage: "interview", interviewAtTime: days(1) }], NOW).map((r) => r.kind)).toEqual(["thanks", "offer"]);
  });
});

describe("calendar file", () => {
  it("uses CRLF, folds long lines, escapes text, has one event with two alarms", () => {
    const ics = buildIcs({ uid: "app_1-interview@resumetailor", summary: "Entrevista: Acme, Inc; vaga de Analista", description: `Folha do dia: https://x.test/brief/app_1\n${"é".repeat(60)}`, start: new Date("2026-09-20T13:30:00Z"), now: new Date(NOW) });
    expect(ics.split("\r\n").every((l) => Buffer.byteLength(l, "utf8") <= 75)).toBe(true);
    expect(ics).not.toMatch(/[^\r]\n/);
    expect(ics).toContain("DTSTART:20260920T133000Z");
    expect(ics).toContain("SUMMARY:Entrevista: Acme\\, Inc\; vaga de Analista");
    expect(ics.match(/BEGIN:VEVENT/g)).toHaveLength(1);
    expect(ics.match(/BEGIN:VALARM/g)).toHaveLength(2);
    expect(ics).toContain("TRIGGER:-P1D");
    expect(ics).toContain("TRIGGER:-PT1H");
    expect(buildIcs({ uid: "u", summary: "s", description: "d", start: "2026-09-24" })).toContain("DTSTART;VALUE=DATE:20260924");
    expect(foldLine("a".repeat(80))).toBe(`${"a".repeat(75)}\r\n ${"a".repeat(5)}`);
  });
});
