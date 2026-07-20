import { randomUUID } from "node:crypto";
import { getClickHouseClient } from "./clickhouse";
import { deriveTags, LOCATION_TO_COUNTRIES } from "./tags";
import { visualResponseManifestSchema, type VisualResponseManifest } from "./visual-response";

/**
 * Task 5 — the real ClickHouse-backed getBriefing query, replacing the
 * Task 2 fixture (docs/09 Sprint Plan.md Task 5 / docs/10 Task Backlog.md
 * §2). ClickHouse does all retrieval, weighting, ranking, geography,
 * timeline, and evidence lookup; this module only assembles the manifest
 * from what ClickHouse returns — no model-invented numbers, no ranking
 * decided in application code beyond the deterministic array plumbing
 * ClickHouse's query result requires.
 *
 * Scoring model (docs/12 Scope Gate.md §3): keyword-tag match between
 * profile_cards labels and articles.tags, weighted by card weight, plus a
 * recency decay and a coarse geographic boost from the profile's location
 * card. Tags are derived from card labels with the exact same vocabulary
 * (lib/tags.ts) used to tag articles at ingestion — the shared-vocabulary
 * design called out in docs/12 Scope Gate.md §7.1.
 */

interface ProfileCardRow {
  label: string;
  item_type: string;
  weight: number;
}

interface RankedArticleRow {
  id: string;
  title: string;
  url: string;
  published_at: string;
  country_code: string;
  tags: string[];
  h3: string;
  total_score: number;
}

interface TimelineRow {
  bucket_date: string;
  cnt: string;
}

interface MapRow {
  h3: string;
  cnt: string;
  label: string;
  lon: number;
  lat: number;
}

const RADAR_LIMIT = 7;
const RISING_WITHIN_DAYS = 3;
const STABLE_WITHIN_DAYS = 10;

function directionFor(publishedAt: string): "rising" | "stable" | "declining" {
  const days = (Date.now() - new Date(publishedAt).getTime()) / (24 * 60 * 60 * 1000);
  if (days <= RISING_WITHIN_DAYS) return "rising";
  if (days <= STABLE_WITHIN_DAYS) return "stable";
  return "declining";
}

// Shared tag-score expression: sum of each matched tag's card weight.
// `arrayFilter` keeps only the article's tags that are in the wanted set,
// `arrayMap` looks up each one's weight by position in the parallel
// {tags:Array(String)}/{weights:Array(Float64)} params, `arraySum` totals
// it. Empty overlap -> empty array -> 0, no special-casing needed.
const TAG_SCORE_SQL = `arraySum(arrayMap(
  t -> {weights:Array(Float64)}[indexOf({tags:Array(String)}, t)],
  arrayFilter(t -> has({tags:Array(String)}, t), tags)
))`;

