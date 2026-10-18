import { randomUUID } from "node:crypto";
import type { Express } from "express";
import request from "supertest";
import { createApp } from "../../src/app.js";
import { wireServices } from "../../src/compositionRoot.js";
import type { ExerciseAi } from "../../src/domain/exercises/exercise.js";
import { createBcryptPasswordHasher } from "../../src/infrastructure/bcryptPasswordHasher.js";
import { createPrismaClient } from "../../src/infrastructure/prismaClient.js";

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is not set. See server/.env.test.");

export const prisma = createPrismaClient(databaseUrl);

export const PASSWORD = "correct-horse-battery";

/** The real app and real database, with an optional fake AI so tests never call a paid API. */
export function createTestApp({ exerciseAi = null }: { exerciseAi?: ExerciseAi | null } = {}): Express {
  return createApp(
    wireServices({
      prisma,
      jwtSecret: "integration-tests-only-secret-0123456789abcdef",
      // The lowest cost factor keeps tests fast; hash strength is not what these tests check.
      passwordHasher: createBcryptPasswordHasher(4),
      exerciseAi,
      logger: { warn: () => {} },
      reportError: (error) => console.error(error),
    }),
  );
}

/** Deleting users cascades to their job applications and exercises. */
export async function resetDatabase() {
  await prisma.user.deleteMany();
  await prisma.rateLimit.deleteMany();
}

/** Registers a new user and returns the Authorization header value to act as them. */
export async function signUp(app: Express, email = `user-${randomUUID()}@example.com`) {
  const response = await request(app).post("/api/auth/register").send({ email, password: PASSWORD }).expect(201);
  return { email, authorization: `Bearer ${response.body.token as string}` };
}

export const validJob = {
  company: "Acme",
  role: "Frontend Engineer",
  link: "https://acme.example/jobs/1",
};
