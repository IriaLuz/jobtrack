import { useId, type FormEvent } from "react";
import type { Exercise } from "../../types/exercise";
import { Button } from "../button/button";

interface ExerciseCardProps {
  exercise: Exercise;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmitAnswer: (answer: string) => void;
}

export const ExerciseCard = ({ exercise, isSubmitting, errorMessage, onSubmitAnswer }: ExerciseCardProps) => {
  const answerId = useId();

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const answer = String(new FormData(event.currentTarget).get("answer") ?? "").trim();
    if (answer) onSubmitAnswer(answer);
  };

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-(--border) p-4">
      <p className="font-medium whitespace-pre-line text-(--text-h)">{exercise.question}</p>
      {exercise.questionSource === "question_bank" && (
        <p className="text-xs">From our question bank, because the AI question writer is unavailable right now.</p>
      )}

      <form onSubmit={handleSubmit} className="flex flex-col gap-2">
        <label htmlFor={answerId}>Your answer</label>
        <textarea
          id={answerId}
          name="answer"
          rows={5}
          required
          maxLength={4000}
          defaultValue={exercise.status === "unanswered" ? "" : exercise.answer}
        />
        {errorMessage && (
          <p role="alert" className="text-sm text-(--danger)">
            {errorMessage}
          </p>
        )}
        <Button type="submit" disabled={isSubmitting} className="self-end">
          {isSubmitting ? "Grading… this can take a few seconds" : exercise.status === "unanswered" ? "Submit answer" : "Resubmit"}
        </Button>
      </form>

      <AttemptResult exercise={exercise} />
    </article>
  );
};

const AttemptResult = ({ exercise }: { exercise: Exercise }) => {
  switch (exercise.status) {
    case "unanswered":
      return null;
    case "graded":
      return (
        <div role="status" className="flex flex-col gap-1 rounded-lg bg-(--surface) p-3 text-sm">
          <p className={`text-base font-semibold ${scoreColor(exercise.score)}`}>Score: {exercise.score}/100</p>
          <p className="whitespace-pre-line">{exercise.feedback}</p>
        </div>
      );
    case "off_task":
      return (
        <div role="status" className="flex flex-col gap-1 rounded-lg bg-(--surface) p-3 text-sm">
          <p className="font-semibold text-(--warning)">This answer doesn't address the question.</p>
          <p className="whitespace-pre-line">{exercise.feedback}</p>
        </div>
      );
    case "grading_unavailable":
      return (
        <p role="status" className="rounded-lg bg-(--surface) p-3 text-sm">
          Grading is unavailable right now. Your answer is saved, so you can resubmit it in a moment.
        </p>
      );
    default: {
      // If a new status is added to the union, this line stops compiling until it is handled above.
      const unhandledStatus: never = exercise;
      return unhandledStatus;
    }
  }
};

function scoreColor(score: number) {
  if (score >= 70) return "text-(--success)";
  if (score >= 40) return "text-(--warning)";
  return "text-(--danger)";
}
