/**
 * Reserved tag marking rows inserted by trigger/load-dev-fixtures.ts.
 * Never present on real GDELT-sourced rows (seed-gdelt's own tag
 * vocabulary, lib/tags.ts, has no overlapping value) — used so
 * seed-gdelt's no-op guard can tell fixture rows apart from real seed
 * data (docs/14 Engineering Handoff.md, Task 5 dev-fixtures note).
 */
export const DEV_FIXTURE_TAG = "dev-fixture";
