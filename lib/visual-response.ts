import { z } from "zod";

/**
 * Mirror Visual Response Protocol (MVRP), trimmed to the three view types
 * approved for this build — see docs/05 Architecture.md ADR-004 and
 * docs/12 Scope Gate.md §3. No version-compatibility/migration logic: a
 * single ~15-20 hour build never has two manifest versions to reconcile
 * (docs/12 Scope Gate.md §7.5).
 */

export const evidenceItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  source: z.string(),
  publishedAt: z.string(),
  // Additive fields for the Evidence Drawer (visual-workspace build,
  // docs/13 Demo Contract.md §5) — both derived from stored columns
  // already on `articles` (country_code, tags), never invented.
  location: z.string().optional(),
  relevanceContext: z.string().optional(),
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const impactRadarItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number(),
  // Honest recency labeling, not a claimed trend/momentum computation —
  // this is purely how old the underlying article is (docs/11 Risks.md
  // R-41), never presented as "rising"/"declining" interest or volume.
  recency: z.enum(["new", "recent", "older"]),
  evidenceIds: z.array(z.string()),
});

export const timelineBucketSchema = z.object({
  bucketStart: z.string(),
  count: z.number(),
  // Which of the manifest's evidence items fall in this bucket — lets
  // selecting a timeline bar open the same Evidence Drawer a radar
  // signal would, per the coordinated-filtering requirement
  // (docs/12 Scope Gate.md §3). Computed server-side in lib/briefing.ts
  // from already-fetched rows, not a new ClickHouse query.
  evidenceIds: z.array(z.string()).optional(),
});

export const mapCellSchema = z.object({
  h3: z.string(),
  count: z.number(),
  label: z.string().optional(),
  // Decoded server-side via ClickHouse's h3ToGeo (docs/14 Engineering
  // Handoff.md §3 — confirmed (lon, lat) element order) so the map can
  // plot real points without any client-side geo computation.
  lat: z.number().optional(),
  lon: z.number().optional(),
  evidenceIds: z.array(z.string()).optional(),
});

export const visualResponseManifestSchema = z.object({
  protocolVersion: z.literal(1),
  artifactId: z.string(),
  profileId: z.string(),
  verdict: z.string().max(160),
  views: z.object({
    impactRadar: z.array(impactRadarItemSchema).max(7),
    timeline: z.array(timelineBucketSchema),
    map: z.array(mapCellSchema),
  }),
  evidence: z.array(evidenceItemSchema),
  createdAt: z.string(),
});
export type VisualResponseManifest = z.infer<typeof visualResponseManifestSchema>;
