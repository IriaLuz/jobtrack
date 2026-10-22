import { z } from "zod";
import { JOB_STATUSES } from "../domain/jobs/jobApplication.js";

// Request schemas: every body and URL parameter is parsed here before it reaches the domain.
// Zod objects drop unknown keys, so a client can never set fields like `id` or `userId`.

const email = z.string().trim().toLowerCase().max(254).pipe(z.email("Enter a valid email address"));

/**
 * bcrypt silently ignores everything after the first 72 *bytes*. Accented letters and emoji take
 * 2-4 bytes each, so we count bytes, not characters: otherwise two different long passwords that
 * share their first 72 bytes would both unlock the account.
 */
const PASSWORD_MAX_BYTES = 72;
const fitsInBcrypt = (password: string) => new TextEncoder().encode(password).length <= PASSWORD_MAX_BYTES;

export const registerSchema = z.object({
  email,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .refine(fitsInBcrypt, "Password is too long. Use fewer characters, or fewer accents and emoji."),
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Enter your password").refine(fitsInBcrypt, "Invalid email or password"),
});

const requiredText = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(maxLength, `${label} must be at most ${maxLength} characters`);

/** Missing stays missing (unchanged on update); an empty string becomes null (cleared). */
const optionalText = (label: string, maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `${label} must be at most ${maxLength} characters`)
    .nullable()
    .optional()
    .transform((value) => (value === "" ? null : value));

const jobFields = {
  company: requiredText("Company", 200),
  role: requiredText("Role", 200),
  status: z.enum(JOB_STATUSES),
  // Only http(s): z.url() alone also accepts "javascript:alert(1)", which would become a clickable XSS link.
  link: z
    .string()
    .trim()
    .max(2000, "Link must be at most 2000 characters")
    .pipe(z.url({ protocol: /^https?$/, error: "Link must be a valid http(s) URL" })),
  salary: optionalText("Salary", 100),
  location: optionalText("Location", 200),
  notes: optionalText("Notes", 2000),
};

export const createJobSchema = z.object({ ...jobFields, status: jobFields.status.default("saved") });

export const updateJobSchema = z.object(jobFields).partial();

export const jobIdParamsSchema = z.object({ jobId: z.uuid("Invalid job id") });

export const exerciseIdParamsSchema = z.object({ exerciseId: z.uuid("Invalid exercise id") });

export const answerSchema = z.object({
  answer: requiredText("Answer", 4000),
});
