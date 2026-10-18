import { Router } from "express";
import type { ExerciseService } from "../../domain/exercises/exerciseService.js";
import type { RateLimiter } from "../rateLimiter.js";
import { getAuthenticatedUserId } from "../requireAuth.js";
import { answerSchema, exerciseIdParamsSchema, jobIdParamsSchema } from "../schemas.js";

export function createExerciseRouter(exerciseService: ExerciseService, aiRateLimiter: RateLimiter): Router {
  const router = Router();

  router.get("/jobs/:jobId/exercises", async (request, response) => {
    const { jobId } = jobIdParamsSchema.parse(request.params);
    response.json(await exerciseService.listExercises(getAuthenticatedUserId(response), jobId));
  });

  router.post("/jobs/:jobId/exercises", async (request, response) => {
    const { jobId } = jobIdParamsSchema.parse(request.params);
    const userId = getAuthenticatedUserId(response);
    await aiRateLimiter.check(userId);
    response.status(201).json(await exerciseService.generateExercise(userId, jobId));
  });

  router.post("/exercises/:exerciseId/answer", async (request, response) => {
    const { exerciseId } = exerciseIdParamsSchema.parse(request.params);
    const { answer } = answerSchema.parse(request.body);
    const userId = getAuthenticatedUserId(response);
    await aiRateLimiter.check(userId);
    response.json(await exerciseService.submitAnswer(userId, exerciseId, answer));
  });

  return router;
}
