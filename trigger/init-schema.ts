import { task, logger } from "@trigger.dev/sdk";
import { randomUUID } from "node:crypto";
import { getClickHouseClient } from "../lib/clickhouse";

/**
 * Sprint Plan Task 3 — lay down the minimum schema (docs/09 Sprint Plan.md
 * Task 3 / docs/10 Task Backlog.md §4). Three tables only: articles,
 * profile_cards, artifacts. Idempotent (CREATE TABLE IF NOT EXISTS), safe
 * to re-run.
 *
 * Also runs the Task 3 acceptance checks in the same pass: an insert/select
 * round trip against all three tables, and the H3 known-coordinate sanity
 * check (docs/12 Scope Gate.md §7.4). ClickHouse's H3 functions take
 * coordinates as (longitude, latitude) — confirmed live against this
 * service before writing this task (see docs/14 Engineering Handoff.md) —
 * which is why `h3_r5` below is computed as
 * `geoToH3(longitude, latitude, 5)`, not the more common (lat, lon) order.
 *
 * Test rows are deleted after verification so a re-run never leaves rows
 * behind that would fool Task 4's "articles already has rows" no-op check.
 */
export const initSchema = task({
  id: "init-schema",
  run: async () => {
    const clickhouse = getClickHouseClient();

    await clickhouse.command({
      query: `
        CREATE TABLE IF NOT EXISTS articles
        (
          id String,
          title String,
          url String,
          published_at DateTime64(3),
          tags Array(String),
          country_code LowCardinality(String),
          latitude Float64,
          longitude Float64,
          h3_r5 UInt64 MATERIALIZED geoToH3(longitude, latitude, 5),
          tone Float32
        )
        ENGINE = MergeTree
        ORDER BY (published_at, id)
      `,
    });

    await clickhouse.command({
      query: `
        CREATE TABLE IF NOT EXISTS profile_cards
        (
          profile_id String,
          card_id String,
          label String,
          item_type Enum8('goal' = 1, 'interest' = 2, 'entity' = 3, 'location' = 4),
          weight Float32,
          created_at DateTime64(3) DEFAULT now64(3)
        )
        ENGINE = MergeTree
        ORDER BY (profile_id, card_id)
      `,
    });

    await clickhouse.command({
      query: `
        CREATE TABLE IF NOT EXISTS artifacts
        (
          id String,
          profile_id String,
          question String,
          manifest_json String,
          created_at DateTime64(3) DEFAULT now64(3)
        )
        ENGINE = MergeTree
        ORDER BY (profile_id, created_at, id)
      `,
    });

    logger.info("schema created (or already existed)");

    const testId = randomUUID();
    // New York City. Longitude (-74.006) falls outside latitude's [-90, 90]
    // range in magnitude, so a lat/lon-swap bug produces a visibly wrong
    // decoded point rather than silently passing.
    const nyc = { lat: 40.7128, lon: -74.006 };

    await clickhouse.insert({
      table: "articles",
      values: [
        {
          id: testId,
          title: "Schema smoke test article",
          url: "https://example.com/schema-smoke-test",
          published_at: new Date().toISOString(),
          tags: ["schema-smoke-test"],
          country_code: "US",
          latitude: nyc.lat,
          longitude: nyc.lon,
          tone: 0,
        },
      ],
      format: "JSONEachRow",
    });

    await clickhouse.insert({
      table: "profile_cards",
      values: [
        {
          profile_id: "schema-smoke-test",
          card_id: testId,
          label: "Schema smoke test",
          item_type: "goal",
          weight: 1,
        },
      ],
      format: "JSONEachRow",
    });

    await clickhouse.insert({
      table: "artifacts",
      values: [
        {
          id: testId,
          profile_id: "schema-smoke-test",
          question: "schema smoke test",
          manifest_json: "{}",
        },
      ],
      format: "JSONEachRow",
    });

    const articleResult = await clickhouse.query({
      query: `
        SELECT
          id,
          h3_r5,
          tupleElement(h3ToGeo(h3_r5), 1) AS decoded_lon,
          tupleElement(h3ToGeo(h3_r5), 2) AS decoded_lat,
          geoDistance(longitude, latitude, tupleElement(h3ToGeo(h3_r5), 1), tupleElement(h3ToGeo(h3_r5), 2)) AS distance_m
        FROM articles
        WHERE id = {id:String}
      `,
      query_params: { id: testId },
      format: "JSONEachRow",
    });
    const [articleRow] = await articleResult.json<{
      id: string;
      h3_r5: string;
      decoded_lon: number;
      decoded_lat: number;
      distance_m: number;
    }>();

    const profileResult = await clickhouse.query({
      query: `SELECT card_id FROM profile_cards WHERE card_id = {id:String}`,
      query_params: { id: testId },
      format: "JSONEachRow",
    });
    const profileRows = await profileResult.json<{ card_id: string }>();

    const artifactResult = await clickhouse.query({
      query: `SELECT id FROM artifacts WHERE id = {id:String}`,
      query_params: { id: testId },
      format: "JSONEachRow",
    });
    const artifactRows = await artifactResult.json<{ id: string }>();

    // r5 hexagons average ~8.5 km edge length; 25 km is a generous bound
    // that still fails hard on a lat/lon swap (which puts the decoded
    // point thousands of km away).
    const H3_SANITY_THRESHOLD_M = 25_000;

    const checks = {
      articleRoundTrip: articleRow?.id === testId,
      profileCardRoundTrip: profileRows.length === 1 && profileRows[0]?.card_id === testId,
      artifactRoundTrip: artifactRows.length === 1 && artifactRows[0]?.id === testId,
      h3SanityWithinThreshold: (articleRow?.distance_m ?? Infinity) < H3_SANITY_THRESHOLD_M,
    };

    logger.info("schema acceptance checks", { checks, articleRow });

    // Clean up regardless of outcome, so a re-run of this task never
    // leaves rows behind that would fool Task 4's "articles already has
    // rows" no-op check.
    await clickhouse.command({
      query: `ALTER TABLE articles DELETE WHERE id = {id:String}`,
      query_params: { id: testId },
    });
    await clickhouse.command({
      query: `ALTER TABLE profile_cards DELETE WHERE card_id = {id:String}`,
      query_params: { id: testId },
    });
    await clickhouse.command({
      query: `ALTER TABLE artifacts DELETE WHERE id = {id:String}`,
      query_params: { id: testId },
    });

    const allPassed = Object.values(checks).every(Boolean);
    if (!allPassed) {
      throw new Error(`Schema acceptance checks failed: ${JSON.stringify(checks)}`);
    }

    return { allPassed, checks, h3SanityDistanceMeters: articleRow?.distance_m };
  },
});
