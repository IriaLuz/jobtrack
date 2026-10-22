import { z } from "zod";

/** Optional settings: an empty value (e.g. `GROQ_API_KEY=` in .env) means "not set". */
const optionalSetting = z
  .string()
  .trim()
  .optional()
  .transform((value) => value || undefined);

const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.url("DATABASE_URL must be a PostgreSQL connection URL"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
  GROQ_API_KEY: optionalSetting,
  // A production model on Groq: supports strict structured outputs, and is its fastest and cheapest.
  // Any replacement must support strict structured outputs and `reasoning_effort` (the GPT-OSS
  // models do), or every AI request would end in the fallback.
  GROQ_MODEL: z.string().trim().min(1).default("openai/gpt-oss-20b"),
  SENTRY_DSN: optionalSetting.pipe(z.url().optional()),
});

export type Config = z.infer<typeof configSchema>;

/** Validates the environment once at startup, so a misconfigured deploy fails immediately and clearly. */
export function loadConfig(environment: NodeJS.ProcessEnv = process.env): Config {
  const result = configSchema.safeParse(environment);
  if (!result.success) {
    throw new Error(`Invalid environment configuration:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}
