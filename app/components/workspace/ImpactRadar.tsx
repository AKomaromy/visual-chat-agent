import type { ImpactRadarItem, WorkspaceSelection } from "./types";
import { intersects } from "./types";

const DIRECTION_LABEL: Record<ImpactRadarItem["direction"], { glyph: string; text: string }> = {
  rising: { glyph: "▲", text: "Rising" },
  stable: { glyph: "▬", text: "Stable" },
  declining: { glyph: "▼", text: "Declining" },
};

/**
 * Impact Radar — second of the fixed Demo Contract view order
 * (docs/13 Demo Contract.md §5). A sorted rank list (docs/04 Visual
 * Language.md §3: "Rank entities → sorted bars/lollipop", not unordered
 * cards) — ClickHouse's own ORDER BY total_score DESC decides the order,
 * this component never re-sorts. Direction is shown with a glyph + word,
 * never color alone (docs/03 UX.md §14).
 */
export function ImpactRadar({
  items,
  selection,
  onSelect,
}: {
  items: ImpactRadarItem[];
  selection: WorkspaceSelection | null;
  onSelect: (next: WorkspaceSelection) => void;
}) {
  if (items.length === 0) return null;

  const maxScore = Math.max(...items.map((i) => i.score));

  return (
    <section aria-label="Impact Radar — ranked signals">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Impact Radar</h2>
      <ol className="flex flex-col gap-1.5">
        {items.map((item, index) => {
          const key = `radar:${item.id}`;
          const isActive = selection?.key === key;
          const isHighlighted = !isActive && !!selection && intersects(selection.evidenceIds, item.evidenceIds);
          const direction = DIRECTION_LABEL[item.direction];

          return (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onSelect({ key, evidenceIds: item.evidenceIds })}
                aria-pressed={isActive}
                className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition-colors ${
                  isActive
                    ? "border-blue-500 bg-blue-500/10"
                    : isHighlighted
                      ? "border-blue-500/40 bg-neutral-900"
                      : "border-neutral-800 bg-neutral-900/60 hover:border-neutral-700"
                }`}
              >
                <span className="w-5 shrink-0 text-sm tabular-nums text-neutral-500">{index + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-neutral-100">{item.title}</span>
                </span>
                <span className="flex shrink-0 items-center gap-2">
                  <span
                    className="hidden h-1.5 w-16 overflow-hidden rounded-full bg-neutral-800 sm:block"
                    aria-hidden="true"
                  >
                    <span
                      className="block h-full rounded-full bg-blue-500"
                      style={{ width: `${Math.max(8, (item.score / maxScore) * 100)}%` }}
                    />
                  </span>
                  <span className="w-20 shrink-0 text-xs tabular-nums text-neutral-400">
                    <span aria-hidden="true">{direction.glyph} </span>
                    {direction.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
