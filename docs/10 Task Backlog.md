# 10 — Task Backlog

**Status:** Trimmed, engineering-ready backlog for the ~15–20 hour scope defined in `12 Scope Gate.md`. Replaces the prior multi-workflow, multi-tool backlog. Everything here maps directly onto `09 Sprint Plan.md`'s five ordered tasks and six sessions.
**Companion documents:** `05 Architecture.md`/`06 Data.md`/`07 Tech Stack.md` for full-scope technical reference (read through the `12 Scope Gate.md` filter — most of their detail exceeds this build's scope), `09 Sprint Plan.md`
**Current implementation status:** see `docs/14 Engineering Handoff.md` for the authoritative, up-to-date state (commit hashes, verified tests, exact next step). The status notes inline below (WF-A, `getBriefing`, schema) are kept current but the Handoff doc is the single source of truth if anything here goes stale.

---

## 1. Trigger.dev workflows (two, not ten)

### WF-A — `mirror-agent` (`chat.agent()`)
**Key:** stable `chatId`. **Responsibilities:** maintain the conversation; call the one combined analytical tool (§2); stream progress and the compact manifest; validate and persist it; return an artifact reference. **Retry:** transient model/tool failures only. **Idempotency:** turn ID prevents duplicate artifact creation.

**Status: 🟡 implemented at `trigger/chat.ts`, deployed live to Trigger.dev Cloud (`prod`), not yet run live.** `chatId` keying comes from `useChat({ id: chatId })` in `app/components/chat.tsx` (`${profileId}-chat`), not a separate idempotency key yet. Artifact persistence (writing to the `artifacts` table) is not implemented — that lands with Task 5, once the `articles`/`artifacts` tables exist (Task 3, done). Model provider swapped from Anthropic to OpenAI (`gpt-4o`) after the Anthropic org behind this project's key was disabled — see `docs/11 Risks.md` R-22. Blocked on `OPENAI_API_KEY`, which isn't set anywhere yet — see `docs/14 Engineering Handoff.md`.

### WF-B — `seed-gdelt`
**Status: 🟡 implemented at `trigger/seed-gdelt.ts`, deployed live to Trigger.dev Cloud (`prod`), blocked only on `CLICKHOUSE_*` not yet being set in that Cloud environment — see `docs/14 Engineering Handoff.md` §7.**
**Type:** manually triggered/replayable, run once before the demo (and again any time the seed needs refreshing). **Responsibilities:** run **3–5 distinct GDELT DOC 2.0 API queries** on deliberately different topics (not one narrow query — a single-topic seed can't demonstrate personalization differentiation, see `12 Scope Gate.md` §7.2); derive a lightweight keyword tag list per article from its title (do not attempt to parse GDELT's GKG feed — it's a dense, undocumented-to-us format and the DOC 2.0 API's simpler JSON is sufficient, see `12 Scope Gate.md` §7.1); compute `h3_r5` from `sourcecountry`; batch-insert into `articles`. **Idempotency:** no-op if `articles` already has rows — a one-time seed load doesn't need per-row fingerprint deduplication (`12 Scope Gate.md` §7.3); re-seeding from scratch is a manual truncate.

That's the complete Trigger.dev surface for this build. Everything else in the original workflow catalogue (`schedule-gdelt`, `fetch-rss`, `normalize-locations` as a separate stage, `embed-chunks`, `score-relevance` as a separate async stage, `build-entity-edges`, `reconcile-pipeline`) is cut — its responsibilities are either folded into WF-B (location/H3 computation happens inline during normalization) or into the WF-A tool itself (relevance scoring happens synchronously, at query time, not as a separate precomputed stage).

---

## 2. Agent tool (one, not seven)

### `getBriefing`
**Input:** the user's question (used only for logging/intent — there's one response pattern, so no routing decision is needed) + the active `profileId`.
**Responsibilities:** run the ranked-signal query (keyword-tag match between `profile_cards` labels and `articles.tags` + recency decay + coarse geo boost → ranked list with evidence article IDs); run the time-bucketed count query; run the H3-aggregated count query. Return all three as one compact structure the composer turns into the manifest.
**Must not return:** raw ClickHouse rows, hidden profile internals, or a relevance number that doesn't trace to the three stored factors above.

If the combined payload risks the ~1 MiB Trigger.dev stream-record limit (unlikely at seed-data scale, but check), split into `getSignals` + `getMapData` rather than adding a third unrelated tool.

