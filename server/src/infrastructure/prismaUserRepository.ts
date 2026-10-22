import type { UserRepository } from "../domain/auth/user.js";
import { ConflictError } from "../domain/errors.js";
import { Prisma, type PrismaClient } from "../generated/prisma/client.js";

const UNIQUE_CONSTRAINT_VIOLATION = "P2002";

export function createPrismaUserRepository(prisma: PrismaClient): UserRepository {
  return {
    findByEmail: (email) => prisma.user.findUnique({ where: { email } }),

    async create(user) {
      try {
        return await prisma.user.create({ data: user });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === UNIQUE_CONSTRAINT_VIOLATION) {
          throw new ConflictError("An account with this email already exists");
        }
        throw error;
      }
    },
  };
}
