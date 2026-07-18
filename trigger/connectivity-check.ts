import { task, logger } from "@trigger.dev/sdk";
import { randomUUID } from "node:crypto";
import { getClickHouseClient } from "../lib/clickhouse";

/**
 * Sprint Plan Task 1 — "prove ClickHouse and Trigger.dev talk to each other."
 * Not part of the product; this task (and its scratch table) can be deleted
 * once Task 5's real getBriefing tool is working end to end.
 *
 * Acceptance test (docs/09 Sprint Plan.md Task 1): a Trigger.dev run
 * completes successfully, and a SELECT against ClickHouse confirms the row
 * this run inserted actually exists.
 */
export const connectivityCheck = task({
  id: "connectivity-check",
  run: async () => {
    const clickhouse = getClickHouseClient();
    const id = randomUUID();
    const insertedAt = new Date().toISOString();

    await clickhouse.command({
      query: `
        CREATE TABLE IF NOT EXISTS _scratch_connectivity_check
        (
          id String,
          inserted_at DateTime64(3)
        )
        ENGINE = MergeTree
        ORDER BY inserted_at
      `,
    });

    await clickhouse.insert({
      table: "_scratch_connectivity_check",
      values: [{ id, inserted_at: insertedAt }],
      format: "JSONEachRow",
    });

    const result = await clickhouse.query({
      query: `SELECT id, inserted_at FROM _scratch_connectivity_check WHERE id = {id:String}`,
      query_params: { id },
      format: "JSONEachRow",
    });
    const rows = await result.json<{ id: string; inserted_at: string }>();

    const confirmed = rows.length === 1 && rows[0]?.id === id;
    logger.info("connectivity-check result", { id, confirmed, rows });

    if (!confirmed) {
      throw new Error(
        "ClickHouse round-trip failed: inserted row was not found on read-back.",
      );
    }

    return { confirmed, id, insertedAt };
  },
});
