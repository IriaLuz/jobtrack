export const STATUSES = [
  "saved",
  "applied",
  "interviewing",
  "offered",
  "rejected",
] as const;

export type Status = (typeof STATUSES)[number];

export type JobApplication = {
  id: string;
  company: string;
  salary?: string;
  location?: string;
  status: Status;
  link: string;
  role: string;
  notes?: string;
};
