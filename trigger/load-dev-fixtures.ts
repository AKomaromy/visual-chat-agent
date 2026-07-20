import { schemaTask, logger } from "@trigger.dev/sdk";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { getClickHouseClient } from "../lib/clickhouse";
import { DEV_FIXTURE_TAG } from "../lib/dev-fixtures-tag";

/**
 * Temporary Task 5 development aid, NOT part of the product — GDELT's API
 * is currently unreachable (docs/11 Risks.md R-05), which blocks Task 4's
 * real seed and would otherwise block implementing/testing Task 5's real
 * ClickHouse-backed getBriefing query. This task inserts a small, clearly
 * marked, fully-controlled set of articles so that query can be built and
 * verified now, without waiting on GDELT.
 *
 * Every row carries the reserved DEV_FIXTURE_TAG in `tags`, a
 * "[DEV FIXTURE]" title prefix, and a fake `fixture.mirror-dev.test` URL —
 * unmistakable in any UI, log, or manual ClickHouse query. seed-gdelt's
 * no-op guard explicitly excludes this tag (trigger/seed-gdelt.ts), so
 * these rows can never block or be mistaken for the real GDELT seed, and
 * they must never be cited as satisfying Task 4's live-data acceptance
 * criteria (docs/09 Sprint Plan.md Task 4) — only Task 5's query logic.
 *
 * Call with `{ clear: true }` to remove every fixture row instead of
 * inserting (e.g. once GDELT recovers and Task 4's real seed is ready to
 * run against a clean table).
 */

const COUNTRY_POINTS: Record<string, { lat: number; lon: number }> = {
  US: { lat: 38.9072, lon: -77.0369 },
  DE: { lat: 52.52, lon: 13.405 },
  FR: { lat: 48.8566, lon: 2.3522 },
  BE: { lat: 50.8503, lon: 4.3517 },
  GB: { lat: 51.5072, lon: -0.1276 },
  JP: { lat: 35.6762, lon: 139.6503 },
  BR: { lat: -15.8267, lon: -47.9218 },
};

interface FixtureSpec {
  title: string;
  tags: string[];
  countryCode: string;
  daysAgo: number;
}

// Deliberately near-disjoint tag vocabularies between the two clusters
// below (matching Profile A's ai/regulation/enterprise/llm-tooling/US
// card tags vs Profile B's eu/climate/carbon/energy/markets card tags —
// docs/13 Demo Contract.md §2-3) so the ranking differentiation Task 5
// must prove is visible even on this small hand-authored set. A few
// neutral/cross-topic rows are mixed in for country/topic diversity.
const FIXTURES: FixtureSpec[] = [
  // Profile-A-leaning: AI / regulation / enterprise / LLM tooling / US
  { title: "EU finalizes AI Act enforcement guidance for large model providers", tags: ["ai", "regulation", "eu"], countryCode: "DE", daysAgo: 1 },
  { title: "US agency proposes new AI compliance framework for enterprise software", tags: ["ai", "regulation", "enterprise", "united-states"], countryCode: "US", daysAgo: 1 },
  { title: "White House unveils AI safety compliance checklist for federal contractors", tags: ["ai", "regulation", "united-states"], countryCode: "US", daysAgo: 2 },
  { title: "Major LLM tooling startup raises funding amid enterprise AI adoption boom", tags: ["ai", "llm-tooling", "enterprise"], countryCode: "US", daysAgo: 3 },
  { title: "Congress debates AI regulation bill affecting enterprise software vendors", tags: ["ai", "regulation", "enterprise", "united-states"], countryCode: "US", daysAgo: 4 },
  { title: "Leading AI labs face new compliance scrutiny over model safety", tags: ["ai", "llm-tooling", "regulation"], countryCode: "US", daysAgo: 6 },
  { title: "Enterprise AI adoption accelerates as compliance tools mature", tags: ["ai", "enterprise"], countryCode: "US", daysAgo: 8 },
  { title: "Washington think tank warns of AI regulation gaps in enterprise sector", tags: ["ai", "regulation", "enterprise", "united-states"], countryCode: "US", daysAgo: 11 },

  // Profile-B-leaning: climate / carbon / EU / energy / markets
  { title: "EU carbon border tax rules take effect across member states", tags: ["eu", "carbon", "regulation"], countryCode: "BE", daysAgo: 1 },
  { title: "European energy markets react to new climate policy announcement", tags: ["eu", "energy", "markets", "climate"], countryCode: "DE", daysAgo: 1 },
  { title: "Climate policy shift in Brussels reshapes carbon trading markets", tags: ["eu", "climate", "carbon", "markets"], countryCode: "BE", daysAgo: 2 },
  { title: "EU regulatory bodies finalize energy market reforms", tags: ["eu", "regulation", "energy", "markets"], countryCode: "FR", daysAgo: 3 },
  { title: "Carbon pricing debate intensifies as EU climate policy tightens", tags: ["eu", "carbon", "climate"], countryCode: "DE", daysAgo: 4 },
  { title: "European energy giants adjust strategy amid climate policy uncertainty", tags: ["eu", "energy", "climate"], countryCode: "FR", daysAgo: 6 },
  { title: "EU carbon market hits new milestone as climate policy takes hold", tags: ["eu", "carbon", "climate", "markets"], countryCode: "BE", daysAgo: 8 },
  { title: "Brussels regulators tighten oversight of European energy markets", tags: ["eu", "regulation", "energy", "markets"], countryCode: "FR", daysAgo: 11 },

  // Neutral / cross-cutting — country and topic diversity, low relevance
  // to either profile's card set.
  { title: "Global markets steady as central banks hold rates", tags: ["markets"], countryCode: "JP", daysAgo: 2 },
  { title: "Geopolitical tensions rise over trade route disputes", tags: ["geopolitics"], countryCode: "BR", daysAgo: 5 },
  { title: "Stock market rally continues on strong earnings", tags: ["markets"], countryCode: "GB", daysAgo: 7 },
  { title: "Diplomatic talks resume amid regional trade tensions", tags: ["geopolitics"], countryCode: "JP", daysAgo: 9 },
];

export const loadDevFixtures = schemaTask({
  id: "load-dev-fixtures",
  schema: z.object({ clear: z.boolean().optional() }),
  run: async ({ clear }) => {
    const clickhouse = getClickHouseClient();

    if (clear) {
      await clickhouse.command({
        query: `ALTER TABLE articles DELETE WHERE has(tags, {fixtureTag:String})`,
        query_params: { fixtureTag: DEV_FIXTURE_TAG },
      });
      logger.info("dev fixtures cleared");
      return { cleared: true };
    }

    const now = Date.now();
    const rows = FIXTURES.map((fixture) => {
      const point = COUNTRY_POINTS[fixture.countryCode];
      if (!point) {
        throw new Error(`No COUNTRY_POINTS entry for ${fixture.countryCode}`);
      }
      return {
        id: randomUUID(),
        title: `[DEV FIXTURE] ${fixture.title}`,
        url: `https://fixture.mirror-dev.test/${randomUUID()}`,
        published_at: new Date(now - fixture.daysAgo * 24 * 60 * 60 * 1000).toISOString(),
        tags: [...fixture.tags, DEV_FIXTURE_TAG],
        country_code: fixture.countryCode,
        latitude: point.lat,
        longitude: point.lon,
        tone: 0,
      };
    });

    await clickhouse.insert({ table: "articles", values: rows, format: "JSONEachRow" });
    logger.info("dev fixtures loaded", { count: rows.length });
    return { cleared: false, inserted: rows.length };
  },
});
