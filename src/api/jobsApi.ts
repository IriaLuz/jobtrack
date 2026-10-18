import type { JobApplication, JobApplicationInput } from "../types/job";
import { apiRequest } from "./httpClient";

export const jobsApi = {
  list: () => apiRequest<JobApplication[]>("/jobs"),

  create: (input: JobApplicationInput) =>
    apiRequest<JobApplication>("/jobs", { method: "POST", body: input }),

  update: (jobId: string, changes: Partial<JobApplicationInput>) =>
    apiRequest<JobApplication>(`/jobs/${jobId}`, { method: "PATCH", body: changes }),

  remove: (jobId: string) => apiRequest<void>(`/jobs/${jobId}`, { method: "DELETE" }),
};
