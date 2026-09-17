import { test as base, expect } from "@playwright/test";

/**
 * Every test browses from its own client address. Production sits behind Caddy, which sets
 * X-Forwarded-For; giving each test a distinct one keeps the per-IP limits realistic (the server
 * runs with its default limits) without one test's signups throttling the next.
 */
export const test = base.extend({
  extraHTTPHeaders: async ({}, provide, testInfo) => {
    const n = (testInfo.workerIndex * 7919 + testInfo.testId.split("").reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 0) + testInfo.retry) >>> 0;
    await provide({ "x-forwarded-for": `10.${(n >> 16) & 255}.${(n >> 8) & 255}.${n & 255}` });
  },
});
export { expect };
