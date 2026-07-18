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
});
export type EvidenceItem = z.infer<typeof evidenceItemSchema>;

export const impactRadarItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  score: z.number(),
  direction: z.enum(["rising", "stable", "declining"]),
  evidenceIds: z.array(z.string()),
});

export const timelineBucketSchema = z.object({
  bucketStart: z.string(),
  count: z.number(),
});

export const mapCellSchema = z.object({
  h3: z.string(),
  count: z.number(),
  label: z.string().optional(),
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
