import type { JobRepository } from "../domain/jobs/jobApplication.js";
import type { PrismaClient } from "../generated/prisma/client.js";

// Ownership is part of every `where`, so checking the owner and changing the row is one atomic query.
export function createPrismaJobRepository(prisma: PrismaClient): JobRepository {
  return {
    findAllByUser: (userId) =>
      prisma.jobApplication.findMany({ where: { userId }, orderBy: { updatedAt: "desc" } }),

    findById: (userId, jobId) => prisma.jobApplication.findFirst({ where: { id: jobId, userId } }),

    create: (userId, details) => prisma.jobApplication.create({ data: { ...details, userId } }),

    async update(userId, jobId, changes) {
      const [updatedJob] = await prisma.jobApplication.updateManyAndReturn({
        where: { id: jobId, userId },
        data: changes,
      });
      return updatedJob ?? null;
    },

    async delete(userId, jobId) {
      const { count } = await prisma.jobApplication.deleteMany({ where: { id: jobId, userId } });
      return count > 0;
    },
  };
}
