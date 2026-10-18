/** Thrown when a caller has used up their allowance; the error handler turns it into a 429. */
export class TooManyRequestsError extends Error {
  readonly retryAfterSeconds: number;

  constructor(message: string, retryAfterSeconds: number) {
    super(message);
    this.name = "TooManyRequestsError";
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

/** Storage port: shared by every server instance, which is why it cannot live in memory on serverless. */
export interface HitCounter {
  /** Records one hit for `key` in the window that started at `windowStartedAt` and returns the hits so far. */
  countHit(key: string, windowStartedAt: Date): Promise<number>;
}

interface RateLimitRule {
  /** Keeps different limits apart, e.g. "login" and "ai" never share a counter. */
  name: string;
  maxHits: number;
  windowMs: number;
  message: string;
}

/**
 * Fixed-window rate limiting: at most `maxHits` per key in each window. The simplest algorithm;
 * its known trade-off is that a burst across a window boundary can briefly allow up to 2x.
 */
export function createRateLimiter(hitCounter: HitCounter, rule: RateLimitRule) {
  return {
    async check(key: string) {
      const now = Date.now();
      const windowStartedAt = Math.floor(now / rule.windowMs) * rule.windowMs;
      const hits = await hitCounter.countHit(`${rule.name}:${key}`, new Date(windowStartedAt));

      if (hits > rule.maxHits) {
        const retryAfterSeconds = Math.ceil((windowStartedAt + rule.windowMs - now) / 1000);
        const minutes = Math.ceil(retryAfterSeconds / 60);
        throw new TooManyRequestsError(
          `${rule.message} Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
          retryAfterSeconds,
        );
      }
    },
  };
}

export type RateLimiter = ReturnType<typeof createRateLimiter>;
