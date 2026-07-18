# 09 — Sprint Plan

**Status:** Canonical implementation plan, replacing the prior seven-day/many-hours-per-day schedule. Budgeted for **~15–20 focused hours**, for one developer working around a full-time job and family. See `12 Scope Gate.md` for what was cut and why; this document is only about sequencing and acceptance criteria for what remains.
**Hard rule:** **Stage A must be fully deployable and demoable, end to end, before any Stage B work begins.** Not "mostly done" — deployable, and the two-profile comparison in `08 MVP.md` §4 passing at least once.

---

## 1. Two-stage structure

| Stage | Contents | Budget | Gate to enter |
|---|---|---:|---|
| **A — Vertical slice** | Every "Must Ship" item in `08 MVP.md` §2 | ~13–17h | N/A — start immediately |
| **B — Stretch** | The value-ranked list in `12 Scope Gate.md` §5 | Whatever remains, likely 0–3h | Stage A deployed, demoable, and the two-profile flow has passed at least once against the real deployment |

If you reach the end of the budget still inside Stage A, that is the expected outcome for a correctly-scoped plan, not a failure — Stage A alone fully satisfies the required story in `00 Executive Brief.md` §3 and `08 MVP.md` §1.

---

## 2. The first five implementation tasks, in exact order

These are the highest-leverage, most sequence-dependent tasks — do them in this order regardless of how the rest of the session plan (§3) gets split across days. Each proves or unblocks the next. **Revised order** (see `12 Scope Gate.md` §7.6): the `chat.agent()` fixture proof moved from position 4 to position 2, because it has zero dependency on the schema or seed data and is the single highest-uncertainty integration in the plan — it should be de-risked with the most runway left to react, not after two sessions of unrelated work are already sunk.

### Task 1 — Prove the platforms talk to each other

**Work:** provision the ClickHouse Cloud service and the Trigger.dev project; write and deploy one trivial Trigger.dev task that inserts a row into a scratch ClickHouse table and reads it back.

**Acceptance criteria:** a Trigger.dev task run completes successfully in the Trigger.dev dashboard; a `SELECT` against ClickHouse Cloud confirms the inserted row exists.

**Judging contribution:** de-risks the entire 25%-weighted Use of ClickHouse & Trigger.dev criterion before any other code is written — this is the one integration that, if broken, invalidates everything built afterward.

**Status: ✅ Passed live.** ClickHouse Cloud (Mini, 1 replica, ca-central-1) and Trigger.dev project `visual-chat-agent` (org Attentionic Inc.) are both provisioned and connected. Live run `run_cmrqqchcf692g0jomsjtyzk7t` completed with `confirmed: true` against real infrastructure — not a fixture.

---

### Task 2 — Prove the riskiest integration with a fixture, immediately

**Work:** build the `chat.agent()` skeleton end to end — a user submits a question in the browser, the agent run streams a **hard-coded but schema-valid** manifest (no real ClickHouse query yet, no schema beyond a scratch table), and the frontend renders it (even with placeholder Radar/Timeline/Map shells).

**Acceptance criteria:** submitting a question in the browser produces a streamed response that renders without error; refreshing the browser mid-conversation does not lose the session.

**Judging contribution:** `chat.agent()` is a recent, still-evolving SDK surface (`11 Risks.md` R-01) — the highest-uncertainty integration in the entire build. Proving it now, before any schema or seed-data work is sunk, is what makes the rest of the budget low-risk. If this task runs badly over estimate, that's exactly the signal to know on day one, not day five.

**Status: 🟡 Code complete, not yet run live.** `chat.agent()` (`mirror-agent`), the `getBriefing` tool with a two-profile fixture, both server actions, and the frontend chat page are written, committed, and pass typecheck/lint/build. Blocked on one credential (`ANTHROPIC_API_KEY`) before the actual model call can be exercised — see `docs/14 Engineering Handoff.md` for the exact next step.

---

### Task 3 — Lay down the minimum schema

