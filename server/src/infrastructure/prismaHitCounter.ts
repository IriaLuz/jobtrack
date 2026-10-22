import type { PrismaClient } from "../generated/prisma/client.js";
import type { HitCounter } from "../http/rateLimiter.js";

/**
 * Counts hits in PostgreSQL, so every serverless instance sees the same numbers.
 * One atomic statement either starts a new window at 1 or adds a hit to the current one,
 * so two simultaneous requests can never both read "9" and both get through as the 10th.
 */
export function createPrismaHitCounter(prisma: PrismaClient): HitCounter {
  return {
    async countHit(key, windowStartedAt) {
      const [counter] = await prisma.$queryRaw<{ hits: number }[]>`
        INSERT INTO "RateLimit" ("key", "windowStartedAt", "hits")
        VALUES (${key}, ${windowStartedAt}, 1)
        ON CONFLICT ("key") DO UPDATE SET
          "hits" = CASE
            WHEN "RateLimit"."windowStartedAt" = EXCLUDED."windowStartedAt" THEN "RateLimit"."hits" + 1
            ELSE 1
          END,
          "windowStartedAt" = EXCLUDED."windowStartedAt"
        RETURNING "hits"`;
      if (!counter) throw new Error("Rate limit counter was not returned");
      return counter.hits;
    },
  };
}
