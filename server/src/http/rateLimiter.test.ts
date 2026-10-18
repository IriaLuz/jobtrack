import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRateLimiter, TooManyRequestsError, type HitCounter } from "./rateLimiter.js";

/** Same behaviour as the PostgreSQL counter: one entry per key, restarted when a new window begins. */
function createInMemoryHitCounter(): HitCounter {
  const counters = new Map<string, { windowStartedAt: number; hits: number }>();
  return {
    countHit(key, windowStartedAt) {
      const current = counters.get(key);
      const hits = current?.windowStartedAt === windowStartedAt.getTime() ? current.hits + 1 : 1;
      counters.set(key, { windowStartedAt: windowStartedAt.getTime(), hits });
      return Promise.resolve(hits);
    },
  };
}

const MINUTE = 60_000;
const rule = { name: "login", maxHits: 3, windowMs: 15 * MINUTE, message: "Too many sign-in attempts." };

describe("rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-18T10:00:00Z")); // the start of a 15-minute window
  });
  afterEach(() => vi.useRealTimers());

  it("allows up to the limit, then refuses with how long to wait", async () => {
    const limiter = createRateLimiter(createInMemoryHitCounter(), rule);
    for (let attempt = 1; attempt <= 3; attempt++) await limiter.check("ada@example.com");

    vi.setSystemTime(new Date("2026-10-18T10:05:00Z"));
    const refusal = limiter.check("ada@example.com");

    await expect(refusal).rejects.toThrow(
      new TooManyRequestsError("Too many sign-in attempts. Try again in 10 minutes.", 600),
    );
    await expect(refusal).rejects.toMatchObject({ retryAfterSeconds: 600 });
  });

  it("counts each key separately", async () => {
    const limiter = createRateLimiter(createInMemoryHitCounter(), rule);
    for (let attempt = 1; attempt <= 3; attempt++) await limiter.check("ada@example.com");

    await expect(limiter.check("grace@example.com")).resolves.toBeUndefined();
  });

  it("starts again in the next window", async () => {
    const limiter = createRateLimiter(createInMemoryHitCounter(), rule);
    for (let attempt = 1; attempt <= 3; attempt++) await limiter.check("ada@example.com");

    vi.setSystemTime(new Date("2026-10-18T10:15:00Z"));

    await expect(limiter.check("ada@example.com")).resolves.toBeUndefined();
  });

  it("keeps different limits apart even for the same key", async () => {
    const hitCounter = createInMemoryHitCounter();
    const loginLimiter = createRateLimiter(hitCounter, rule);
    const aiLimiter = createRateLimiter(hitCounter, { ...rule, name: "ai" });
    for (let attempt = 1; attempt <= 3; attempt++) await loginLimiter.check("user-1");

    await expect(aiLimiter.check("user-1")).resolves.toBeUndefined();
  });
});
