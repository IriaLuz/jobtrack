import type { AnsweredAttempt, Exercise, ExerciseRepository } from "../domain/exercises/exercise.js";
import type { Exercise as ExerciseRow, PrismaClient } from "../generated/prisma/client.js";

export function createPrismaExerciseRepository(prisma: PrismaClient): ExerciseRepository {
  return {
    async findAllByJob(jobApplicationId) {
      const rows = await prisma.exercise.findMany({ where: { jobApplicationId }, orderBy: { createdAt: "desc" } });
      return rows.map(toExercise);
    },

    async findByIdForUser(userId, exerciseId) {
      const row = await prisma.exercise.findFirst({ where: { id: exerciseId, jobApplication: { userId } } });
      return row ? toExercise(row) : null;
    },

    async create(exercise) {
      return toExercise(await prisma.exercise.create({ data: exercise }));
    },

    async saveAttempt(exerciseId, attempt) {
      const [row] = await prisma.exercise.updateManyAndReturn({
        where: { id: exerciseId },
        data: toAttemptColumns(attempt),
      });
      return row ? toExercise(row) : null;
    },
  };
}

/** Flattens the attempt union into table columns, clearing whatever the previous attempt left behind. */
function toAttemptColumns(attempt: AnsweredAttempt) {
  return {
    status: attempt.status,
    answer: attempt.answer,
    score: attempt.status === "graded" ? attempt.score : null,
    feedback: attempt.status === "grading_unavailable" ? null : attempt.feedback,
  };
}

/**
 * Turns a flat row back into the Exercise union. A row whose columns do not match its status is
 * corrupt data: we fail loudly instead of sending an impossible state to the client.
 */
function toExercise(row: ExerciseRow): Exercise {
  const exercise = {
    id: row.id,
    jobApplicationId: row.jobApplicationId,
    question: row.question,
    questionSource: row.questionSource,
    createdAt: row.createdAt,
  };
  const { answer, score, feedback } = row;

  switch (row.status) {
    case "unanswered":
      return { ...exercise, status: "unanswered" };
    case "graded":
      if (answer !== null && score !== null && feedback !== null) {
        return { ...exercise, status: "graded", answer, score, feedback };
      }
      break;
    case "off_task":
      if (answer !== null && feedback !== null) {
        return { ...exercise, status: "off_task", answer, feedback };
      }
      break;
    case "grading_unavailable":
      if (answer !== null) {
        return { ...exercise, status: "grading_unavailable", answer };
      }
      break;
  }
  throw new Error(`Exercise ${row.id} has inconsistent columns for status "${row.status}"`);
}
