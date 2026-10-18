import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/httpClient";
import { jobsApi } from "../api/jobsApi";
import type { JobApplication } from "../types/job";
import { jobsQueryOptions, useUpdateJob } from "./useJobs";

vi.mock("../api/jobsApi");

const job = (id: string, status: JobApplication["status"]): JobApplication => ({
  id,
  company: `Company ${id}`,
  role: "Engineer",
  status,
  link: "https://example.com",
  salary: null,
  location: null,
  notes: null,
});

function renderUpdateJob(jobs: JobApplication[]) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  queryClient.setQueryData(jobsQueryOptions.queryKey, jobs);
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const { result } = renderHook(() => useUpdateJob(), { wrapper });
  return { result, readJobs: () => queryClient.getQueryData(jobsQueryOptions.queryKey) };
}

describe("useUpdateJob", () => {
  it("moves the card immediately, before the server answers", () => {
    vi.mocked(jobsApi.update).mockReturnValue(new Promise(() => {}));
    vi.mocked(jobsApi.list).mockReturnValue(new Promise(() => {}));
    const { result, readJobs } = renderUpdateJob([job("a", "saved"), job("b", "saved")]);

    act(() => result.current.mutate({ jobId: "b", changes: { status: "applied" } }));

    return waitFor(() => expect(readJobs()?.[0]).toMatchObject({ id: "b", status: "applied" }));
  });

  it("puts the card back when the server rejects the change", async () => {
    vi.mocked(jobsApi.update).mockRejectedValue(new ApiError("Job application not found", 404));
    vi.mocked(jobsApi.list).mockReturnValue(new Promise(() => {}));
    const original = [job("a", "saved"), job("b", "saved")];
    const { result, readJobs } = renderUpdateJob(original);

    act(() => result.current.mutate({ jobId: "b", changes: { status: "applied" } }));

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(readJobs()).toEqual(original);
  });
});
