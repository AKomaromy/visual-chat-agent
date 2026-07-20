import { task, logger } from "@trigger.dev/sdk";
import { randomUUID } from "node:crypto";
import { getClickHouseClient } from "../lib/clickhouse";
import { deriveTags } from "../lib/tags";
import { DEV_FIXTURE_TAG } from "../lib/dev-fixtures-tag";

/**
 * Sprint Plan Task 4 — the resilient, replayable seed ingestion (WF-B,
 * docs/10 Task Backlog.md §1). GDELT DOC 2.0 API only, not GKG — see
 * docs/12 Scope Gate.md §7.1. Runs 3-5 topically distinct queries so the
 * two demo profiles have something to differentiate (§7.2), derives
 * lightweight keyword tags from titles instead of trusting GDELT's own
 * taxonomy, and resolves `sourcecountry` (a country *name* string; the
 * DOC 2.0 API returns no coordinates at all) to a representative
 * country-level point via a small local lookup table.
 *
 * No-ops if `articles` already has rows (docs/12 Scope Gate.md §7.3 — a
 * one-time seed load doesn't need per-row fingerprint dedup). Re-seeding
 * from scratch is a manual `TRUNCATE TABLE articles`.
 */

const GDELT_ENDPOINT = "https://api.gdeltproject.org/api/v2/doc/doc";

// Deliberately different topics (docs/13 Demo Contract.md §4 / §7.2) so
// Profile A (AI/regulation/US) and Profile B (climate/EU/energy) actually
// rank differently against the same seed set.
const SEED_QUERIES: { topic: string; query: string }[] = [
  {
    topic: "ai-regulation",
    query: '("AI regulation" OR "AI Act" OR "AI compliance" OR "artificial intelligence law") sourcelang:english',
  },
  {
    topic: "climate-energy",
    query: '("climate policy" OR "carbon tax" OR "carbon border" OR "energy markets") sourcelang:english',
  },
  {
    topic: "markets",
    query: '("stock market" OR "financial markets" OR inflation OR "central bank") sourcelang:english',
  },
  {
    topic: "geopolitics",
    query: '(geopolitics OR sanctions OR diplomacy OR "foreign policy") sourcelang:english',
  },
];

