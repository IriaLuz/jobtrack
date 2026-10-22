export const STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offered",
  "rejected",
] as const;

export type Status = (typeof STATUSES)[number];

/** A Record over the union: adding a status without a label is a compile error. */
export const STATUS_LABELS: Record<Status, string> = {
  saved: "Saved",
  applied: "Applied",
  interviewing: "Interviewing",
  offered: "Offered",
  rejected: "Rejected",
};

export const isStatus = (value: unknown): value is Status =>
  STATUSES.some((status) => status === value);

export interface JobApplication {
  id: string;
  company: string;
  role: string;
  status: Status;
  link: string;
  salary: string | null;
  location: string | null;
  notes: string | null;
}

/** What the user can edit: everything except the id, which the server assigns. */
export type JobApplicationInput = Omit<JobApplication, "id">;
