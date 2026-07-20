import type { TimelineBucket, WorkspaceSelection } from "./types";
import { intersects } from "./types";

function formatBucketLabel(bucketStart: string): string {
  const date = new Date(`${bucketStart}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return bucketStart;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", timeZone: "UTC" });
}

/**
 * Timeline — third of the fixed Demo Contract view order (docs/13 Demo
 * Contract.md §5). A plain bar chart (docs/04 Visual Language.md §6) —
 * hand-rolled with CSS, not a charting library. The data is a handful of
 * daily buckets from a seed-scale dataset; a dependency buys nothing here
 * that a dozen divs don't already do more reliably (docs/09 Sprint
 * Plan.md's "simplest reliable" instruction).
 */
export function Timeline({
  buckets,
  selection,
  onSelect,
}: {
  buckets: TimelineBucket[];
  selection: WorkspaceSelection | null;
  onSelect: (next: WorkspaceSelection) => void;
}) {
  if (buckets.length === 0) return null;

  const maxCount = Math.max(...buckets.map((b) => b.count));
  // Explicit pixel heights, not percentages: the bars sit inside a flex
  // row that bottom-aligns children of differing (label) height, which
  // means children don't stretch to fill it — a percentage-height bar
  // then has no reference frame and collapses to 0 (caught live via a
  // headless-browser check, not assumed).
  const BAR_AREA_PX = 100;

  return (
    <section aria-label="Timeline — signal volume by day">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Timeline</h2>
      <div
        className="flex items-end gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900/60 p-3"
        style={{ height: BAR_AREA_PX + 40 }}
      >
        {buckets.map((bucket) => {
          const key = `timeline:${bucket.bucketStart}`;
          const isActive = selection?.key === key;
          const evidenceIds = bucket.evidenceIds ?? [];
          const isHighlighted = !isActive && !!selection && intersects(selection.evidenceIds, evidenceIds);
          const barHeightPx = Math.max(4, Math.round((bucket.count / maxCount) * BAR_AREA_PX));

          return (
            <button
              key={bucket.bucketStart}
              type="button"
              onClick={() => onSelect({ key, evidenceIds })}
              aria-pressed={isActive}
              aria-label={`${formatBucketLabel(bucket.bucketStart)}: ${bucket.count} signals`}
              className="group flex flex-1 flex-col items-center justify-end gap-1"
            >
              <span
                className={`w-full rounded-t transition-colors ${
                  isActive ? "bg-blue-500" : isHighlighted ? "bg-blue-500/60" : "bg-neutral-700 group-hover:bg-neutral-600"
                }`}
                style={{ height: barHeightPx }}
              />
              <span className="text-[10px] tabular-nums text-neutral-500">{bucket.count}</span>
            </button>
          );
        })}
      </div>
      <div className="mt-1 flex gap-1.5 px-3 text-[10px] text-neutral-600">
        {buckets.map((bucket) => (
          <span key={bucket.bucketStart} className="flex-1 text-center">
            {formatBucketLabel(bucket.bucketStart)}
          </span>
        ))}
      </div>
    </section>
  );
}
