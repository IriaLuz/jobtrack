import { NotFoundError } from "../errors.js";
import type { JobApplicationChanges, JobApplicationDetails, JobRepository } from "./jobApplication.js";

export function createJobService(jobRepository: JobRepository) {
  async function getJob(userId: string, jobId: string) {
    const job = await jobRepository.findById(userId, jobId);
    if (!job) throw new NotFoundError("Job application");
    return job;
  }

  return {
    listJobs: (userId: string) => jobRepository.findAllByUser(userId),

    getJob,

    createJob: (userId: string, details: JobApplicationDetails) => jobRepository.create(userId, details),

    async updateJob(userId: string, jobId: string, changes: JobApplicationChanges) {
      const job = await jobRepository.update(userId, jobId, changes);
      if (!job) throw new NotFoundError("Job application");
      return job;
    },

    async deleteJob(userId: string, jobId: string) {
      const wasDeleted = await jobRepository.delete(userId, jobId);
      if (!wasDeleted) throw new NotFoundError("Job application");
    },
  };
}

export type JobService = ReturnType<typeof createJobService>;
