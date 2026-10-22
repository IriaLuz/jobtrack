import { z } from "zod";

/** Optional settings: an empty value (e.g. `ANTHROPIC_API_KEY=` in .env) means "not set". */
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
  ANTHROPIC_API_KEY: optionalSetting,
  ANTHROPIC_MODEL: z.string().trim().min(1).default("claude-opus-5-5"),
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