**Work:** create three ClickHouse tables — `articles` (id, title, url, published_at, tags array — keyword-derived, not GDELT's own taxonomy, see `12 Scope Gate.md` §7.1 — country_code, lat, lon, `h3_r5`, tone), `profile_cards` (profile_id, label, weight, item_type), `artifacts` (id, profile_id, question, manifest JSON, created_at). Plain `MergeTree` — no versioning/replacing semantics needed at this scale (`12 Scope Gate.md` §7.3).

**Acceptance criteria:** migrations apply cleanly against the ClickHouse Cloud service from Task 1; an insert/select round-trip succeeds against all three tables; a row inserted with a known real-world city's coordinates produces an `h3_r5` value that decodes back to a cell containing that city (`12 Scope Gate.md` §7.4 — catches ClickHouse's non-standard H3 coordinate order now, not when the map renders wrong later).

**Judging contribution:** Technical Implementation (a clean, typed, purpose-built schema) and the direct substrate for every later Use-of-Stack claim.

**Status: ✅ Passed live.** `trigger/init-schema.ts` creates `articles`, `profile_cards`, `artifacts` (all plain `MergeTree`) and, in the same run, executes the acceptance checks. Live run `run_cmrqsolvs7xqk0pll42any3xp` completed with all four checks true: insert/select round trip on all three tables, and the H3 known-coordinate sanity check (New York City → `h3_r5` decodes back to a point ~15.95 km away, well inside the 25 km bound for an r5 cell). Test rows are deleted at the end of the task, so `articles` is empty and ready for Task 4's no-op check. Confirmed live: ClickHouse's `geoToH3`/`h3ToGeo` take `(longitude, latitude, ...)`, not `(lat, lon)` — see `docs/14 Engineering Handoff.md`.

---

### Task 4 — Build the resilient, replayable seed ingestion — and verify it can actually differentiate two profiles

**Work:** one Trigger.dev task that pulls **3–5 distinct GDELT DOC 2.0 API queries** on deliberately different topics (e.g., AI regulation, climate policy, markets, geopolitics — not one narrow query, see `12 Scope Gate.md` §7.2), derives lightweight keyword tags from each title, computes `h3_r5` from `sourcecountry`, and batch-inserts into `articles`. Run it once. The task no-ops if `articles` is already populated (no per-row fingerprinting needed — `12 Scope Gate.md` §7.3).

**Acceptance criteria:** running the task inserts a real, topically-diverse set of rows (a few hundred is plenty); running it again does not duplicate rows. **Then, before writing any tool or UI code:** run the intended relevance filter by hand in the ClickHouse console for a rough Profile-A keyword set and a rough Profile-B keyword set, and confirm the top results actually differ (`12 Scope Gate.md` §7.2). If they don't, fix the seed-query topic spread or the tagging approach now — not during Session 6 rehearsal.

**Judging contribution:** proves "Trigger.dev orchestrates a durable ingestion workflow" (25%), delivers the resilient seed data the demo depends on (Presentation), and the manual diversity check directly protects the single most important 40 seconds of the demo — the two-profile comparison that carries the entire Innovation score (20%).

---

### Task 5 — Replace the fixture with the real, ClickHouse-backed answer

**Work:** implement the combined analytical tool — one query (or two, if payload size forces a split) that returns a tag/keyword/recency/geo-weighted ranked list, time-bucketed counts, and H3-aggregated counts, each item carrying an evidence reference (article ID) — and wire it into the agent in place of the Task 2 fixture.

**Acceptance criteria:** asking "What should I know today?" returns a manifest whose Radar/Timeline/Map data is verifiably sourced from the Task 4 seed data (spot-check a ranked item against the raw `articles` row), and every ranked item links to an evidence reference.

**Judging contribution:** this is the moment the required story becomes real end to end (steps 3–6 and 8 in `00 Executive Brief.md` §3 all become true simultaneously). Serves Use of ClickHouse & Trigger.dev (25%), Problem Fit (20%), and Technical Implementation (20%) at once — the single highest-leverage task in the plan.

---

## 3. Session plan (indicative — compress or split as your actual free hours allow)

Six sessions, front-loaded on Stage A. Each session ends with something that runs, even if incomplete.

