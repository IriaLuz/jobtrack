// Mirrors the API's Exercise union. Each status only has the fields that make sense for it,
// so the UI cannot, for example, show a score for an attempt that was never graded.

export type ExerciseAttempt =
  | { status: "unanswered" }
  | { status: "graded"; answer: string; score: number; feedback: string }
  | { status: "off_task"; answer: string; feedback: string }
  | { status: "grading_unavailable"; answer: string };

export type Exercise = {
  id: string;
  jobApplicationId: string;
  question: string;
  questionSource: "ai" | "question_bank";
  createdAt: string;
} & ExerciseAttempt;