// GDELT's `sourcecountry` field is a full country name, not an ISO code,
// and the DOC 2.0 API returns no coordinates at all (docs/12 Scope
// Gate.md §7.1) — this is a coarse, country-level, self-maintained
// lookup, not a GeoNames join. Articles whose country isn't in this list
// are skipped rather than inserted with a fabricated location.
const COUNTRY_LOOKUP: Record<string, { code: string; lat: number; lon: number }> = {
  "United States": { code: "US", lat: 38.9072, lon: -77.0369 },
  "United Kingdom": { code: "GB", lat: 51.5072, lon: -0.1276 },
  Germany: { code: "DE", lat: 52.52, lon: 13.405 },
  France: { code: "FR", lat: 48.8566, lon: 2.3522 },
  Belgium: { code: "BE", lat: 50.8503, lon: 4.3517 },
  Netherlands: { code: "NL", lat: 52.3676, lon: 4.9041 },
  Austria: { code: "AT", lat: 48.2082, lon: 16.3738 },
  Lithuania: { code: "LT", lat: 54.6872, lon: 25.2797 },
  Latvia: { code: "LV", lat: 56.9496, lon: 24.1052 },
  Estonia: { code: "EE", lat: 59.437, lon: 24.7536 },
  Poland: { code: "PL", lat: 52.2297, lon: 21.0122 },
  Italy: { code: "IT", lat: 41.9028, lon: 12.4964 },
  Spain: { code: "ES", lat: 40.4168, lon: -3.7038 },
  Ireland: { code: "IE", lat: 53.3498, lon: -6.2603 },
  Sweden: { code: "SE", lat: 59.3293, lon: 18.0686 },
  Denmark: { code: "DK", lat: 55.6761, lon: 12.5683 },
  Finland: { code: "FI", lat: 60.1699, lon: 24.9384 },
  Portugal: { code: "PT", lat: 38.7223, lon: -9.1393 },
  Greece: { code: "GR", lat: 37.9838, lon: 23.7275 },
  "Czech Republic": { code: "CZ", lat: 50.0755, lon: 14.4378 },
  Switzerland: { code: "CH", lat: 46.948, lon: 7.4474 },
  Canada: { code: "CA", lat: 45.4215, lon: -75.6972 },
  Australia: { code: "AU", lat: -35.2809, lon: 149.13 },
  "New Zealand": { code: "NZ", lat: -41.2865, lon: 174.7762 },
  India: { code: "IN", lat: 28.6139, lon: 77.209 },
  China: { code: "CN", lat: 39.9042, lon: 116.4074 },
  Japan: { code: "JP", lat: 35.6762, lon: 139.6503 },
  "South Korea": { code: "KR", lat: 37.5665, lon: 126.978 },
  Singapore: { code: "SG", lat: 1.3521, lon: 103.8198 },
  Indonesia: { code: "ID", lat: -6.2088, lon: 106.8456 },
  Pakistan: { code: "PK", lat: 33.6844, lon: 73.0479 },
  Brazil: { code: "BR", lat: -15.8267, lon: -47.9218 },
  Mexico: { code: "MX", lat: 19.4326, lon: -99.1332 },
  Colombia: { code: "CO", lat: 4.711, lon: -74.0721 },
  Argentina: { code: "AR", lat: -34.6037, lon: -58.3816 },
  "South Africa": { code: "ZA", lat: -25.7479, lon: 28.2293 },
  Nigeria: { code: "NG", lat: 9.0765, lon: 7.3986 },
  Egypt: { code: "EG", lat: 30.0444, lon: 31.2357 },
  "Saudi Arabia": { code: "SA", lat: 24.7136, lon: 46.6753 },
  "United Arab Emirates": { code: "AE", lat: 24.4539, lon: 54.3773 },
  Israel: { code: "IL", lat: 31.7683, lon: 35.2137 },
  Russia: { code: "RU", lat: 55.7558, lon: 37.6173 },
  Ukraine: { code: "UA", lat: 50.4501, lon: 30.5234 },
  Turkey: { code: "TR", lat: 39.9334, lon: 32.8597 },
  Norway: { code: "NO", lat: 59.9139, lon: 10.7522 },
  Luxembourg: { code: "LU", lat: 49.6116, lon: 6.1319 },
  Hungary: { code: "HU", lat: 47.4979, lon: 19.0402 },
  Romania: { code: "RO", lat: 44.4268, lon: 26.1025 },
  Bulgaria: { code: "BG", lat: 42.6977, lon: 23.3219 },
  Croatia: { code: "HR", lat: 45.815, lon: 15.9819 },
  Slovakia: { code: "SK", lat: 48.1486, lon: 17.1077 },
  Slovenia: { code: "SI", lat: 46.0569, lon: 14.5058 },
};

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string; // e.g. "20260718T191500Z"
  domain: string;
  language: string;
  sourcecountry: string;
}

function parseGdeltDate(seendate: string): Date {
  const y = seendate.slice(0, 4);
  const mo = seendate.slice(4, 6);
  const d = seendate.slice(6, 8);
  const h = seendate.slice(9, 11);
  const mi = seendate.slice(11, 13);
  const s = seendate.slice(13, 15);
  return new Date(`${y}-${mo}-${d}T${h}:${mi}:${s}Z`);
}

async function fetchGdeltQuery(query: string, attempt = 1): Promise<GdeltArticle[]> {
  const params = new URLSearchParams({
    query,
    mode: "ArtList",
    maxrecords: "250",
    format: "json",
    sort: "DateDesc",
  });
  let response: Response;
  try {
    response = await fetch(`${GDELT_ENDPOINT}?${params.toString()}`, {
      headers: { "User-Agent": "mirror-hackathon-seed/1.0" },
    });
  } catch (err) {
    const cause = err instanceof Error ? (err.cause ?? err.message) : err;
    throw new Error(`GDELT fetch failed: ${String(cause)}`, { cause: err });
  }

  if (response.status === 429 && attempt <= 4) {
    const backoffMs = attempt * 5000;
    logger.warn("GDELT rate-limited, backing off", { attempt, backoffMs });
    await new Promise((r) => setTimeout(r, backoffMs));
    return fetchGdeltQuery(query, attempt + 1);
  }
  if (!response.ok) {
    throw new Error(`GDELT request failed: ${response.status} ${response.statusText}`);
  }

  const text = await response.text();
  if (!text.trim()) return [];
  const parsed = JSON.parse(text) as { articles?: GdeltArticle[] };
  return parsed.articles ?? [];
}

