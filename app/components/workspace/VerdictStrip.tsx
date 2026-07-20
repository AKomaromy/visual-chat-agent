/**
 * Verdict Strip — first of the fixed Demo Contract view order
 * (docs/13 Demo Contract.md §5). One line, rendered exactly as returned
 * by getBriefingManifest; nothing here reformats or recomputes it.
 */
export function VerdictStrip({ verdict }: { verdict: string }) {
  return (
    <p className="text-balance text-lg font-medium text-neutral-100" role="status">
      {verdict}
    </p>
  );
}
