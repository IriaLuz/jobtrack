/** Where the question came from: the AI, or our hand-written fallback questions. */
export type QuestionSource = "ai" | "question_bank";

/**
 * The state of the candidate's latest attempt. Each status carries exactly the fields that make
 * sense for it, so a "graded" attempt without a score cannot even be written down.
 */
export type ExerciseAttempt =
  | { status: "unanswered" }
  | { status: "graded"; answer: string; score: number; feedback: string }
  | { status: "off_task"; answer: string; feedback: string }
  | { status: "grading_unavailable"; answer: string };

export type AnsweredAttempt = Exclude<ExerciseAttempt, { status: "unanswered" }>;

export type Exercise = {
  id: string;
  jobApplicationId: string;
  question: string;
  questionSource: QuestionSource;
  createdAt: Date;
} & ExerciseAttempt;

export interface ExerciseRepository {
  /** Newest first. */
  findAllByJob(jobApplicationId: string): Promise<Exercise[]>;
  /** Returns null when the exercise does not exist or its job is not owned by the user. */
  findByIdForUser(userId: string, exerciseId: string): Promise<Exercise | null>;
  create(exercise: { jobApplicationId: string; question: string; questionSource: QuestionSource }): Promise<Exercise>;
  /** Returns null when the exercise no longer exists, e.g. its job was deleted while grading. */
  saveAttempt(exerciseId: string, attempt: AnsweredAttempt): Promise<Exercise | null>;
}

/** The job details the question writer may see. Never ids, emails or anything secret. */
export interface QuestionContext {
  company: string;
  role: string;
  notes: string | null;
}

export interface AnswerSubmission {
  question: string;
  answer: string;
}

/**
 * Port for the AI that writes and grades exercises. It returns the model's raw output as
 * `unknown` on purpose: LLM output is untrusted input, and the service validates it.
 * Implementations should stop work when `signal` is aborted.
 */
export interface ExerciseAi {
  writeQuestion(context: QuestionContext, signal: AbortSignal): Promise<unknown>;
  gradeAnswer(submission: AnswerSubmission, signal: AbortSignal): Promise<unknown>;
}
