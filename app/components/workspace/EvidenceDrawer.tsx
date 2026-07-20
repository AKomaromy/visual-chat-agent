"use client";

import { useEffect, useRef } from "react";
import type { EvidenceItem } from "@/lib/visual-response";

/**
 * Evidence Drawer — fifth of the fixed Demo Contract view order
 * (docs/13 Demo Contract.md §5), "opens on selection." Renders only
 * fields already present on the manifest's evidence entries — title,
 * source, date, location, relevance context, url — nothing computed
 * here (docs/09 Sprint Plan.md Task 5's "no fabricated visualization
 * values" carries over to this view). The outbound article URL is a
 * secondary "view source" link, not the primary evidence display, so one
 * dead link during the demo can't break "every claim has evidence"
 * (docs/12 Scope Gate.md §7.4).
 */
export function EvidenceDrawer({
  items,
  hadSelectionWithNoEvidence,
  onClose,
}: {
  items: EvidenceItem[];
  hadSelectionWithNoEvidence: boolean;
  onClose: () => void;
}) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <section
      aria-label="Evidence"
      className="rounded-lg border border-neutral-800 bg-neutral-900/90 p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-400">Evidence</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          className="rounded px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200"
        >
          Close
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          {hadSelectionWithNoEvidence
            ? "This selection isn't one of the top-ranked signals, so no detailed evidence is loaded for it — see Impact Radar for the signals with full evidence."
            : "Select a signal, timeline bar, or map point to see its evidence."}
        </p>
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((item) => (
            <li key={item.id} className="rounded border border-neutral-800 p-3">
              <p className="text-sm font-medium text-neutral-100">{item.title}</p>
              <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-neutral-400 sm:grid-cols-4">
                <div>
                  <dt className="text-neutral-600">Source</dt>
                  <dd className="text-neutral-300">{item.source}</dd>
                </div>
                <div>
                  <dt className="text-neutral-600">Date</dt>
                  <dd className="text-neutral-300">
                    {new Date(item.publishedAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </dd>
                </div>
                {item.location && (
                  <div>
                    <dt className="text-neutral-600">Location</dt>
                    <dd className="text-neutral-300">{item.location}</dd>
                  </div>
                )}
                <div>
                  <dt className="text-neutral-600">Source link</dt>
                  <dd>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-400 underline underline-offset-2 hover:text-blue-300"
                    >
                      View source
                    </a>
                  </dd>
                </div>
              </dl>
              {item.relevanceContext && (
                <p className="mt-2 text-xs italic text-neutral-500">{item.relevanceContext}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