export const seedGdelt = task({
  id: "seed-gdelt",
  run: async () => {
    const clickhouse = getClickHouseClient();

    // Excludes dev-fixture rows (trigger/load-dev-fixtures.ts, tagged
    // DEV_FIXTURE_TAG) from the no-op check — those are a temporary Task 5
    // workaround for the GDELT outage, not real seed data, and must never
    // block or be mistaken for the real seed load this check guards.
    const existingCountResult = await clickhouse.query({
      query: `SELECT count() AS n FROM articles WHERE NOT has(tags, {fixtureTag:String})`,
      query_params: { fixtureTag: DEV_FIXTURE_TAG },
      format: "JSONEachRow",
    });
    const [existingCountRow] = await existingCountResult.json<{ n: string }>();
    const existingCount = Number(existingCountRow?.n ?? 0);
    if (existingCount > 0) {
      logger.info("articles already populated with real data, no-op", { existingCount });
      return { skipped: true, existingCount };
    }

    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const byUrl = new Map<string, { article: GdeltArticle; topics: Set<string> }>();
    const perTopicFetched: Record<string, number> = {};

    for (const { topic, query } of SEED_QUERIES) {
      const articles = await fetchGdeltQuery(query);
      perTopicFetched[topic] = articles.length;
      logger.info("fetched GDELT topic", { topic, count: articles.length });

      for (const article of articles) {
        const existing = byUrl.get(article.url);
        if (existing) {
          existing.topics.add(topic);
        } else {
          byUrl.set(article.url, { article, topics: new Set([topic]) });
        }
      }

      // Be a polite citizen of GDELT's rate limit between the 4-5 queries.
      await new Promise((r) => setTimeout(r, 2000));
    }

    let skippedOld = 0;
    let skippedUnmappedCountry = 0;
    const countriesSeen = new Set<string>();
    const rows: Array<{
      id: string;
      title: string;
      url: string;
      published_at: string;
      tags: string[];
      country_code: string;
      latitude: number;
      longitude: number;
      tone: number;
    }> = [];

    for (const { article, topics } of byUrl.values()) {
      const publishedAt = parseGdeltDate(article.seendate);
      if (Number.isNaN(publishedAt.getTime()) || publishedAt < cutoff) {
        skippedOld += 1;
        continue;
      }

      const country = COUNTRY_LOOKUP[article.sourcecountry];
      if (!country) {
        skippedUnmappedCountry += 1;
        continue;
      }

      const tags = Array.from(new Set([...deriveTags(article.title), ...topics]));

      rows.push({
        id: randomUUID(),
        title: article.title,
        url: article.url,
        published_at: publishedAt.toISOString(),
        tags,
        country_code: country.code,
        latitude: country.lat,
        longitude: country.lon,
        // GDELT DOC 2.0 (unlike GKG) returns no sentiment/tone field —
        // left at a neutral 0 rather than fabricating a score. See
        // docs/14 Engineering Handoff.md for this documented limitation.
        tone: 0,
      });
      countriesSeen.add(country.code);
    }

    if (rows.length > 0) {
      await clickhouse.insert({ table: "articles", values: rows, format: "JSONEachRow" });
    }

    const summary = {
      totalInserted: rows.length,
      perTopicFetched,
      skippedOld,
      skippedUnmappedCountry,
      distinctCountries: countriesSeen.size,
      countries: Array.from(countriesSeen).sort(),
    };
    logger.info("seed-gdelt complete", summary);

    return { skipped: false, ...summary };
  },
});
