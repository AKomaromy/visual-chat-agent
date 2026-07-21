"use client";

import { useState } from "react";
import type { VisualResponseManifest } from "@/lib/visual-response";
import type { WorkspaceSelection } from "./types";
import { VerdictStrip } from "./VerdictStrip";
import { ImpactRadar } from "./ImpactRadar";
import { Timeline } from "./Timeline";
import { WorldMap } from "./WorldMap";
import { EvidenceDrawer } from "./EvidenceDrawer";

/**
 * The visual workspace — renders exclusively from the validated manifest
 * produced by getBriefingManifest (lib/briefing.ts). No second data path:
 * every value shown here already exists on `manifest`, computed by
 * ClickHouse. This component only tracks *which* mark is selected and
 * looks up the evidence that selection already points to.
 *
 * Fixed Demo Contract view order at the semantic level (docs/13 Demo
 * Contract.md §5): Verdict Strip → Impact Radar → Timeline → Map →
 * Evidence Drawer. Laid out as Radar and Map side by side on wide
 * viewports (hostile-judge hardening pass — a Radar selection needs to
 * visibly coordinate with the Map without scrolling), Timeline directly
 * below both, Evidence Drawer directly below that. Each view renders
 * nothing rather than an empty frame when its own array is empty (handled
 * inside each component).
 */
export function Workspace({ manifest }: { manifest: VisualResponseManifest }) {
  const [selection, setSelection] = useState<WorkspaceSelection | null>(null);

  const hasAnyViews =
    manifest.views.impactRadar.length > 0 || manifest.views.timeline.length > 0 || manifest.views.map.length > 0;

  if (!hasAnyViews) {
    return (
      <div
        className="rounded-lg border border-neutral-800 bg-neutral-900/60 p-6 text-center text-sm text-neutral-400"
        role="status"
      >
        {manifest.verdict}
      </div>
    );
  }

  const evidenceById = new Map(manifest.evidence.map((e) => [e.id, e]));
  // Every real selection (a radar item, a timeline bucket, a map cell)
  // always resolves to at least one evidence entry now that lib/briefing.ts
  // builds `evidence` from the same population it counts (the earlier
  // "no evidence loaded for this selection" fallback is unreachable and
  // was removed with it — see docs/11 Risks.md).
  const selectedEvidence = selection
    ? selection.evidenceIds
        .map((id) => evidenceById.get(id))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
    : [];

  return (
    <div className="flex w-full flex-col gap-4">
      <VerdictStrip verdict={manifest.verdict} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[3fr_2fr] lg:items-start">
        <ImpactRadar items={manifest.views.impactRadar} selection={selection} onSelect={setSelection} />
        <WorldMap cells={manifest.views.map} selection={selection} onSelect={setSelection} />
      </div>
      <Timeline buckets={manifest.views.timeline} selection={selection} onSelect={setSelection} />
      {selection && <EvidenceDrawer items={selectedEvidence} onClose={() => setSelection(null)} />}
    </div>
  );
}