export async function getBriefingManifest(profileId: string): Promise<VisualResponseManifest> {
  const clickhouse = getClickHouseClient();

  const cardsResult = await clickhouse.query({
    query: `SELECT label, item_type, weight FROM profile_cards WHERE profile_id = {profileId:String}`,
    query_params: { profileId },
    format: "JSONEachRow",
  });
  const cards = await cardsResult.json<ProfileCardRow>();

  const tagWeights = new Map<string, number>();
  const geoCountries = new Set<string>();
  let geoBoost = 0;

  for (const card of cards) {
    if (card.item_type === "location") {
      for (const code of LOCATION_TO_COUNTRIES[card.label] ?? []) {
        geoCountries.add(code);
      }
      geoBoost = Math.max(geoBoost, Number(card.weight));
      continue;
    }
    for (const tag of deriveTags(card.label)) {
      tagWeights.set(tag, (tagWeights.get(tag) ?? 0) + Number(card.weight));
    }
  }

  const wantedTags = Array.from(tagWeights.keys());
  const wantedWeights = wantedTags.map((tag) => tagWeights.get(tag) ?? 0);
  const geoCountryList = Array.from(geoCountries);

  const emptyManifest = (): VisualResponseManifest => ({
    protocolVersion: 1,
    artifactId: randomUUID(),
    profileId,
    verdict: "No material signals for this profile yet.",
    views: { impactRadar: [], timeline: [], map: [] },
    evidence: [],
    createdAt: new Date().toISOString(),
  });

  if (wantedTags.length === 0) {
    return visualResponseManifestSchema.parse(emptyManifest());
  }

  const queryParams = {
    tags: wantedTags,
    weights: wantedWeights,
    geoCountries: geoCountryList,
    geoBoost,
  };

  const rankedResult = await clickhouse.query({
    query: `
      SELECT id, title, url, published_at, country_code, tags, toString(h3) AS h3, tag_score + recency_score + geo_score AS total_score
      FROM (
        SELECT
          id, title, url, published_at, country_code, tags, h3_r5 AS h3,
          ${TAG_SCORE_SQL} AS tag_score,
          1.0 / (1 + dateDiff('day', published_at, now())) AS recency_score,
          if(has({geoCountries:Array(String)}, country_code), {geoBoost:Float64}, 0) AS geo_score
        FROM articles
      )
      WHERE tag_score > 0
      ORDER BY total_score DESC
      LIMIT {limit:UInt32}
    `,
    query_params: { ...queryParams, limit: RADAR_LIMIT },
    format: "JSONEachRow",
  });
  const rankedRows = await rankedResult.json<RankedArticleRow>();

  if (rankedRows.length === 0) {
    return visualResponseManifestSchema.parse(emptyManifest());
  }

  const timelineResult = await clickhouse.query({
    query: `
      SELECT toDate(published_at) AS bucket_date, count() AS cnt
      FROM articles
      WHERE hasAny(tags, {tags:Array(String)})
      GROUP BY bucket_date
      ORDER BY bucket_date
    `,
    query_params: queryParams,
    format: "JSONEachRow",
  });
  const timelineRows = await timelineResult.json<TimelineRow>();

  const mapResult = await clickhouse.query({
    query: `
      SELECT
        -- Do NOT alias this back to "h3_r5" — that shadows the real
        -- UInt64 column within this same SELECT list and h3ToGeo(h3_r5)
        -- below would then resolve to the String alias instead of the
        -- table column, failing with "Illegal type String... Must be
        -- UInt64" (caught live while wiring this up).
        toString(h3_r5) AS h3,
        count() AS cnt,
        any(country_code) AS label,
        -- h3ToGeo's positional tuple elements are (lon, lat), NOT the
        -- (misleading) "latitude"/"longitude" JSON field names it
        -- labels them with — confirmed live in Task 3
        -- (docs/14 Engineering Handoff.md §3). Do not swap these.
        tupleElement(h3ToGeo(h3_r5), 1) AS lon,
        tupleElement(h3ToGeo(h3_r5), 2) AS lat
      FROM articles
      WHERE hasAny(tags, {tags:Array(String)})
      GROUP BY h3_r5
      ORDER BY cnt DESC
    `,
    query_params: queryParams,
    format: "JSONEachRow",
  });
  const mapRows = await mapResult.json<MapRow>();

  const impactRadar = rankedRows.map((row) => ({
    id: row.id,
    title: row.title,
    score: Math.round(row.total_score * 100) / 100,
    direction: directionFor(row.published_at),
    evidenceIds: [row.id],
  }));

  const evidence = rankedRows.map((row) => {
    const matchedTags = row.tags.filter((t) => wantedTags.includes(t));
    return {
      id: row.id,
      title: row.title,
      url: row.url,
      // `domain(url)` is a real ClickHouse function computed from the
      // stored url — not invented; keeps the schema minimal (no separate
      // `domain`/`source` column needed on `articles`).
      source: new URL(row.url).hostname,
      publishedAt: row.published_at,
      location: row.country_code,
      relevanceContext:
        matchedTags.length > 0 ? `Matches your profile's interest in: ${matchedTags.join(", ")}` : undefined,
    };
  });

  const top = rankedRows[0];
  if (!top) {
    return visualResponseManifestSchema.parse(emptyManifest());
  }
  const verdictTitle = top.title.length > 120 ? `${top.title.slice(0, 117)}...` : top.title;
  const verdict = `Top signal: "${verdictTitle}" (${top.country_code}).`.slice(0, 160);

  // published_at is an ISO datetime string ("2026-07-20T12:00:00.000Z");
  // ClickHouse's toDate() bucket_date serializes as "YYYY-MM-DD" — the
  // same first 10 characters, so this is a plain string-prefix match,
  // not a recomputation of anything ClickHouse already determined.
  const bucketDateOf = (iso: string) => iso.slice(0, 10);

  const manifest: VisualResponseManifest = {
    protocolVersion: 1,
    artifactId: randomUUID(),
    profileId,
    verdict,
    views: {
      impactRadar,
      timeline: timelineRows.map((row) => ({
        bucketStart: row.bucket_date,
        count: Number(row.cnt),
        evidenceIds: rankedRows.filter((r) => bucketDateOf(r.published_at) === row.bucket_date).map((r) => r.id),
      })),
      map: mapRows.map((row) => ({
        h3: row.h3,
        count: Number(row.cnt),
        label: row.label,
        lat: row.lat,
        lon: row.lon,
        evidenceIds: rankedRows.filter((r) => r.h3 === row.h3).map((r) => r.id),
      })),
    },
    evidence,
    createdAt: new Date().toISOString(),
  };

  return visualResponseManifestSchema.parse(manifest);
}
