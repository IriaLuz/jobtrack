export const JOB_STATUSES = ["saved", "applied", "interviewing", "offered", "rejected"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export interface JobApplication {
  id: string;
  userId: string;
  company: string;
  role: string;
  status: JobStatus;
  link: string;
  salary: string | null;
  location: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** The fields a user can set. Ids, owner and timestamps are always decided by the server. */
export interface JobApplicationDetails {
  company: string;
  role: string;
  status: JobStatus;
  link: string;
  salary?: string | null;
  location?: string | null;
  notes?: string | null;
}

/** A partial update: a missing field is left unchanged, `null` clears an optional field. */
export type JobApplicationChanges = Partial<JobApplicationDetails>;

/**
 * Persistence port for job applications. Every method is scoped by `userId`, so a user can
 * never read or change another user's applications, whatever id they send.
 */
export interface JobRepository {
  /** Most recently updated first. */
  findAllByUser(userId: string): Promise<JobApplication[]>;
  findById(userId: string, jobId: string): Promise<JobApplication | null>;
  create(userId: string, details: JobApplicationDetails): Promise<JobApplication>;
  /** Returns null when the job does not exist or is not owned by the user. */
  update(userId: string, jobId: string, changes: JobApplicationChanges): Promise<JobApplication | null>;
  /** Returns false when the job does not exist or is not owned by the user. */
  delete(userId: string, jobId: string): Promise<boolean>;
}
