import { queryOptions, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "../api/jobsApi";
import type { JobApplication, JobApplicationInput } from "../types/job";

// queryOptions ties the key to its data type, so getQueryData/setQueryData below are typed for free.
export const jobsQueryOptions = queryOptions({ queryKey: ["jobs"], queryFn: jobsApi.list });

export const useJobs = () => useQuery(jobsQueryOptions);

export function useCreateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.create,
    // Returning the promise keeps the mutation pending until the board has the new card.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobsQueryOptions.queryKey }),
  });
}

interface JobUpdate {
  jobId: string;
  changes: Partial<JobApplicationInput>;
}

/**
 * Optimistic update: the card moves (or changes) on screen immediately, and goes back to where
 * it was if the server rejects the change. This is what makes drag-and-drop feel instant.
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ jobId, changes }: JobUpdate) => jobsApi.update(jobId, changes),
    onMutate: async ({ jobId, changes }: JobUpdate) => {
      await queryClient.cancelQueries({ queryKey: jobsQueryOptions.queryKey });
      const previousJobs = queryClient.getQueryData(jobsQueryOptions.queryKey);
      queryClient.setQueryData(jobsQueryOptions.queryKey, (jobs) => jobs && moveToTop(jobs, jobId, changes));
      return { previousJobs };
    },
    onError: (_error, _update, snapshot) => {
      queryClient.setQueryData(jobsQueryOptions.queryKey, snapshot?.previousJobs);
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: jobsQueryOptions.queryKey }),
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: jobsApi.remove,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: jobsQueryOptions.queryKey }),
  });
}

/** Same order as the API: the most recently updated application comes first. */
function moveToTop(jobs: JobApplication[], jobId: string, changes: Partial<JobApplicationInput>) {
  const job = jobs.find(({ id }) => id === jobId);
  if (!job) return jobs;
  return [{ ...job, ...changes }, ...jobs.filter(({ id }) => id !== jobId)];
}
