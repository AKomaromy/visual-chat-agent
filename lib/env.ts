import { z } from "zod";

/**
 * Fails fast with a clear message if a required credential is missing,
 * instead of surfacing a cryptic error from inside a ClickHouse/Trigger.dev call.
 */
const envSchema = z.object({
  CLICKHOUSE_URL: z.string().url(),
  CLICKHOUSE_USERNAME: z.string().min(1),
  CLICKHOUSE_PASSWORD: z.string().min(1),
  CLICKHOUSE_DATABASE: z.string().min(1).default("default"),
});

export type Env = z.infer<typeof envSchema>;

let cached: Env | undefined;

/** Call only from server-side code (Trigger.dev tasks, route handlers). */
export function getEnv(): Env {
  if (cached) return cached;
  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const missing = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new Error(
      `Missing or invalid required environment variable(s): ${missing}. See .env.example.`,
    );
  }
  cached = parsed.data;
  return cached;
}