| Session | Length | Contents | Ends with |
|---|---:|---|---|
| 1 | ~2.5h | Tasks 1–2 (connectivity, then the `chat.agent()` fixture skeleton) | A question submitted in the browser streams a hard-coded manifest end to end through `chat.agent()` |
| 2 | ~3h | Task 3 (schema, incl. the H3 sanity check) + Task 4 (seed ingestion + the manual diversity check) | Schema live; seed data loaded and empirically confirmed to differentiate two rough profile keyword sets |
| 3 | ~3.5h | Task 5 (real query wiring), then start of the Impact Radar renderer | A real question returns real, evidence-linked ClickHouse data through `chat.agent()` |
| 4 | ~3h | Finish Impact Radar, Timeline, and Map renderers wired to the Task 5 manifest; manifest validation | The full three-view workspace renders from a live question |
| 5 | ~3h | Paste-profile onboarding (LLM extraction → cards) for Profile A; pre-seed Profile B; coordinated selection/filtering across the three views; Evidence Drawer | Both profiles produce visibly different rankings for the same question, with working cross-filtering |
| 6 | ~2.5–3h | Deploy; rehearse the two-profile flow three times consecutively; fix whatever breaks; record the demo; write the README | A public deployment, a passing three-times-consecutive rehearsal, and a recorded demo |

**Total: ~17.5–18.5h**, inside the 15–20h budget with a small buffer. If actual free time comes in lower, cut inside Session 5 first (pre-seed *both* profiles instead of live-pasting Profile A) before touching anything in Sessions 1–4 — those five tasks are the required story itself.

**Status:** Session 1 in progress — Task 1 passed live; Task 2 code complete, pending the live model-call test (one credential away, `ANTHROPIC_API_KEY`). Task 3 passed live. Task 4–5 and Sessions 2–6 not started. Full detail: `docs/14 Engineering Handoff.md`.

Stage B (if any hours remain after Session 6): attempt the ranked stretch list in `12 Scope Gate.md` §5, in order, stopping the moment the remaining time runs out. Never start a Stage B item that can't be finished and rolled back cleanly if it destabilizes the working Stage A deployment.

---

## 4. Demo choreography (target: under 3 minutes of the 5-minute limit — leave margin)

| Time | Action | Score demonstrated |
|---:|---|---|
| 0:00–0:15 | Open on the completed Profile A card list; submit "What should I know today?" | Problem Fit, Presentation |
| 0:15–1:00 | Visual answer streams: verdict → Impact Radar → Timeline → Map | Problem Fit, Use of ClickHouse & Trigger.dev |
| 1:00–1:40 | Select a signal; show the Timeline and Map respond; open the Evidence Drawer | Technical Implementation, Problem Fit |
| 1:40–2:20 | Switch to Profile B (no live paste needed); ask the identical question; show the visibly different top signal and verdict | Innovation — this is the single most important 40 seconds in the video |
| 2:20–2:50 | Briefly show the Trigger.dev run (ingestion task + agent run) and the ClickHouse query behind the answer | Use of ClickHouse & Trigger.dev 25% |
| 2:50–3:00 | Close on the workspace with one line: *"Same world, same question — a different answer, because it's a different person asking."* | Presentation, Innovation |

No architecture slide, no founder introduction, no market context before the first live question. If it doesn't fit in three minutes, cut the Trigger.dev/ClickHouse walkthrough (2:20–2:50) down, not the two-profile comparison — that comparison is the whole Innovation claim.

---

## 5. Stop conditions

Stop and switch to hardening/recording the moment any of these is true: the two-profile flow fails once; a new dependency needs more than 30 minutes to integrate; you're inside the last 3 hours of budget and Stage A isn't fully deployed; a fix for one view breaks another. At that point: only correctness, the rehearsal, and the recording matter — no new capability work.

---

## 6. What's explicitly not in this plan

Everything in `12 Scope Gate.md` §4 (Clerk, Postgres/CDC, the graphical Mirror Model editor, scheduled polling, multiple response patterns, the relationship graph, vector retrieval, mobile/accessibility polish) is absent from both stages above by design — not an oversight, not deferred to "later in the week." If extra hours appear beyond the ~15–20 budgeted, they go to Stage B (`12 Scope Gate.md` §5) in ranked order, never to anything in the cut list.

---

## 7. Source notes

Replaces the prior `09 Sprint Plan.md`'s seven-day schedule per `12 Scope Gate.md`. Task and session order revised again following the pre-implementation engineering design review (`12 Scope Gate.md` §7.6) to prove `chat.agent()` before sinking time into schema/seed work. The prior day-by-day structure (vertical slice → ingestion → retrieval → visual composition → graph/personalization/OLTP → hardening → submission) is preserved in git history as the reference for a full multi-day team build; this document is the authoritative plan for the current ~15–20 hour, solo, part-time budget.
