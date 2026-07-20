"use client";

import { useMemo } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import type { FeatureCollection, Geometry } from "geojson";
import landTopology from "world-atlas/land-110m.json";
import type { MapCell, WorkspaceSelection } from "./types";
import { intersects } from "./types";

const WIDTH = 720;
const HEIGHT = 380;

/**
 * Map — fourth of the fixed Demo Contract view order (docs/13 Demo
 * Contract.md §5). H3-aggregated points (docs/06 Data.md §9) plotted on a
 * neutral landmass basemap (docs/04 Visual Language.md §4 — "neutral,
 * reduced-contrast basemap", coordinates already decoded server-side via
 * ClickHouse's h3ToGeo in lib/briefing.ts, never recomputed here.
 *
 * Basemap data is `world-atlas`'s bundled land-110m topology — offline,
 * no map-tile network dependency, so this never depends on a live
 * outbound fetch during the demo (the same reasoning docs/12 Scope
 * Gate.md §7.4 applied to the Evidence Drawer).
 */
export function WorldMap({
  cells,
  selection,
  onSelect,
}: {
  cells: MapCell[];
  selection: WorkspaceSelection | null;
  onSelect: (next: WorkspaceSelection) => void;
}) {
  const { landPath, project } = useMemo(() => {
    const topology = landTopology as unknown as Topology;
    const land = feature(topology, topology.objects.land as GeometryCollection) as unknown as FeatureCollection<Geometry>;
    const projection = geoNaturalEarth1().fitSize([WIDTH, HEIGHT], land);
    const path = geoPath(projection);
    return { landPath: path(land) ?? "", project: projection };
  }, []);

  if (cells.length === 0) return null;

  const maxCount = Math.max(...cells.map((c) => c.count));
  const plottable = cells.filter((c) => c.lat != null && c.lon != null);

  return (
    <section aria-label="Map — signal locations">
      <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-400">Map</h2>
      <div className="overflow-hidden rounded-lg border border-neutral-800 bg-neutral-900/60">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="World map with signal locations" className="w-full">
          <rect width={WIDTH} height={HEIGHT} fill="#0d0d13" />
          <path d={landPath} fill="#1c1c24" stroke="#2a2a33" strokeWidth={0.5} />
          {plottable.map((cell) => {
            const point = project([cell.lon as number, cell.lat as number]);
            if (!point) return null;
            const [x, y] = point;
            const key = `map:${cell.h3}`;
            const isActive = selection?.key === key;
            const evidenceIds = cell.evidenceIds ?? [];
            const isHighlighted = !isActive && !!selection && intersects(selection.evidenceIds, evidenceIds);
            const radius = 5 + 12 * (cell.count / maxCount);

            return (
              <circle
                key={cell.h3}
                cx={x}
                cy={y}
                r={radius}
                tabIndex={0}
                role="button"
                aria-pressed={isActive}
                aria-label={`${cell.label ?? "Unknown location"}: ${cell.count} signals`}
                onClick={() => onSelect({ key, evidenceIds })}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect({ key, evidenceIds });
                  }
                }}
                className="cursor-pointer outline-none focus-visible:stroke-blue-300 focus-visible:stroke-2"
                fill={isActive ? "#3b82f6" : isHighlighted ? "#3b82f699" : "#f59e0b99"}
                stroke={isActive ? "#93c5fd" : "none"}
                strokeWidth={isActive ? 2 : 0}
              />
            );
          })}
        </svg>
      </div>
    </section>
  );
}
