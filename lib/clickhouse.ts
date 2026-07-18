import { createClient, type ClickHouseClient } from "@clickhouse/client";
import { getEnv } from "./env";

let client: ClickHouseClient | undefined;

/**
 * Singleton ClickHouse client. ClickHouse is the sole primary database for
 * this build (see docs/12 Scope Gate.md) — there is no Postgres fallback.
 */
export function getClickHouseClient(): ClickHouseClient {
  if (client) return client;
  const env = getEnv();
  client = createClient({
    url: env.CLICKHOUSE_URL,
    username: env.CLICKHOUSE_USERNAME,
    password: env.CLICKHOUSE_PASSWORD,
    database: env.CLICKHOUSE_DATABASE,
    clickhouse_settings: {
      // Query-time safety limits per docs/05 Architecture.md §11.2 — kept
      // deliberately low; this build never needs a large ad-hoc scan.
      max_execution_time: 10,
    },
  });
  return client;
}
