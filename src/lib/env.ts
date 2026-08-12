import { z } from "zod";

/**
 * All environment configuration enters the application here and nowhere else.
 * Moving host or database is a change to this file, not a rewrite.
 */
const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  SESSION_SECRET: z
    .string()
    .min(32, "SESSION_SECRET must be at least 32 characters"),
  APP_URL: z.string().url().default("http://localhost:3000"),
  PUBLIC_SITE_URL: z.string().url().default("https://voxclip.it"),
  /**
   * The safety switch. While false, every provider adapter is a fake that
   * records the payload and posts nothing. Never true in test or preview.
   */
  ENABLE_REAL_PUBLISHING: z
    .enum(["true", "false"])
    .default("false")
    .transform((v) => v === "true"),
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
});

export type Env = z.infer<typeof schema>;

let cached: Env | null = null;

/**
 * Validates and returns the environment. Throws with a readable list of what is
 * missing rather than failing later with an undefined value.
 */
export function getEnv(): Env {
  if (cached) return cached;

  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(
      `Environment is not configured. Copy .env.example to .env and fill in:\n${problems}`,
    );
  }

  if (parsed.data.NODE_ENV !== "production" && parsed.data.ENABLE_REAL_PUBLISHING) {
    throw new Error(
      "ENABLE_REAL_PUBLISHING must be false outside production. " +
        "Real posting is never allowed from a development, test, or preview environment.",
    );
  }

  cached = parsed.data;
  return cached;
}

/** Test helper. Never called by application code. */
export function resetEnvCache(): void {
  cached = null;
}
