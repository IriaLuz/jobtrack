import { Router } from "express";
import type { JobService } from "../../domain/jobs/jobService.js";
import { getAuthenticatedUserId } from "../requireAuth.js";
import { createJobSchema, jobIdParamsSchema, updateJobSchema } from "../schemas.js";

export function createJobRouter(jobService: JobService): Router {
  const router = Router();

  router.get("/", async (_request, response) => {
    response.json(await jobService.listJobs(getAuthenticatedUserId(response)));
  });

  router.post("/", async (request, response) => {
    const details = createJobSchema.parse(request.body);
    response.status(201).json(await jobService.createJob(getAuthenticatedUserId(response), details));
  });

  router.patch("/:jobId", async (request, response) => {
    const { jobId } = jobIdParamsSchema.parse(request.params);
    const changes = updateJobSchema.parse(request.body);
    response.json(await jobService.updateJob(getAuthenticatedUserId(response), jobId, changes));
  });

  router.delete("/:jobId", async (request, response) => {
    const { jobId } = jobIdParamsSchema.parse(request.params);
    await jobService.deleteJob(getAuthenticatedUserId(response), jobId);
    response.status(204).end();
  });

  return router;
}