**Status: 🟡 implemented as a fixture at `trigger/chat.ts` (`getBriefing`), not yet real.** Input is currently `{ profileId }` only (no free-text question passed through, since there's one response pattern - matches the spec above). `execute` returns one of two hard-coded manifests keyed by `"profile-a"`/`"profile-b"`, matching Demo Contract §2-3. **Task 5 replaces only the inside of `execute`** with the real ranked-signal/timeline/H3 queries described above - the tool's input/output shape is already final.

---

## 3. Manifest (simplified)

**Envelope:** protocol version; artifact ID; verdict; profile ID; views (exactly: `impactRadar`, `timeline`, `map`); evidence; created-at.

**Renderer order:** (1) Impact Radar, (2) Timeline, (3) Map, (4) Evidence Drawer (always available, not a competing "view").

**Validation:** structural schema check → every ranked/plotted item has a resolvable evidence article ID → map is only included if at least a handful of items have valid coordinates → persist, then stream the reference. This is a small fraction of the original five-stage validation pipeline — the missing stages (renderer-compatibility versioning, semantic-policy checks for four response patterns) have no job to do with one response pattern and three view types.

**Status: 🟡 schema implemented at `lib/visual-response.ts` (`visualResponseManifestSchema`), validation and persistence not yet wired.** The Zod schema matches the envelope above exactly. What's not yet built: the "every item has a resolvable evidence article ID" check, the map-inclusion threshold check, and persistence to the `artifacts` table (all pending Task 3/5, since there's no `articles`/`artifacts` table to validate against or persist to yet).

---

## 4. Schema (three tables, not the full raw/core/mart/ops/ref/cdc layering)

