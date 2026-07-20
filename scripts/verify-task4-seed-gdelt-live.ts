/**
 * Re-run this once GDELT's API is reachable again (docs/11 Risks.md R-05)
 * to complete Task 4's live acceptance test.
 *
 * Requires TRIGGER_PROD_SECRET_KEY in .env.local. Run with:
 *
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/verify-task4-seed-gdelt-live.ts
 *
 * Before running: sanity-check GDELT is actually back —
 *   curl "https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json"
 * — no point spending a run against a still-down API.
 *
 * Note: if dev fixtures (trigger/load-dev-fixtures.ts) are still loaded,
 * seed-gdelt's no-op guard only counts non-fixture rows, so this will
 * still attempt a real seed rather than skipping — but the resulting
 * `articles` table will contain both real and fixture rows together.
 * Clear fixtures first with `tasks.trigger("load-dev-fixtures", { clear: true })`
 * if a clean real-data-only table is wanted before recording the demo.
 *
 * Triggers seed-gdelt against Trigger.dev Cloud `prod` and checks the
 * result against docs/13 Demo Contract.md §4's thresholds.
 */
import { configure, tasks, runs } from "@trigger.dev/sdk";

configure({ accessToken: process.env.TRIGGER_PROD_SECRET_KEY });

interface SeedSummary {
  skipped: boolean;
  existingCount?: number;
  totalInserted?: number;
  distinctCountries?: number;
  countries?: string[];
  perTopicFetched?: Record<string, number>;
}

async function main() {
  const handle = await tasks.trigger("seed-gdelt", {});
  console.log("Triggered run id:", handle.id);

  let run = await runs.retrieve(handle.id);
  // Poll on `finishedAt` being set, not on hand-enumerated status strings
  // or the SDK's isCompleted/isSuccess/isFailed booleans — confirmed live
  // that those all stay `false` for a genuinely terminal TIMED_OUT run
  // (a real one hit while writing this script: MAX_DURATION_EXCEEDED,
  // finishedAt set, every is* boolean still false). finishedAt is the
  // one field that's reliably non-null for every terminal outcome.
  while (!run.finishedAt) {
    await new Promise((r) => setTimeout(r, 3000));
    run = await runs.retrieve(handle.id);
    console.log("status:", run.status);
  }

  console.log("Final status:", run.status);
  if (run.status !== "COMPLETED") {
    console.log("Error:", JSON.stringify(run.error, null, 2));
    console.log("Task 4 still blocked — if this is a ConnectTimeoutError to api.gdeltproject.org, GDELT is still down.");
    process.exit(1);
  }

  const summary = run.output as SeedSummary;
  console.log("Output:", JSON.stringify(summary, null, 2));

  if (summary.skipped) {
    console.log(`articles already has ${summary.existingCount} real rows — nothing to verify against thresholds this run.`);
    return;
  }

  const checks = {
    "≥150 articles": (summary.totalInserted ?? 0) >= 150,
    "≥5 distinct countries": (summary.distinctCountries ?? 0) >= 5,
  };
  console.log("Demo Contract §4 threshold checks:", checks);

  const allPassed = Object.values(checks).every(Boolean);
  if (!allPassed) {
    console.log("Task 4 completed but did not meet Demo Contract §4 thresholds — adjust seed queries before proceeding.");
    process.exit(1);
  }
  console.log("Task 4 live acceptance test PASSED (row/country thresholds). Still do the manual diversity check by hand (docs/12 Scope Gate.md §7.2) before marking Task 4 fully done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
