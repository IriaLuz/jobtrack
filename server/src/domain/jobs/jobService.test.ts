import { beforeEach, describe, expect, it } from "vitest";
import { NotFoundError } from "../errors.js";
import type { JobApplication, JobApplicationDetails, JobRepository } from "./jobApplication.js";
import { createJobService, type JobService } from "./jobService.js";

function createInMemoryJobRepository(): JobRepository {
  const jobs: JobApplication[] = [];
  const findOwned = (userId: string, jobId: string) =>
    jobs.find((job) => job.id === jobId && job.userId === userId) ?? null;

  return {
    findAllByUser: (userId) => Promise.resolve(jobs.filter((job) => job.userId === userId)),
    findById: (userId, jobId) => Promise.resolve(findOwned(userId, jobId)),
    create(userId, details) {
      const now = new Date();
      const job: JobApplication = {
        id: crypto.randomUUID(),
        userId,
        ...details,
        salary: details.salary ?? null,
        location: details.location ?? null,
        notes: details.notes ?? null,
        createdAt: now,
        updatedAt: now,
      };
      jobs.push(job);
      return Promise.resolve(job);
    },
    update(userId, jobId, changes) {
      const job = findOwned(userId, jobId);
      if (job) Object.assign(job, changes, { updatedAt: new Date() });
      return Promise.resolve(job);
    },
    delete(userId, jobId) {
      const job = findOwned(userId, jobId);
      if (job) jobs.splice(jobs.indexOf(job), 1);
      return Promise.resolve(job !== null);
    },
  };
}

const ALICE = "alice-id";
const BOB = "bob-id";
const details: JobApplicationDetails = {
  company: "Acme",
  role: "Frontend Engineer",
  status: "saved",
  link: "https://acme.example/jobs/1",
};

describe("jobService", () => {
  let jobService: JobService;

  beforeEach(() => {
    jobService = createJobService(createInMemoryJobRepository());
  });

  it("lists only the applications that belong to the user", async () => {
    await jobService.createJob(ALICE, details);
    await jobService.createJob(BOB, { ...details, company: "Globex" });

    const alicesJobs = await jobService.listJobs(ALICE);

    expect(alicesJobs).toHaveLength(1);
    expect(alicesJobs[0]).toMatchObject({ company: "Acme", userId: ALICE });
  });

  it("updates the user's own application", async () => {
    const job = await jobService.createJob(ALICE, details);

    const updated = await jobService.updateJob(ALICE, job.id, { status: "interviewing" });

    expect(updated.status).toBe("interviewing");
  });

  it("treats another user's application as not found when updating, and leaves it unchanged", async () => {
    const job = await jobService.createJob(ALICE, details);

    await expect(jobService.updateJob(BOB, job.id, { status: "rejected" })).rejects.toThrow(NotFoundError);
    expect((await jobService.getJob(ALICE, job.id)).status).toBe("saved");
  });

  it("deletes the user's own application", async () => {
    const job = await jobService.createJob(ALICE, details);

    await jobService.deleteJob(ALICE, job.id);

    await expect(jobService.getJob(ALICE, job.id)).rejects.toThrow(NotFoundError);
  });

  it("refuses to delete another user's application", async () => {
    const job = await jobService.createJob(ALICE, details);

    await expect(jobService.deleteJob(BOB, job.id)).rejects.toThrow(NotFoundError);
    await expect(jobService.getJob(ALICE, job.id)).resolves.toMatchObject({ id: job.id });
  });
});
