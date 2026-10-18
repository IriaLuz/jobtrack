import type { Exercise } from "../types/exercise";
import { apiRequest } from "./httpClient";

export const exercisesApi = {
  list: (jobId: string) => apiRequest<Exercise[]>(`/jobs/${jobId}/exercises`),

  generate: (jobId: string) =>
    apiRequest<Exercise>(`/jobs/${jobId}/exercises`, { method: "POST" }),

  submitAnswer: (exerciseId: string, answer: string) =>
    apiRequest<Exercise>(`/exercises/${exerciseId}/answer`, { method: "POST", body: { answer } }),
};
