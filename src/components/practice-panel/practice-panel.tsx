import { useExercises, useGenerateExercise, useSubmitAnswer } from "../../hooks/useExercises";
import type { Exercise } from "../../types/exercise";
import type { JobApplication } from "../../types/job";
import { Button } from "../button/button";
import { ExerciseCard } from "../exercise-card/exercise-card";

/** Container: loads the job's practice history and connects each exercise to the API. */
export const PracticePanel = ({ job }: { job: JobApplication }) => {
  const exercisesQuery = useExercises(job.id);
  const generateExercise = useGenerateExercise(job.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-sm text-sm">
          Answer in your own words and get feedback on each attempt. The AI sees this application's company,
          role and notes, and your answers.
        </p>
        <Button onClick={() => generateExercise.mutate()} disabled={generateExercise.isPending}>
          {generateExercise.isPending ? "Writing a question…" : "New question"}
        </Button>
      </div>

      {generateExercise.isError && (
        <p role="alert" className="text-sm text-(--danger)">
          {generateExercise.error.message}
        </p>
      )}
      {exercisesQuery.isPending && <p role="status">Loading your practice history…</p>}
      {exercisesQuery.isError && (
        <p role="alert" className="text-sm text-(--danger)">
          {exercisesQuery.error.message}
        </p>
      )}
      {exercisesQuery.data?.length === 0 && <p className="text-sm">No questions yet. Choose "New question" to start.</p>}
      {exercisesQuery.data?.map((exercise) => (
        <AnswerableExercise key={exercise.id} jobId={job.id} exercise={exercise} />
      ))}
    </div>
  );
};

/** Each exercise gets its own mutation, so submitting one answer never disables the others. */
const AnswerableExercise = ({ jobId, exercise }: { jobId: string; exercise: Exercise }) => {
  const submitAnswer = useSubmitAnswer(jobId);

  return (
    <ExerciseCard
      exercise={exercise}
      isSubmitting={submitAnswer.isPending}
      errorMessage={submitAnswer.error?.message}
      onSubmitAnswer={(answer) => submitAnswer.mutate({ exerciseId: exercise.id, answer })}
    />
  );
};
