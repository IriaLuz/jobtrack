import request from "supertest";
import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { createTestApp, prisma, resetDatabase, signUp, validJob } from "./testApp.js";

const app = createTestApp();

beforeEach(resetDatabase);
afterAll(() => prisma.$disconnect());

async function createJob(authorization: string, job: object = validJob) {
  const response = await request(app).post("/api/jobs").set("Authorization", authorization).send(job).expect(201);
  return response.body as { id: string };
}

describe("job applications", () => {
  it("creates an application with defaults and lists it", async () => {
    const { authorization } = await signUp(app);

    const created = await createJob(authorization);
    const list = await request(app).get("/api/jobs").set("Authorization", authorization).expect(200);

    expect(created).toMatchObject({ ...validJob, status: "saved", salary: null, location: null, notes: null });
    expect(list.body).toEqual([created]);
  });

  it("lists the most recently updated application first", async () => {
    const { authorization } = await signUp(app);
    const older = await createJob(authorization, { ...validJob, company: "Older" });
    await createJob(authorization, { ...validJob, company: "Newer" });

    await request(app).patch(`/api/jobs/${older.id}`).set("Authorization", authorization).send({ status: "applied" });
    const list = await request(app).get("/api/jobs").set("Authorization", authorization).expect(200);

    const companies = (list.body as { company: string }[]).map((job) => job.company);
    expect(companies).toEqual(["Older", "Newer"]);
  });

  it("updates only the fields that are sent", async () => {
    const { authorization } = await signUp(app);
    const job = await createJob(authorization, { ...validJob, notes: "Referral from Sam" });

    const response = await request(app)
      .patch(`/api/jobs/${job.id}`)
      .set("Authorization", authorization)
      .send({ status: "interviewing" })
      .expect(200);

    expect(response.body).toMatchObject({ status: "interviewing", notes: "Referral from Sam", company: "Acme" });
  });

  it("clears an optional field when it is sent empty", async () => {
    const { authorization } = await signUp(app);
    const job = await createJob(authorization, { ...validJob, salary: "£50k" });

    const response = await request(app)
      .patch(`/api/jobs/${job.id}`)
      .set("Authorization", authorization)
      .send({ salary: "" })
      .expect(200);

    expect(response.body.salary).toBeNull();
  });

  it("deletes an application", async () => {
    const { authorization } = await signUp(app);
    const job = await createJob(authorization);

    await request(app).delete(`/api/jobs/${job.id}`).set("Authorization", authorization).expect(204);
    await request(app).delete(`/api/jobs/${job.id}`).set("Authorization", authorization).expect(404);
  });

  it("rejects links that are not http(s)", async () => {
    const { authorization } = await signUp(app);

    const response = await request(app)
      .post("/api/jobs")
      .set("Authorization", authorization)
      .send({ ...validJob, link: "javascript:alert(1)" })
      .expect(400);

    expect(response.body.error.message).toBe("Link must be a valid http(s) URL");
  });

  it("ignores attempts to choose the owner", async () => {
    const alice = await signUp(app);
    const bob = await signUp(app);
    const bobsUser = await prisma.user.findUniqueOrThrow({ where: { email: bob.email } });

    await createJob(alice.authorization, { ...validJob, userId: bobsUser.id });
    const bobsJobs = await request(app).get("/api/jobs").set("Authorization", bob.authorization);

    expect(bobsJobs.body).toEqual([]);
  });

  it("rejects ids that are not UUIDs", async () => {
    const { authorization } = await signUp(app);

    await request(app).patch("/api/jobs/123").set("Authorization", authorization).send({}).expect(400);
  });
});

describe("privacy between users", () => {
  it("never shows, changes or deletes another user's application", async () => {
    const alice = await signUp(app);
    const bob = await signUp(app);
    const alicesJob = await createJob(alice.authorization);

    const bobsList = await request(app).get("/api/jobs").set("Authorization", bob.authorization).expect(200);
    await request(app)
      .patch(`/api/jobs/${alicesJob.id}`)
      .set("Authorization", bob.authorization)
      .send({ status: "rejected" })
      .expect(404);
    await request(app).delete(`/api/jobs/${alicesJob.id}`).set("Authorization", bob.authorization).expect(404);

    expect(bobsList.body).toEqual([]);
    const alicesList = await request(app).get("/api/jobs").set("Authorization", alice.authorization);
    expect(alicesList.body).toMatchObject([{ id: alicesJob.id, status: "saved" }]);
  });
});
