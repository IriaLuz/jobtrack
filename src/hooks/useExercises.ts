import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exercisesApi } from "../api/exercisesApi";

const exercisesQueryOptions = (jobId: string) =>
  queryOptions({ queryKey: ["exercises", jobId], queryFn: () => exercisesApi.list(jobId) });

export const useExercises = (jobId: string) => useQuery(exercisesQueryOptions(jobId));

// The API returns the full exercise after each AI call, so we put it straight into the cache
// instead of refetching: the user has already waited for the AI once.

export function useGenerateExercise(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => exercisesApi.generate(jobId),
    onSuccess: (newExercise) => {
      queryClient.setQueryData(exercisesQueryOptions(jobId).queryKey, (exercises = []) => [
        newExercise,
        ...exercises,
      ]);
    },
  });
}

export function useSubmitAnswer(jobId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ exerciseId, answer }: { exerciseId: string; answer: string }) =>
      exercisesApi.submitAnswer(exerciseId, answer),
    onSuccess: (updatedExercise) => {
      queryClient.setQueryData(exercisesQueryOptions(jobId).queryKey, (exercises) =>
        exercises?.map((exercise) => (exercise.id === updatedExercise.id ? updatedExercise : exercise)),
      );
    },
  });
}
