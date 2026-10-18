import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, PASSWORD, prisma, resetDatabase, signUp } from "./testApp.js";

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

describe("POST /api/auth/register", () => {
  it("creates an account and returns a session without the password hash", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "Ada@Example.com", password: PASSWORD })
      .expect(201);

    expect(response.body).toEqual({
      token: expect.any(String),
      user: { id: expect.any(String), email: "ada@example.com" },
    });
  });

  it("stores a bcrypt hash, never the password itself", async () => {
    await signUp(app, "ada@example.com");

    const user = await prisma.user.findUniqueOrThrow({ where: { email: "ada@example.com" } });

    expect(user.passwordHash).not.toContain(PASSWORD);
    expect(user.passwordHash).toMatch(/^\$2[aby]\$/);
  });

  it("rejects an email that is already registered, whatever its casing", async () => {
    await signUp(app, "ada@example.com");

    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "ADA@example.com", password: PASSWORD })
      .expect(409);

    expect(response.body.error.message).toBe("An account with this email already exists");
  });

  it("explains which field is invalid", async () => {
    const response = await request(app)
      .post("/api/auth/register")
      .send({ email: "not-an-email", password: "short" })
      .expect(400);

    expect(response.body.error.fieldErrors).toEqual({
      email: ["Enter a valid email address"],
      password: ["Password must be at least 8 characters"],
    });
  });
});

describe("POST /api/auth/login", () => {
  it("signs in with the right password", async () => {
    await signUp(app, "ada@example.com");

    const response = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: PASSWORD })
      .expect(200);

    expect(response.body.user.email).toBe("ada@example.com");
  });

  it("rejects a wrong password without saying whether the email exists", async () => {
    await signUp(app, "ada@example.com");

    const wrongPassword = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "wrong-password" })
      .expect(401);
    const unknownEmail = await request(app)
      .post("/api/auth/login")
      .send({ email: "nobody@example.com", password: PASSWORD })
      .expect(401);

    expect(wrongPassword.body).toEqual(unknownEmail.body);
  });
});

describe("sign-in rate limit", () => {
  it("blocks an email after 10 attempts in 15 minutes, even with the right password", async () => {
    await signUp(app, "ada@example.com");
    for (let attempt = 1; attempt <= 10; attempt++) {
      await request(app).post("/api/auth/login").send({ email: "ada@example.com", password: "wrong-password" }).expect(401);
    }

    const blocked = await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: PASSWORD })
      .expect(429);

    expect(Number(blocked.headers["retry-after"])).toBeGreaterThan(0);
    expect(blocked.body.error.message).toMatch(/^Too many sign-in attempts\. Try again in \d+ minutes?\.$/);
  });
});

describe("protected routes", () => {
  it("require a token", async () => {
    await request(app).get("/api/jobs").expect(401);
  });

  it("reject an invalid token", async () => {
    await request(app).get("/api/jobs").set("Authorization", "Bearer not-a-real-token").expect(401);
  });

  it("accept the token returned at sign-up", async () => {
    const { authorization } = await signUp(app);

    await request(app).get("/api/jobs").set("Authorization", authorization).expect(200);
  });
});

describe("error handling", () => {
  it("answers malformed JSON with 400", async () => {
    await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send("{not json")
      .expect(400);
  });

  it("refuses bodies over 100kb with 413", async () => {
    await request(app)
      .post("/api/auth/login")
      .send({ email: "ada@example.com", password: "x".repeat(200_000) })
      .expect(413);
  });

  it("answers unknown routes with 404 in the standard error shape", async () => {
    const { authorization } = await signUp(app);

    const response = await request(app).get("/api/nothing-here").set("Authorization", authorization).expect(404);

    expect(response.body).toEqual({ error: { message: "Route not found" } });
  });
});
