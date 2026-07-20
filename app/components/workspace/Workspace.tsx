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
 * Fixed Demo Contract view order (docs/13 Demo Contract.md §5): Verdict
 * Strip → Impact Radar → Timeline → Map → Evidence Drawer (opens on
 * selection). Each view renders nothing rather than an empty frame when
 * its own array is empty (handled inside each component).
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
  const selectedEvidence = selection
    ? selection.evidenceIds
        .map((id) => evidenceById.get(id))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
    : [];
  const hadSelectionWithNoEvidence = !!selection && selection.evidenceIds.length === 0;

  return (
    <div className="flex w-full flex-col gap-4">
      <VerdictStrip verdict={manifest.verdict} />
      <ImpactRadar items={manifest.views.impactRadar} selection={selection} onSelect={setSelection} />
      <Timeline buckets={manifest.views.timeline} selection={selection} onSelect={setSelection} />
      <WorldMap cells={manifest.views.map} selection={selection} onSelect={setSelection} />
      {selection && (
        <EvidenceDrawer
          items={selectedEvidence}
          hadSelectionWithNoEvidence={hadSelectionWithNoEvidence}
          onClose={() => setSelection(null)}
        />
      )}
    </div>
  );
}
