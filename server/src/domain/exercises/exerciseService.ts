import type { z } from "zod";
import { NotFoundError } from "../errors.js";
import type { JobService } from "../jobs/jobService.js";
import { aiGradeSchema, aiQuestionSchema, type AiGrade } from "./aiOutput.js";
import type { AnsweredAttempt, ExerciseAi, ExerciseRepository } from "./exercise.js";
import { pickFallbackQuestion } from "./questionBank.js";
import { withTimeout } from "./withTimeout.js";

export interface Logger {
  warn(message: string, details?: Record<string, unknown>): void;
}

export interface AiTimeouts {
  writeQuestionMs: number;
  gradeAnswerMs: number;
}

/**
 * How long the user waits for the AI before we fall back. Grading reads more text, so it gets longer.
 * Keep these below the hosting timeout (maxDuration in server/vercel.json), or the platform would
 * cut the request before our fallback runs.
 */
const DEFAULT_AI_TIMEOUTS: AiTimeouts = { writeQuestionMs: 10_000, gradeAnswerMs: 15_000 };

interface ExerciseServiceDependencies {
  jobService: Pick<JobService, "getJob">;
  exerciseRepository: ExerciseRepository;
  /** null when no AI provider is configured: every request then takes the fallback path. */
  exerciseAi: ExerciseAi | null;
  logger: Logger;
  aiTimeouts?: AiTimeouts;
}

export function createExerciseService({
  jobService,
  exerciseRepository,
  exerciseAi,
  logger,
  aiTimeouts = DEFAULT_AI_TIMEOUTS,
}: ExerciseServiceDependencies) {
  /**
   * Asks the AI and validates its output. Any failure (not configured, timeout, network error,
   * refusal, malformed output) returns null, so the caller can degrade gracefully instead of failing.
   */
  async function askAi<Output>(
    taskName: string,
    task: (ai: ExerciseAi, signal: AbortSignal) => Promise<unknown>,
    outputSchema: z.ZodType<Output>,
    timeoutMs: number,
  ): Promise<Output | null> {
    if (!exerciseAi) return null;
    try {
      const rawOutput = await withTimeout((signal) => task(exerciseAi, signal), timeoutMs);
      return outputSchema.parse(rawOutput);
    } catch (error) {
      logger.warn(`AI ${taskName} failed, using the fallback`, {
        reason: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }

  /** The exercise can disappear while we work on it, e.g. its job is deleted in another tab. */
  async function saveAttemptOrThrow(exerciseId: string, attempt: AnsweredAttempt) {
    const savedExercise = await exerciseRepository.saveAttempt(exerciseId, attempt);
    if (!savedExercise) throw new NotFoundError("Exercise");
    return savedExercise;
  }

  return {
    async listExercises(userId: string, jobId: string) {
      await jobService.getJob(userId, jobId); // throws NotFoundError if the job is not the user's
      return exerciseRepository.findAllByJob(jobId);
    },

    async generateExercise(userId: string, jobId: string) {
      const job = await jobService.getJob(userId, jobId);
      const context = { company: job.company, role: job.role, notes: job.notes };

      const aiQuestion = await askAi(
        "question writing",
        (ai, signal) => ai.writeQuestion(context, signal),
        aiQuestionSchema,
        aiTimeouts.writeQuestionMs,
      );

      return exerciseRepository.create({
        jobApplicationId: job.id,
        question: aiQuestion?.question ?? pickFallbackQuestion(context),
        questionSource: aiQuestion ? "ai" : "question_bank",
      });
    },

    async submitAnswer(userId: string, exerciseId: string, answer: string) {
      const exercise = await exerciseRepository.findByIdForUser(userId, exerciseId);
      if (!exercise) throw new NotFoundError("Exercise");

      // Save the answer before the slow AI call. If the AI fails, or the server dies mid-request,
      // the answer is already stored as "grading unavailable" and the user can resubmit it.
      const ungradedExercise = await saveAttemptOrThrow(exercise.id, { status: "grading_unavailable", answer });

      const grade = await askAi(
        "grading",
        (ai, signal) => ai.gradeAnswer({ question: exercise.question, answer }, signal),
        aiGradeSchema,
        aiTimeouts.gradeAnswerMs,
      );
      if (!grade) return ungradedExercise;

      return saveAttemptOrThrow(exercise.id, toGradedAttempt(answer, grade));
    },
  };
}

export type ExerciseService = ReturnType<typeof createExerciseService>;

function toGradedAttempt(answer: string, grade: AiGrade): AnsweredAttempt {
  if (!grade.addressesQuestion) return { status: "off_task", answer, feedback: grade.feedback };
  return { status: "graded", answer, score: grade.score, feedback: grade.feedback };
}
