import express, { type Express } from "express";
import type { AuthService } from "./domain/auth/authService.js";
import type { ExerciseService } from "./domain/exercises/exerciseService.js";
import type { JobService } from "./domain/jobs/jobService.js";
import { createErrorHandler, type ReportError } from "./http/errorHandler.js";
import { createRateLimiter, type HitCounter } from "./http/rateLimiter.js";
import { requireAuth, type VerifyToken } from "./http/requireAuth.js";
import { createAuthRouter } from "./http/routes/authRoutes.js";
import { createExerciseRouter } from "./http/routes/exerciseRoutes.js";
import { createJobRouter } from "./http/routes/jobRoutes.js";

export interface AppServices {
  authService: AuthService;
  jobService: JobService;
  exerciseService: ExerciseService;
  verifyToken: VerifyToken;
  hitCounter: HitCounter;
  reportError: ReportError;
}

const MINUTE = 60_000;

/** Builds the Express app from already-wired services, so tests can pass fakes or a test database. */
export function createApp(services: AppServices): Express {
  const app = express();
  app.disable("x-powered-by");
  app.use(express.json({ limit: "100kb" }));

  app.get("/api/health", (_request, response) => {
    response.json({ status: "ok" });
  });

  // Keyed by email, not IP: behind Vercel's proxy and rewrite the client IP is not reliable,
  // and guessing wrong would put every user in one shared bucket.
  const loginRateLimiter = createRateLimiter(services.hitCounter, {
    name: "login",
    maxHits: 10,
    windowMs: 15 * MINUTE,
    message: "Too many sign-in attempts.",
  });
  // Every request to these routes can call the paid AI. The overall spending cap is the
  // Anthropic workspace limit; this stops one account from using it all.
  const aiRateLimiter = createRateLimiter(services.hitCounter, {
    name: "ai",
    maxHits: 30,
    windowMs: 60 * MINUTE,
    message: "You've reached the practice limit for now.",
  });

  app.use("/api/auth", createAuthRouter(services.authService, loginRateLimiter));

  // Every route registered below this line requires a signed-in user.
  app.use("/api", requireAuth(services.verifyToken));
  app.use("/api/jobs", createJobRouter(services.jobService));
  app.use("/api", createExerciseRouter(services.exerciseService, aiRateLimiter));

  app.use((_request, response) => {
    response.status(404).json({ error: { message: "Route not found" } });
  });
  app.use(createErrorHandler(services.reportError));

  return app;
}
