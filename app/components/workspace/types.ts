import type { VisualResponseManifest } from "@/lib/visual-response";

/**
 * Visual workspace — the shared coordination-bus contract (docs/03 UX.md
 * §5, trimmed to the "coordinated filtering" scope docs/12 Scope Gate.md
 * §3 actually calls for: select a signal, highlight/filter the other
 * views, open evidence). One selection drives all four views + the
 * drawer; nothing here computes a value ClickHouse didn't already
 * produce — it only decides what to emphasize.
 */
export interface WorkspaceSelection {
  /** Unique key of the clicked mark, e.g. "radar:<id>", "timeline:<bucketStart>", "map:<h3>". */
  key: string;
  /** Evidence ids (from manifest.evidence) this selection corresponds to. */
  evidenceIds: string[];
}

export type ImpactRadarItem = VisualResponseManifest["views"]["impactRadar"][number];
export type TimelineBucket = VisualResponseManifest["views"]["timeline"][number];
export type MapCell = VisualResponseManifest["views"]["map"][number];
export type { VisualResponseManifest };

export function intersects(a: string[], b: string[]): boolean {
  if (a.length === 0 || b.length === 0) return false;
  const set = new Set(a);
  return b.some((id) => set.has(id));
}
