import * as Sentry from "@sentry/node";
import type { Express } from "express";
import { createApp, type AppServices } from "./app.js";
import { loadConfig, type Config } from "./config.js";
import { createAuthService } from "./domain/auth/authService.js";
import type { PasswordHasher } from "./domain/auth/user.js";
import type { ExerciseAi } from "./domain/exercises/exercise.js";
import { createExerciseService, type Logger } from "./domain/exercises/exerciseService.js";
import { createJobService } from "./domain/jobs/jobService.js";
import type { PrismaClient } from "./generated/prisma/client.js";
import type { ReportError } from "./http/errorHandler.js";
import { createBcryptPasswordHasher } from "./infrastructure/bcryptPasswordHasher.js";
import { createGroqExerciseAi } from "./infrastructure/groqExerciseAi.js";
import { createJwtTokens } from "./infrastructure/jwtTokens.js";
import { createPrismaClient } from "./infrastructure/prismaClient.js";
import { createPrismaExerciseRepository } from "./infrastructure/prismaExerciseRepository.js";
import { createPrismaHitCounter } from "./infrastructure/prismaHitCounter.js";
import { createPrismaJobRepository } from "./infrastructure/prismaJobRepository.js";
import { createPrismaUserRepository } from "./infrastructure/prismaUserRepository.js";

// The composition root is the only module that knows every concrete implementation.
// Everything else depends on interfaces, which is what makes the domain testable on its own.

export interface Adapters {
  prisma: PrismaClient;
  jwtSecret: string;
  passwordHasher: PasswordHasher;
  exerciseAi: ExerciseAi | null;
  logger: Logger;
  reportError: ReportError;
}

/** Connects the domain services to the given adapters. Integration tests call this with test doubles. */
export function wireServices(adapters: Adapters): AppServices {
  const tokens = createJwtTokens(adapters.jwtSecret);
  const jobService = createJobService(createPrismaJobRepository(adapters.prisma));

  return {
    authService: createAuthService({
      userRepository: createPrismaUserRepository(adapters.prisma),
      passwordHasher: adapters.passwordHasher,
      tokenIssuer: tokens,
    }),
    jobService,
    exerciseService: createExerciseService({
      jobService,
      exerciseRepository: createPrismaExerciseRepository(adapters.prisma),
      exerciseAi: adapters.exerciseAi,
      logger: adapters.logger,
    }),
    verifyToken: tokens.verifyToken,
    hitCounter: createPrismaHitCounter(adapters.prisma),
    reportError: adapters.reportError,
  };
}

/** Builds the production app from environment variables. Used by the local server and by Vercel. */
export function buildApp(config: Config = loadConfig()): Express {
  if (config.SENTRY_DSN) {
    Sentry.init({ dsn: config.SENTRY_DSN, environment: config.NODE_ENV });
  }

  const services = wireServices({
    prisma: createPrismaClient(config.DATABASE_URL),
    jwtSecret: config.JWT_SECRET,
    passwordHasher: createBcryptPasswordHasher(),
    // Without a key there is no AI: every request takes the fallback path (the question bank).
    exerciseAi: config.GROQ_API_KEY
      ? createGroqExerciseAi({ apiKey: config.GROQ_API_KEY, model: config.GROQ_MODEL })
      : null,
    logger: {
      warn(message, details) {
        console.warn(message, details);
        // Degradations are expected, but if they spike we want to see it.
        Sentry.captureMessage(message, { level: "warning", extra: details });
      },
    },
    reportError(error) {
      console.error(error);
      Sentry.captureException(error);
    },
  });

  return createApp(services);
}