1. **`articles`** — id, title, url, published_at, `tags` (array of strings — keyword-derived at ingestion, not GDELT's own theme/entity codes, see `12 Scope Gate.md` §7.1), country_code, latitude, longitude, `h3_r5` (computed at insert time), tone. Plain `MergeTree`, no fingerprint column needed (§1 above).
2. **`profile_cards`** — profile_id, card_id, label, item_type (goal/interest/entity/location), weight, created_at.
3. **`artifacts`** — id, profile_id, question, manifest_json, created_at.

No `raw`/`core`/`mart` layer separation, no `ops.*` telemetry tables, no `ref.geonames_*` tables (GDELT's own country/lat-long fields are used directly — no admin-level normalization join), no CDC tables (there's no Postgres to replicate from). If Stage B's vector-retrieval stretch item is attempted, add an `embedding` column to `articles` then — not before.

**Status: ✅ done (Task 3), passed live.** All three tables exist in the ClickHouse Cloud service, created by `trigger/init-schema.ts` (idempotent — `CREATE TABLE IF NOT EXISTS`). `h3_r5` on `articles` is a `MATERIALIZED` column (`geoToH3(longitude, latitude, 5)`), computed by ClickHouse itself at insert time, not by application code. `item_type` on `profile_cards` is an `Enum8` over the four allowed values. The scratch table `_scratch_connectivity_check` (Task 1's diagnostic, unrelated to the product schema) still exists alongside them — unchanged, still harmless.

---

## 5. Build order

Reordered per the pre-implementation design review (`12 Scope Gate.md` §7.6) — the `chat.agent()` skeleton comes second, before schema or seed work, because it's the highest-uncertainty piece and has no dependency on either.

1. ✅ `mirror-agent` skeleton with a fixture manifest (Task 2) — code complete and deployed to Trigger.dev Cloud (`prod`), live model-call test pending (`ANTHROPIC_API_KEY`).
2. ✅ `articles`, `profile_cards`, `artifacts` tables, including the H3 known-coordinate sanity check (Task 3) — passed live.
3. 🟡 `seed-gdelt` task across 4 topically diverse queries (Task 4) — code complete and deployed to Trigger.dev Cloud (`prod`), live run pending `CLICKHOUSE_*` being set in that Cloud environment (see `docs/14 Engineering Handoff.md` §7). The manual keyword-diversity check still needs to happen once a live run produces data.
4. `profile_cards` seed rows for Profile A (via paste-extraction) and Profile B (pre-seeded fixture).
5. `getBriefing` tool wired to real queries, replacing the fixture (Task 5).
6. Impact Radar, Timeline, Map renderers + Evidence Drawer — the drawer renders from the stored title/domain/date, with the outbound article URL as a secondary link, so one dead external link during the demo can't break the "every claim has evidence" requirement (`12 Scope Gate.md` §7.4).
7. Coordinated selection/filtering across the three renderers.

Do not build anything not on this list before the two-profile flow works end to end.

---

## 6. Testing (what actually matters at this scope)

Skip the full contract/unit/integration/evaluation-suite/golden-Playwright-flow matrix from the full-scope plan — there isn't budget for automated test infrastructure at 15–20 hours, and a five-minute demo doesn't need it. Do these instead, manually, before recording:

- Run the two-profile flow (`08 MVP.md` §4) three times consecutively against the real deployment.
- Refresh the browser mid-stream once; confirm the conversation isn't lost.
- Spot-check three ranked items against the raw `articles` table to confirm the data isn't fabricated.
- Confirm every ranked/plotted item opens real evidence in the drawer.
- Try one nonsense question ("what's the weather") and confirm it fails gracefully (a "no material signals" state, not a crash).

---

## 7. Failure recovery (trimmed to what can actually happen at this scope)

| Failure | Response |
|---|---|
| `seed-gdelt` fails partway | Re-run it — the fingerprint check (§1) prevents duplicates; the demo only needs it to succeed once, well before recording |
| `chat.agent()` turn fails | Preserve whatever partial state exists; let the user resubmit; this is rare enough at demo scale that a clean resubmit is an acceptable answer |
| ClickHouse query returns zero rows | Render a "no material signals" empty state, not a blank screen or a fabricated answer |
| Map has no valid coordinates for the current result set | Omit the map view for that turn; Radar, Timeline, and Evidence still render |

The original runbook's GDELT-outage, embedding-failure, geocoding-failure, Postgres/CDC-failure, and realtime-disconnect-mid-stream entries don't apply: there's no live GDELT dependency during the demo (seed data is pre-loaded), no embeddings, no geocoder, and no Postgres.

---

## 8. Security checklist (trimmed — no auth means no tenancy checklist)

- [ ] Secrets (ClickHouse credentials, Trigger.dev keys, LLM API key) are in environment variables, never committed or exposed in the browser bundle.
- [ ] The model cannot execute arbitrary SQL — the tool only runs the fixed, parameterized query in `getBriefing`.
- [ ] Source content (GDELT titles/themes) is treated as untrusted text passed to the model, never as instructions.
- [ ] A basic rate/size limit exists on the chat endpoint so a pathological input can't trigger an unbounded ClickHouse scan.

The original checklist's cross-tenant-access, artifact-ownership, and admin-role items don't apply — there's no auth or multi-tenancy in this build (`12 Scope Gate.md` §4), and that trade is documented in the README, not hidden.

---

## 9. Deployment checklist

**Before demo recording:** `seed-gdelt` has been run against the production ClickHouse service; both profiles (A extracted, B pre-seeded) exist; environment variables are set in Vercel and Trigger.dev Cloud; the map style/tile domain is reachable from the deployed environment.

**After deploying:** run the two-profile flow once against production exactly as it will be recorded; refresh mid-stream once; confirm no secrets appear in the browser network tab.

**Rollback:** Vercel rollback to the prior deployment; re-run `seed-gdelt` if the ClickHouse table was accidentally altered — it's additive/idempotent by design (§1), so this is low-risk.

---

## 10. README requirements (unchanged in spirit, trimmed in content)

**Must include:** one-sentence product description; a screenshot/GIF of the two-profile comparison; ClickHouse's exact role; Trigger.dev's exact role; local setup; required environment variables by name; how to run `seed-gdelt`; **an honest, explicit "Scope and limitations" section** listing the `12 Scope Gate.md` §4 cuts (no auth, no second database, three view types not four, structured filtering not vector search) — this section is not a weakness to hide; it demonstrates the team understood its constraints and made deliberate, defensible trade-offs under real time pressure.

**Must not include:** proprietary code, credentials, copyrighted article bodies, generated build artifacts not needed for review.

---

## 11. Source notes

Trimmed from the prior `10 Task Backlog.md` per `12 Scope Gate.md`, then corrected following the pre-implementation engineering design review (`12 Scope Gate.md` §7): the GDELT source assumption changed from GKG to DOC 2.0 API + keyword tagging, per-row ingestion idempotency was deleted in favor of a table-populated check, and the build order was resequenced to prove `chat.agent()` before schema/seed work. Ten Trigger.dev workflows become two; seven agent tools become one (with a documented two-tool fallback); the six-layer ClickHouse schema becomes three tables; the tenancy-heavy security checklist is cut to what's actually applicable without auth. The prior document's full content remains the correct reference for the post-hackathon, full-team, multi-day build described in `09 Sprint Plan.md` (previous revision, preserved in git history) and `01 Vision.md`'s expansion sequence.
