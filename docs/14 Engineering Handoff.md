# 14 — Engineering Handoff

**Purpose:** let a fresh Claude Code session (no prior chat history) continue this build with zero ambiguity. This document is self-contained — read it before reading anything else, including `CLAUDE.md`.
**This is a living document.** Overwrite it at the end of every future session so it never goes stale.

---

## 1. Current implementation status

**Stage A, Sessions 1–5 substantially done.** Tasks 1, 2, 3, and 5 are all fully verified live. **Task 2 passed live on 2026-07-20** (OpenAI account quota cleared — R-22 resolved) — both profiles run clean through the real `chat.agent()` → `getBriefing` → streamed-manifest pipeline, verified via script and via an actual browser session. **Task 4 remains blocked** on a live GDELT API outage (`docs/11 Risks.md` R-05) — external, not fixable in this codebase.

**The full visual workspace is built and live-verified** (`app/components/workspace/*.tsx`) — Verdict Strip, Impact Radar, Timeline, Map, and Evidence Drawer, rendering exclusively from the real `getBriefingManifest()` output with coordinated cross-view selection. This was Session 4 and most of Session 5's work, done ahead of the original plan because completing Task 2's live verification required a real UI to verify against, not the raw-JSON placeholder. Verified with a headless browser against real (fixture) data: both profiles render distinctly, selection propagates correctly across all four views, and every displayed evidence item traces to a real ClickHouse row. Two real defects were caught and fixed during this verification, not by inspection — see §3.

Two permanent rerun scripts (`scripts/verify-task2-chat-live.ts`, `scripts/verify-task4-seed-gdelt-live.ts`) remain in the repo for re-verifying either task the moment its external condition changes. Remaining Stage A work: Task 4's real GDELT seed (blocked), Profile A's live paste-extraction onboarding (currently pre-seeded instead, the sanctioned Session 5 fallback), and Session 6 (rehearsal, demo recording, README).

Task numbering below refers to `docs/09 Sprint Plan.md` §2 (the reordered five-task sequence) and `docs/08 MVP.md` §1 (the Stage A definition).

---

## 2. Completed milestones (with commit hashes)

| Commit | What it did |
|---|---|
| `3defe31` | Added the full planning corpus (`docs/00`–`13`) and `CLAUDE.md`. |
| `6411cea` | Scaffolded the Next.js 16 + Trigger.dev + ClickHouse app: `lib/env.ts`, `lib/clickhouse.ts`, `trigger.config.ts` (placeholder project ref), `trigger/connectivity-check.ts` (Task 1 diagnostic task). Single-app structure, not a monorepo — see §5 and §9. |
| `e193d4e` | Wired the real Trigger.dev project ref (`proj_nlisinjujntnqjrchglx`) into `trigger.config.ts`, verified live via `whoami -p` and a `trigger.dev dev` worker boot. |
| `5b3edeb` | Marked Task 1 passed in `docs/09 Sprint Plan.md` after the live acceptance test succeeded (see §3 below). |
| `234461f` | Added Task 2: `lib/visual-response.ts` (MVRP manifest schema), `trigger/chat.ts` (`mirror-agent` chat.agent() with a fixture `getBriefing` tool), `app/actions.ts` (server actions), `app/components/chat.tsx` + `app/page.tsx` (frontend). |
| `e5a45e4` | Updated `docs/09 Sprint Plan.md`, `docs/10 Task Backlog.md`, `docs/11 Risks.md` with current status; added this handoff document. |
| `f5ebace` | Added Task 3: `trigger/init-schema.ts` (creates `articles`/`profile_cards`/`artifacts`, runs the round-trip + H3 sanity acceptance checks, cleans up its own test rows). Verified live — see §3. Updated `docs/09`/`10` status. |
| `5c4b287` | Added Task 4: `trigger/seed-gdelt.ts` (GDELT DOC 2.0 ingestion, keyword tagging, country lookup). Static checks clean; live run blocked in this session's local sandbox (root-caused, not a code defect). Updated `docs/09`/`10`/`14` status. |
| `dc8d63c` | Deployed the project to Trigger.dev Cloud (`prod`, version `20260719.1`, 4 tasks) to route around the local-sandbox networking limit. Attempted an automated ClickHouse-credential sync to the Cloud environment via the SDK management API; it failed with a 401 (`docs/11 Risks.md` R-34). Added R-33/R-34 to `docs/11 Risks.md`. Updated `docs/09`/`10`/`14` status. |
| `68dbd44` | User provided `ANTHROPIC_API_KEY` (into chat, not `.env.local` — treated as exposed regardless of outcome, `docs/11 Risks.md` R-31). Live test revealed the Anthropic organization behind it was disabled at the account level (`docs/11 Risks.md` R-22), not a code or format problem. Swapped `mirror-agent`'s model provider from `@ai-sdk/anthropic` to `@ai-sdk/openai` (`gpt-4o`) in `trigger/chat.ts`; removed the unused `@ai-sdk/anthropic` dependency; updated `.env.example`. Redeployed to Trigger.dev Cloud (`prod`, version `20260719.2`). Updated `docs/09`/`10`/`11`/`14` status. |
| `e3f59cd` | User provided an `OPENAI_API_KEY`. Live test found `429 insufficient_quota` — an account/billing state — noted in the handoff before further work. |
| *(User then had all three Cloud-dashboard blockers resolved via Claude Cowork — `OPENAI_API_KEY`, `CLICKHOUSE_URL`/`CLICKHOUSE_USERNAME`/`CLICKHOUSE_PASSWORD` added to the Trigger.dev `prod` environment, and a `prod`-scoped `TRIGGER_PROD_SECRET_KEY` saved to `.env.local`.)* | |
| `b984536` | Found and fixed a real defect before the first live chat attempt: `run()` never read `clientData`, so the model had no way to know which profile was active. Fixed via `onChatStart` + `chat.prompt.set()` in `trigger/chat.ts`. Redeployed (`prod`, version `20260719.3`). Live-verified the full session/dispatch path for `mirror-agent` (reached `WAITING` with the correct payload) — blocked only on OpenAI quota, confirmed still failing after the user's reported billing fix. Live-attempted `seed-gdelt` twice on Cloud — confirmed `CLICKHOUSE_*` credentials work, but both attempts hit a genuine `api.gdeltproject.org` outage, isolated via an independent `curl` failure at the same time. Added R-05/R-22 occurrence notes to `docs/11 Risks.md`. Updated `docs/09`/`10`/`14` status. |
| `454aafe` | **Task 5**, per explicit instruction to proceed past the two external blockers: `lib/tags.ts` (shared tag vocabulary, extracted from `seed-gdelt.ts`), `lib/briefing.ts` (the real 3-query ClickHouse `getBriefing` implementation), `trigger/seed-profile-cards.ts` (permanent card seed for both locked profiles), `trigger/load-dev-fixtures.ts` (20 hand-authored, clearly-marked, removable dev-fixture articles — GDELT is still down, so real data isn't available to test against). Updated `seed-gdelt.ts`'s no-op guard to exclude fixture rows. Verified live against ClickHouse: Profile A/B rank with zero top-signal overlap, every evidence ID traces to a real row, the no-signals fallback works. Also caught and fixed a real polling bug in the new `scripts/verify-task4-seed-gdelt-live.ts` rerun script (SDK `isCompleted`/`isSuccess`/`isFailed` all stay `false` for a `TIMED_OUT` run — must poll on `finishedAt` instead) while confirming GDELT is still down. Redeployed (`prod`, version `20260720.1`, 6 tasks). Updated `docs/09`/`10`/`14` status. |
| *(mid-session)* | User retried Task 2 directly (`scripts/verify-task2-chat-live.ts`) — **passed live**, OpenAI quota had cleared. Both profiles ran clean, no errors, manifests differ. |
| *(see `git log` for the hash of the commit that added this file update)* | Built the full visual workspace: schema extensions (`lib/visual-response.ts` — `map[].lat`/`lon`/`evidenceIds`, `timeline[].evidenceIds`, `evidence[].location`/`relevanceContext`, all additive); `lib/briefing.ts` updated to populate them server-side (H3→lat/lon via `h3ToGeo`, cross-view evidence-id matching, relevance-context from matched tags); five new components under `app/components/workspace/` (`VerdictStrip`, `ImpactRadar`, `Timeline`, `WorldMap`, `EvidenceDrawer`) plus a `Workspace` coordinator holding one shared selection; `trigger/chat.ts` exports `tools` for frontend type inference; `app/components/chat.tsx` rewritten to render the real workspace with loading/streaming/error/empty states instead of raw JSON. Added `d3-geo`/`topojson-client`/`world-atlas` (pinned exact versions, no map-tile network dependency). Verified live with a headless browser (Playwright, installed `--no-save`, not a project dependency) — caught and fixed two real bugs in the process (a ClickHouse column-shadowing bug in the Map query, a CSS flex/percentage-height bug in the Timeline bars — see §3 and `docs/11 Risks.md` R-35/R-36). Redeployed (`prod`, version `20260720.2`, 6 tasks). Updated `docs/09`/`10`/`11`/`14` status. |

Full history: `git log --oneline`.

---

## 3. Verified acceptance tests

### Task 1 — ClickHouse ↔ Trigger.dev connectivity — ✅ PASSED LIVE

Ran `trigger/connectivity-check.ts` via `tasks.trigger()` against the real, deployed ClickHouse Cloud service and the real Trigger.dev project. Result:

```
Triggered run id: run_cmrqqchcf692g0jomsjtyzk7t
Final status: COMPLETED
Output: { "confirmed": true, "id": "<uuid>", "insertedAt": "2026-07-18T18:58:27.340Z" }
```

This is a genuine round trip: scratch table created, row inserted, row read back, `confirmed: true`. Not a fixture.

### Task 2 — `chat.agent()` — ✅ PASSED LIVE (2026-07-20)

**Model provider is OpenAI, not Anthropic.** A user-provided `ANTHROPIC_API_KEY` was tested live (`curl` directly against `api.anthropic.com/v1/messages`, model `claude-sonnet-5`) and rejected with `"This organization has been disabled."` — an account-level state (billing/compliance review), not a code, format, or model-ID problem. `trigger/chat.ts` was switched to `@ai-sdk/openai`'s `openai("gpt-4o")`. `ANTHROPIC_API_KEY` is no longer used anywhere in this codebase.

**A real defect was found and fixed before the first live attempt.** Re-reading `run: async ({ messages, tools, signal }) => {...}` against the bundled SDK docs (`docs/ai-chat/backend.mdx`) showed `run()` never destructured `clientData` — the `{ profileId }` the frontend sends via `useTriggerChatTransport`'s `clientData` prop (`app/components/chat.tsx`) was never surfaced to the model at all. The model would have had no way to know which profile was active or which `profileId` to pass to `getBriefing`, which would have broken the entire "two profiles, different answers" claim silently. Fixed with the idiomatic SDK pattern:
```ts
clientDataSchema: z.object({ profileId: z.enum(["profile-a", "profile-b"]) }),
onChatStart: async ({ clientData }) => {
  chat.prompt.set(
    `The active profile for this conversation is "${clientData.profileId}". ` +
    `Always call getBriefing with profileId set to exactly "${clientData.profileId}" - ` +
    `never ask the user which profile is active, it is already fixed for this session.`,
  );
},
```
`onChatStart` fires once per chat; `chat.toStreamTextOptions()` in `run()` picks up the stored prompt automatically via `chat.prompt.set()`. Redeployed as `prod` version `20260719.3`.

**Live verification attempt (session-protocol script, not the mock test harness — a real call against the deployed `prod` task):** created a real chat session via `POST /api/v1/sessions` with `taskIdentifier: "mirror-agent"`, `trigger: "submit-message"`, the exact Demo Contract question, and `metadata: { profileId: "profile-a" }` (then again for `"profile-b"`), using the newly-added `TRIGGER_PROD_SECRET_KEY`. Both runs:
- Correctly dispatched — `runs.retrieve()` showed the right `payload` (message, metadata, sessionId) and reached `status: "WAITING"` (the session's normal idle-suspend state, not a crash).
- Streamed a **sanitized** `{"type":"error","errorText":"An error occurred."}` on `session.out`, followed immediately by `turn-complete` — `durationMs: 0`, `costInCents: 0`, consistent with the model call failing before generating any tokens.

At that point (the first live attempt), root cause was: `OPENAI_API_KEY` itself, re-tested directly against `api.openai.com/v1/chat/completions` immediately after — still `429 insufficient_quota`, the *same* error as before the user's reported OpenAI billing fix. This confirmed the Cloud dispatch path was fully correct (session creation, secret-key auth, payload wiring, `clientData` fix all working) — the only failure was the OpenAI account itself not having usable quota yet.

**Retried later the same session per explicit user instruction, using the same `OPENAI_API_KEY` and the same script — this time it passed.** The account's quota had cleared on its own (`docs/11 Risks.md` R-22, resolved). `scripts/verify-task2-chat-live.ts` ran both profiles through the real session protocol against `prod`: both dispatched, both streamed a real `getBriefing` tool call and a real model-generated verdict, both `turn-complete`d with nonzero `durationMs`/`costInCents`, and the two profiles' verdicts/manifests differed as expected. No code changes were needed to make this pass — the fix that mattered was the `clientData` wiring fix already made and deployed earlier; the quota clearing was purely an external account-state change.

**Further verified via a real browser session** (not just the script) as part of building the visual workspace (see the new "Task 5 / Visual Workspace" subsection below): Profile B's chat was run end-to-end through the actual `app/components/chat.tsx` UI — profile switch, Ask, streaming states, and a fully rendered manifest — with zero console errors.

### Task 3 — ClickHouse schema — ✅ PASSED LIVE

Ran `trigger/init-schema.ts` via `tasks.trigger()` against the real ClickHouse Cloud service. Result:

```
Triggered run id: run_cmrqsolvs7xqk0pll42any3xp
Final status: COMPLETED
Output: {
  "allPassed": true,
  "checks": {
    "articleRoundTrip": true,
    "profileCardRoundTrip": true,
    "artifactRoundTrip": true,
    "h3SanityWithinThreshold": true
  },
  "h3SanityDistanceMeters": 15950.406913826559
}
```

Before writing the task, the coordinate order was verified directly against the live service (not assumed from memory) with a throwaway query:

```
geoToH3(-74.0060, 40.7128, 5)  -- (lon, lat, res) — NYC, correct order
  → 603207109235965951
geoToH3(40.7128, -74.0060, 5)  -- (lat, lon, res) — swapped, silently wrong
  → 599718752904282111  (a different cell — no error, just a wrong location)
```

**Confirmed API contract:** both `geoToH3(lon, lat, resolution)` and `h3ToGeo(h3Index)` (which returns a tuple whose *positional* elements are `(lon, lat)`) use longitude-first order. Note `h3ToGeo`'s JSON output labels the tuple fields `"latitude"`/`"longitude"`, but those labels are misleading — element 1 is actually longitude and element 2 is actually latitude. `trigger/init-schema.ts` uses `tupleElement(h3ToGeo(h3), 1)`/`tupleElement(..., 2)` and comments this explicitly so it isn't miscopied into the Task 5 query. This is exactly the failure mode `docs/06 Data.md` §9 and `docs/12 Scope Gate.md` §7.4 warned about — worth knowing before touching H3 again in Task 5's Map query.

Verified after the run: `SELECT count() FROM articles` (and `profile_cards`, `artifacts`) all return `0` — the task's own test rows were deleted, so Task 4's "no-op if `articles` already has rows" check is still accurate.

### Deployment — Trigger.dev Cloud (`prod`) — ✅ DEPLOYED LIVE

```
npx trigger.dev@latest deploy --dry-run --env prod   # succeeded, build clean
npx trigger.dev@latest deploy --env prod             # succeeded
```
Result: `Version 20260719.1 deployed with 4 detected tasks` (`connectivity-check`, `init-schema`, `seed-gdelt`, `mirror-agent`).
Dashboard: `https://cloud.trigger.dev/projects/v3/proj_nlisinjujntnqjrchglx/deployments/shwljpqv`

**Why `prod` and not `staging`:** `npx trigger.dev@latest env list --env staging` returned `Environment not found` for this project — `staging` isn't provisioned here (plan-gated or needs separate creation, not investigated further since it wasn't necessary). `env list --env prod` succeeded and showed the project's 12 default/system Trigger.dev variables (all telemetry-related), confirming `prod` is the only environment that currently exists to deploy to. This is a discovered technical constraint, not a scope decision — there was no real choice between environments.

**Env-var sync attempted and failed — do not repeat without new information:** tried to script `envvars.upload()` (SDK management API) to push `CLICKHOUSE_*` from `.env.local` into the Cloud `prod` environment, using a short-lived `tr_uat_...` token minted from the already-authenticated CLI session (`trigger.dev mint-token`). Failed both times (once targeting `staging`, once `prod`) with `401 Invalid or Missing API key`. The CLI's own `env list`/`env pull` read commands clearly use a different, internal authenticated channel than the public SDK's REST client — the REST client appears to need a personal access token or an environment-scoped secret key, neither of which this session has. Recorded as `docs/11 Risks.md` R-34. **Do not spend more time trying to script around this** — the dashboard is the documented, reliable path (§7).

### Provider swap — Anthropic → OpenAI — ✅ DONE, redeployed as version `20260719.2`

The user supplied a live `ANTHROPIC_API_KEY` (pasted into chat — see the R-31 recurrence note in `docs/11 Risks.md`). It was moved to `.env.local` immediately and tested directly:

```
curl https://api.anthropic.com/v1/messages \
  --header "x-api-key: $ANTHROPIC_API_KEY" \
  --header "anthropic-version: 2023-06-01" \
  --data '{"model": "claude-sonnet-5", "max_tokens": 32, "messages": [...]}'
→ 400 {"type":"error","error":{"type":"invalid_request_error","message":"This organization has been disabled."}}
```

Not a transient outage or rate limit — an account-level disable, appealed by the user with no known timeline. Rather than wait, swapped providers:
- `npm uninstall @ai-sdk/anthropic && npm install @ai-sdk/openai@4.0.16` (pinned to match the sibling AI SDK packages already in this project, not `npm`'s default caret range — consistent with the R-32 lesson about not blindly taking `latest`/unpinned ranges).
- `trigger/chat.ts`: `anthropic("claude-sonnet-4-5")` → `openai("gpt-4o")`. `gpt-4o` was chosen deliberately over guessing at whatever the newest-named OpenAI model might be as of the current date — same reasoning as R-32: prefer a known-stable, well-documented, tool-calling-capable model over an unverified bleeding-edge name. Revisit if a newer model is specifically wanted.
- `.env.example` updated: `OPENAI_API_KEY` is now documented as required for `mirror-agent` itself, not only for the later Task 5 profile-extraction use it was originally added for.
- `.env.local`: the disabled `ANTHROPIC_API_KEY` was removed entirely (non-functional, and already-exposed-in-chat regardless); replaced with `OPENAI_API_KEY=REPLACE_ME`.
- `npm run typecheck/lint/build` all pass clean after the swap.
- Redeployed: `npx trigger.dev@latest deploy --env prod` → `Version 20260719.2 deployed with 4 detected tasks`; redeployed again as `20260719.3` after the `clientData` fix below.

**Net effect on the rest of this document:** every remaining reference to `ANTHROPIC_API_KEY` as Task 2's blocking credential should be read as `OPENAI_API_KEY` instead — the credential changed, the blocker shape (needs to be in `.env.local` for local dev and the Trigger.dev Cloud `prod` environment for the deployed task) did not.

### Task 4 — `seed-gdelt` ingestion — 🟡 code complete, deployed, live-tested, blocked on a real GDELT outage (external)

`npm run typecheck`, `npm run lint`, `npm run build` all pass clean. The GDELT DOC 2.0 API contract used by the parser was verified live via direct `curl`/`node fetch` calls earlier this session — real, current articles came back correctly at the time. The original local-sandbox networking limitation (`docs/11 Risks.md` R-33) is resolved via the Cloud deploy.

**Two live attempts against `prod` (via `tasks.trigger("seed-gdelt", {})` with the new `TRIGGER_PROD_SECRET_KEY`), both `FAILED` the same way:**
```
Error: GDELT fetch failed: ConnectTimeoutError: Connect Timeout Error
    at fetchGdeltQuery (file:///trigger/seed-gdelt.ts:166:11)
```
This confirms two things at once: **`CLICKHOUSE_*` credentials in `prod` are correct** — the task reached its `SELECT count() FROM articles` no-op check (which requires a working ClickHouse connection) before ever calling `fetchGdeltQuery`, so it got well past the point where a credential problem would have surfaced. And **GDELT's API is genuinely unreachable right now**, not a Trigger.dev Cloud networking issue: a `curl` to `api.gdeltproject.org` from a completely different network path (this session's own sandbox, run at the same time) also timed out with no response (`HTTP_STATUS:000`), while `https://www.gdeltproject.org` (the marketing site, a different subdomain) and `https://www.google.com` both returned `200` from that same path in the same few seconds. Three independent network paths, one consistent failure, isolated to exactly one hostname — this is a real GDELT-side outage, recorded as an occurrence of `docs/11 Risks.md` R-05.

Do not report Task 4 as passed until it has actually inserted real rows and the manual diversity check (`docs/12 Scope Gate.md` §7.2) has been run against them. Before re-attempting, check `api.gdeltproject.org` is reachable again with a plain `curl` — no point re-triggering into the same outage.

**A stale leftover process later produced a misleading `ENOTFOUND api.trigger.dev` error — not a new GDELT/Trigger.dev problem.** A background polling script from much earlier in this session (the very first, pre-Cloud-deploy attempt to run `seed-gdelt` through the local `trigger.dev dev` worker) was never killed and kept polling for hours. It eventually errored with a DNS resolution failure for `api.trigger.dev` itself — confirmed as a transient local/sandbox networking hiccup, not a Mirror task failure: `curl https://api.trigger.dev` and ClickHouse Cloud both responded normally moments later, and no other lingering processes or temp scripts were found on inspection. No code changes were made in response, per instruction — this was correctly identified as noise, not evidence of a defect.

### Task 5 — real ClickHouse-backed `getBriefing` — 🟢 code complete, verified against controlled dev fixtures, NOT yet verified against live GDELT data

Implemented per explicit instruction to proceed past the Task 2/Task 4 external blockers, using controlled fixtures so the query itself could be built and proven correct without waiting on GDELT.

**What changed:**
- `lib/tags.ts` — the `TAG_KEYWORDS`/`deriveTags` vocabulary and a new `LOCATION_TO_COUNTRIES` map, extracted from `trigger/seed-gdelt.ts` so both the article-tagging side (ingestion) and the new card-tagging side (ranking) share identical vocabulary, per the design intent already noted in `docs/12 Scope Gate.md` §7.1.
- `lib/briefing.ts` — `getBriefingManifest(profileId)`, the real query. Fetches `profile_cards`, derives keyword-tag weights from non-location card labels (via `deriveTags`) and a coarse country-code set from the location card (via `LOCATION_TO_COUNTRIES`), then runs three parameterized ClickHouse queries: a ranked-signal query (tag-weight match + recency decay `1/(1+daysOld)` + geo boost, top 7), a timeline query (`GROUP BY toDate(published_at)`), and an H3 map query (`GROUP BY h3_r5`). All weighting/ranking arithmetic happens in SQL (`arrayFilter`/`arrayMap`/`arraySum` over parallel tag/weight-parameter arrays), not in application code. Evidence `source` is `new URL(url).hostname` — derived from the stored URL, not a separate invented field. `direction` (rising/stable/declining) is a deterministic function of `published_at` age (≤3d / ≤10d / older). Falls back to a `"No material signals for this profile yet"` empty manifest (`docs/10 Task Backlog.md` §7) if a profile has no cards or nothing scores above zero — verified live for a nonexistent profile.
- `trigger/chat.ts` — `getBriefing`'s `execute` is now `async ({ profileId }) => getBriefingManifest(profileId)`. The old two hard-coded `FIXTURES` manifests are gone entirely. Tool input/output shape unchanged.
- `trigger/seed-profile-cards.ts` — **permanent**, not a dev fixture. Inserts the exact `docs/13 Demo Contract.md` §2-3 cards for both `profile-a` and `profile-b` (idempotent per profile). Profile A's cards would eventually come from live paste-extraction (a later Session 5 item); Profile B is pre-seeded by design regardless (`docs/08 MVP.md` §2) — either way, `getBriefing` needs real rows to weight against now, not later. "Organization" in the Demo Contract's card table maps to the schema's `entity` item_type, matching the pre-existing `profile_cards.item_type` `Enum8` (`goal`/`interest`/`entity`/`location` — no `organization` value exists).
- `trigger/load-dev-fixtures.ts` — **temporary, isolated, removable.** 20 hand-authored articles (not from GDELT), each tagged with a reserved `dev-fixture` tag (`lib/dev-fixtures-tag.ts`), title-prefixed `[DEV FIXTURE]`, and given a fake `fixture.mirror-dev.test` URL — unmistakable anywhere they surface. Deliberately near-disjoint tag vocabulary between an AI/regulation/enterprise/LLM/US cluster (8 articles) and a climate/carbon/EU/energy/markets cluster (8 articles), plus 4 neutral markets/geopolitics articles for diversity, spanning 7 countries (US, DE, FR, BE, GB, JP, BR) and a 1–11 day recency spread. Call with `{ clear: true }` to remove every fixture row. **`trigger/seed-gdelt.ts`'s no-op guard was updated** (`WHERE NOT has(tags, 'dev-fixture')`) specifically so these rows can never block or be miscounted as the real seed — this was necessary, not optional, once fixtures could coexist with a future real seed in the same table.

**Verified live, directly against ClickHouse** (`lib/briefing.ts` called standalone — no Trigger.dev, no OpenAI involved, so this works even with both external blockers still open):
```
=== profile-a ===
verdict: Top signal: "[DEV FIXTURE] US agency proposes new AI compliance framework for enterprise software" (US).
top 7: all AI/regulation/enterprise/US-tagged fixture articles, scores 16.25–20.5
=== profile-b ===
verdict: Top signal: "[DEV FIXTURE] Climate policy shift in Brussels reshapes carbon trading markets" (BE).
top 7: all climate/carbon/EU-tagged fixture articles, scores 12.5–15.33
=== checks ===
verdicts differ: true
top radar item differs: true
all radar evidenceIds resolve to evidence entries: true (both profiles)
all evidence URLs are fixture URLs: true (both profiles)
```
Zero overlap between the two profiles' top-7 signals — the geo boost is visibly doing real work too (the US-focused article outranks a similarly-tagged EU AI-Act article specifically because of the country match + recency, not because the tag score alone decided it).

**This does not satisfy Task 4's live-data acceptance criteria and must not be reported as if it did.** It proves the query logic is correct; Task 4's real GDELT seed still needs to run and be spot-checked the same way once GDELT recovers (§9).

### Visual workspace (Impact Radar, Timeline, Map, Evidence Drawer) — ✅ BUILT AND LIVE-VERIFIED

Implemented per explicit instruction to proceed with the approved visual-workspace design, rendering exclusively from the real `getBriefingManifest()` output (no second frontend data path, no client-side value computation). Fixed Demo Contract view order: Verdict Strip, Impact Radar, Timeline, Map, Evidence Drawer.

**What changed:**
- `lib/visual-response.ts` — additive-only schema extensions: `evidence[].location`/`relevanceContext`, `timeline[].evidenceIds`, `map[].lat`/`lon`/`evidenceIds`. No breaking change to the envelope or existing consumers.
- `lib/briefing.ts` — populates the new fields server-side: evidence gets `location` (stored `country_code`) and `relevanceContext` (which of the profile's tags matched); timeline buckets and map cells each get the `evidenceIds` that belong to them, computed in the query-assembly step (still ClickHouse-sourced data, just cross-referenced in the manifest-building code, not fabricated). The map query derives `lat`/`lon` server-side via `h3ToGeo`.
- `app/components/workspace/` — five new components (`VerdictStrip`, `ImpactRadar`, `Timeline`, `WorldMap`, `EvidenceDrawer`) plus a `Workspace` coordinator holding one shared `{ key, evidenceIds }` selection. Selecting a radar item, timeline bar, or map bubble highlights it and opens the Evidence Drawer with every evidence item that traces back to it. `Timeline` is a hand-rolled CSS bar chart (no charting library needed at this scale). `WorldMap` uses `d3-geo` + `topojson-client` + a bundled offline `world-atlas` land topology — no map-tile network dependency, works offline and in the demo room regardless of network conditions.
- `app/components/chat.tsx` — rewritten to render `<Workspace>` from the real tool output instead of raw JSON, with loading (generic + tool-specific), streaming, empty (no signals), error (tool error + top-level connection error with Retry), and reconnect states.
- `d3-geo@3.1.1`, `topojson-client@3.1.0`, `world-atlas@2.0.2` added (exact-pinned, matching this project's dependency convention), plus their `@types/*` dev dependencies.

**Live-verified with a headless browser (Playwright, installed `--no-save`, not a project dependency):**
- Ran the exact Demo Contract question as Profile A — all four views rendered from the real manifest.
- Switched to Profile B with the identical question — Impact Radar and verdict visibly differ (confirmed distinct top signals and verdict text, same as the Task 5 fixture check above, now seen rendered).
- Selecting a radar item, timeline bar, and map bubble each correctly opened the Evidence Drawer with the matching evidence, and every evidence item's `id` traced to a real fixture row inserted by `load-dev-fixtures`.
- No hidden essential content at the intended demo viewport.
- Two real defects were caught and fixed during this verification (not by static inspection — `tsc`/`eslint`/`next build` all passed the whole time these bugs were present):
  1. **ClickHouse column-alias shadowing** — the Map query aliased a derived `String` value back to the same name as its source `UInt64` column (`h3_r5`), which made a later reference to `h3ToGeo(h3_r5)` in the same `SELECT` list resolve to the shadowing alias instead of the real column, failing with `Illegal type String... Must be UInt64`. Fixed by renaming the alias to `h3`. See `docs/11 Risks.md` R-35.
  2. **CSS percentage-height Timeline bars collapsing to 0px** — the bar container used `items-end` (which overrides default flex `stretch`), so percentage-height bar spans inside had no reference frame. Fixed by computing explicit pixel heights in JS instead of percentages. See `docs/11 Risks.md` R-36.
- Redeployed to Trigger.dev Cloud (`prod`, version `20260720.2`, 6 tasks) and re-confirmed `scripts/verify-task2-chat-live.ts` still passes there.

A temporary debug-only page (`app/dev-preview/page.tsx`) was created mid-session to work around a stuck/permanently-closed Trigger.dev Session on the `profile-a-chat` id (Sessions are terminal once closed — a fresh session can't reuse that externalId), calling `getBriefingManifest()` directly to keep iterating on the UI quickly. It was explicitly marked temporary in its own comment and **deleted before this work was committed** — it never shipped and is not part of the product.

---

## 4. Current architecture state

**Deliberate deviation from `docs/07 Tech Stack.md`:** this is a single Next.js app at the repo root, not a pnpm/Turborepo monorepo with separate `apps/`/`packages/`. That doc's monorepo design was sized for a multi-package, multi-team build; at this scope (three ClickHouse tables, one agent, one tool) a monorepo is unnecessary setup overhead. Package manager is **npm**, not pnpm. This is implementation-level, not a product decision — no approval was needed or sought.

**Repo layout as it exists right now:**
```
/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── actions.ts              (server actions: startChatSession, mintChatAccessToken)
│   └── components/
│       ├── chat.tsx                    (profile switcher + demo question + loading/streaming/error/empty states + <Workspace>)
│       └── workspace/
│           ├── types.ts                (WorkspaceSelection, view-item type aliases, intersects() helper)
│           ├── Workspace.tsx           (coordinator: shared selection state, renders all 5 views in Demo Contract order)
│           ├── VerdictStrip.tsx
│           ├── ImpactRadar.tsx
│           ├── Timeline.tsx            (hand-rolled CSS bar chart, explicit pixel heights — see R-36)
│           ├── WorldMap.tsx            (d3-geo + topojson-client + bundled world-atlas land topology)
│           └── EvidenceDrawer.tsx
├── lib/
│   ├── env.ts                  (Zod validation for CLICKHOUSE_* vars)
│   ├── clickhouse.ts           (singleton @clickhouse/client)
│   ├── visual-response.ts      (MVRP manifest Zod schema — impactRadar/timeline/map, plus additive location/relevanceContext/evidenceIds/lat/lon fields)
│   ├── tags.ts                 (Task 5 — shared TAG_KEYWORDS/deriveTags/LOCATION_TO_COUNTRIES)
│   ├── dev-fixtures-tag.ts      (the "dev-fixture" tag constant, shared by seed-gdelt + load-dev-fixtures)
│   └── briefing.ts              (Task 5 — the real ClickHouse-backed getBriefingManifest())
├── trigger/
│   ├── connectivity-check.ts   (Task 1 diagnostic — safe to delete once Task 5 is stable)
│   ├── init-schema.ts          (Task 3 — creates the 3 product tables + runs acceptance checks)
│   ├── seed-gdelt.ts           (Task 4 — GDELT ingestion, code complete, live run blocked — see §7)
│   ├── seed-profile-cards.ts   (Task 5 — permanent card seed for both locked profiles)
│   ├── load-dev-fixtures.ts    (Task 5 — temporary, isolated, removable dev-only article fixtures)
│   └── chat.ts                 (mirror-agent chat.agent() + real getBriefing tool)
├── scripts/
│   ├── verify-task2-chat-live.ts       (rerun once OpenAI quota clears — §9)
│   └── verify-task4-seed-gdelt-live.ts (rerun once GDELT is reachable — §9)
├── trigger.config.ts           (real project ref: proj_nlisinjujntnqjrchglx)
├── docs/                       (00-14, this file included)
└── package.json / tsconfig.json / eslint.config.mjs / next.config.mjs / postcss.config.mjs
```

**ClickHouse Cloud:** service `visual-chat-agent`, Mini tier, 1 replica, 12 GiB, region `ca-central-1` (AWS), status running. Contains four tables: `_scratch_connectivity_check` (Task 1's diagnostic — not product schema, still unremoved) and the three product tables `articles`, `profile_cards`, `artifacts` (Task 3). `articles.h3_r5` is a `MATERIALIZED` column computed server-side via `geoToH3(longitude, latitude, 5)`; `profile_cards.item_type` is an `Enum8('goal'=1,'interest'=2,'entity'=3,'location'=4)`. As of this handoff: `profile_cards` has 5 rows each for `profile-a`/`profile-b` (permanent, `seed-profile-cards`); `articles` has 20 dev-fixture rows only (temporary, `dev-fixture`-tagged, `load-dev-fixtures`) — zero real GDELT rows yet, since Task 4 is still blocked.

**Trigger.dev:** project `visual-chat-agent` (`proj_nlisinjujntnqjrchglx`), org "Attentionic Inc." CLI is logged in and the login persists locally. All 6 tasks (`connectivity-check`, `init-schema`, `seed-gdelt`, `mirror-agent`, `seed-profile-cards`, `load-dev-fixtures`) are deployed live to the `prod` environment as version `20260720.2`. `init-schema`, `seed-profile-cards`, `load-dev-fixtures`, and `mirror-agent` have all been invoked live and passed (Task 2 fully passed 2026-07-20, see §3); `seed-gdelt` has been invoked live and correctly dispatched (session/payload/credentials all confirmed working) but still hits the real external GDELT outage before completing (§3, §7). The `staging` environment does not exist for this project — `prod` is the only deploy target available. **CLI/package version note:** `npx trigger.dev@latest` currently resolves to `4.5.5`, one minor ahead of this project's pinned `@trigger.dev/sdk@4.5.4`/`@trigger.dev/build@4.5.4` — `trigger.dev dev`/`deploy` both refuse to run on a version mismatch ("This won't end well. Aborting."). Use `npx trigger.dev@4.5.4 dev` / `deploy` explicitly (matches the R-32 lesson already in this project: pin, don't blindly take `latest`) until the SDK packages themselves are deliberately bumped.

**Frontend:** `app/page.tsx` renders `Chat` (`app/components/chat.tsx`) — a profile switcher (Profile A / Profile B, no auth), a button that sends the exact Demo Contract question, loading/streaming/error/empty states, and on a successful `getBriefing` result, the full `Workspace` (`app/components/workspace/*.tsx`): Verdict Strip, Impact Radar, Timeline, Map, and Evidence Drawer, in the fixed Demo Contract order, all rendering exclusively from the real manifest with a single coordinated cross-view selection. No raw-JSON display remains in the shipped UI.

---

## 5. Credentials — all in place, both places

Two separate stores exist: **local `.env.local`** (local dev / this session's own scripts) and **the Trigger.dev Cloud `prod` environment's dashboard** (the deployed tasks — a completely separate store, never auto-synced from `.env.local`). As of this handoff, both are fully populated:

| Credential | Local (`.env.local`) | Trigger.dev Cloud (`prod`) |
|---|---|---|
| `OPENAI_API_KEY` | ✅ set | ✅ set — confirmed live (the `429 insufficient_quota` response *proves* the key is present and being read; a missing/malformed key would fail differently) |
| `CLICKHOUSE_URL` / `CLICKHOUSE_USERNAME` / `CLICKHOUSE_PASSWORD` | ✅ set | ✅ set — confirmed live (`seed-gdelt` reached its ClickHouse no-op check before failing on GDELT) |
| `TRIGGER_PROD_SECRET_KEY` | ✅ set (local only, not needed on Cloud) | n/a |

`ANTHROPIC_API_KEY` is no longer used anywhere in this project (§3 Provider swap) — don't chase it as a blocker or re-add it.

**Nothing left to configure.** The only remaining gaps are external account states — OpenAI quota and a GDELT outage (§7) — not missing credentials.

---

## 6. Current environment variables (`.env.local`, names only — never values)

| Variable | Status | Purpose |
|---|---|---|
| `CLICKHOUSE_URL` | ✅ set | ClickHouse Cloud HTTPS endpoint |
| `CLICKHOUSE_USERNAME` | ✅ set | `default` |
| `CLICKHOUSE_PASSWORD` | ✅ set | ⚠️ was pasted in chat once — treat as exposed, rotate before any public sharing (`docs/11 Risks.md` R-31) |
| `CLICKHOUSE_DATABASE` | not set | optional, defaults to `"default"` in `lib/env.ts` |
| `TRIGGER_SECRET_KEY` | ✅ set | ⚠️ was pasted in chat once — same rotation note applies. **Dev-environment-scoped** — cannot trigger/manage `prod` runs. |
| `TRIGGER_PROD_SECRET_KEY` | ✅ set | `prod`-scoped, retrieved via Claude Cowork from the dashboard's API Keys page and saved directly to this file (never pasted in chat) — used by this session's live-verification scripts to trigger and inspect `prod` runs. |
| `OPENAI_API_KEY` | ✅ set | ⚠️ was pasted in chat once — treat as exposed (`docs/11 Risks.md` R-31). Live-confirmed present and read correctly (`docs/11 Risks.md` R-22) but the OpenAI account itself has no usable quota yet — an account issue, not a value/format issue. |

`.env.local` is correctly gitignored (`.gitignore` has `.env.*`). Confirmed: no credential has ever been committed. `.env.example` documents the same variables without values (not yet updated for `TRIGGER_PROD_SECRET_KEY` — it's a verification-only convenience, not part of the app's runtime `env.ts` schema, so add it there only if it becomes a permanent fixture rather than a one-off testing aid).

---

## 7. Outstanding blockers — one external blocker remains, not fixable in this codebase

The local-sandbox networking limitation that originally blocked Task 4 (R-33) is resolved via the Cloud deploy. Every credential/dashboard gap from earlier in this session (§5) is resolved. **Task 2's OpenAI quota blocker is resolved** — the account's quota cleared on its own and Task 2 passed live on 2026-07-20 (§3, `docs/11 Risks.md` R-22). What's left:

**GDELT's API is currently unreachable (blocks Task 4).** `api.gdeltproject.org` failed to connect from three independent network paths at the same time, while unrelated hosts (including GDELT's own marketing site) responded normally — a real, live outage of that specific API, not anything in this project (`docs/11 Risks.md` R-05). Still unreachable as of this handoff (not re-checked every session — see standing instruction not to idly poll). **Action needed:** none from the user — just wait and retry. Before re-triggering `seed-gdelt`, sanity-check with a plain `curl https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json` to confirm it's back before spending a run on it.

This is naturally transient — nothing in this project's code, configuration, or credentials needs to change for it to resolve. See §9 for the exact re-verification steps once it clears.

---

## 8. Known technical debt

- **Monorepo → single app.** Documented in §4 — intentional, not a defect, but future sessions should not "fix" this back to match `docs/07 Tech Stack.md` literally; that doc is superseded here per its own scope-drift banner.
- **Three credentials exposed in chat transcript** (`CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`, and an `ANTHROPIC_API_KEY` that turned out to belong to a disabled org and is no longer used) — see `docs/11 Risks.md` R-31. Rotate the first two before making this repository public; the third is moot (non-functional, already removed from `.env.local`) but should not be reused if the Anthropic appeal succeeds.
- **`_scratch_connectivity_check` table** exists in the ClickHouse service and is not yet cleaned up. Harmless (a few rows), explicitly deferred until Task 5 is stable per the comment in `trigger/connectivity-check.ts`.
- **ClickHouse Cloud service accepts connections from anywhere** (no IP allowlist) — a deliberate, low-priority trade-off (restricting it would require allowlisting Vercel/Trigger.dev's rotating egress IPs). Revisit only if unexpected usage/billing appears.
- **`.trigger/` local build-cache directory** exists at the repo root from running `trigger.dev dev` locally. Gitignored, harmless, safe to delete if it grows large.
- **No artifact persistence yet.** `getBriefing`'s manifest is built and returned but never written to the `artifacts` table, even after Task 5. Not part of Task 2's or Task 5's stated acceptance criteria in `docs/09 Sprint Plan.md`, so deliberately not added unprompted — but `docs/10 Task Backlog.md` §3's originally-envisioned pipeline ("validate → persist → stream the reference") still expects it eventually. Add it as its own small piece of work, not silently bundled into something else.
- **`seed-gdelt`'s GDELT query set has not been empirically tuned against real data.** The 4 queries in `trigger/seed-gdelt.ts` and `lib/tags.ts`'s `TAG_KEYWORDS`/`COUNTRY_LOOKUP` are a reasoned first pass, validated so far only against the hand-authored dev fixtures (Task 5) — real GDELT titles may not match the same keyword patterns as cleanly. Re-check once a real seed lands.
- **`staging` Trigger.dev environment does not exist for this project** — only `dev` (local) and `prod` (Cloud) are available.
- **`gpt-4o` was picked without empirically comparing alternatives.** Revisit if cost, latency, or output quality become a concern once live verification actually runs.
- **`.env.example` does not yet document `TRIGGER_PROD_SECRET_KEY`.** Verification-only convenience, not read by app code — add it if that changes.
- **Dev fixtures currently sit in the live ClickHouse `articles` table (20 rows, tagged `dev-fixture`).** Harmless — `seed-gdelt`'s no-op guard excludes them — but they should be cleared (`tasks.trigger("load-dev-fixtures", { clear: true })`) before recording the demo or judging, so nobody mistakes `[DEV FIXTURE]`-prefixed titles for real data. Not urgent; just don't forget before Session 6.
- **A `trigger.dev` CLI/SDK version mismatch surfaced this session** (§4) — `npx trigger.dev@latest` now resolves to `4.5.5` against this project's pinned `4.5.4` SDK packages, and refuses to run. Use `npx trigger.dev@4.5.4 <command>` explicitly until the SDK is deliberately bumped. Same underlying lesson as R-32, just a second occurrence against a different package.
- **`runs.retrieve()`'s `isCompleted`/`isSuccess`/`isFailed`/`isCancelled` booleans do not reliably indicate "this run is done."** Confirmed live: all four stayed `false` for a run that had genuinely finished with `status: "TIMED_OUT"` (`finishedAt` set, a real `error`). Any future polling loop should check `run.finishedAt` truthiness, not those booleans and not a hand-enumerated status list (an earlier version of `scripts/verify-task4-seed-gdelt-live.ts` did the latter and polled forever against this exact run). Both rerun scripts in `scripts/` now use `finishedAt`.
- **Untracked, unreferenced files sit in the repo root** (`architecture.md`, `data.md`, `implementation-guide.md`, `risk-register.md`, `tech-stack.md`, `mirror-visual-system.zip`, `mirror_strategy_bundle.zip`, `skills-lock.json`, two PDFs). Still left untouched per standing instruction; still flag before deleting or relying on them.
- **Never re-alias a derived ClickHouse column back to its own source column's name within the same `SELECT` list.** Caused a real, silent-until-run bug in the Map query (`h3ToGeo` resolved to the wrong, shadowing alias). Fixed; see §3 and `docs/11 Risks.md` R-35. General lesson: always exercise a new or changed ClickHouse query live before considering it done — this class of bug passes every static check.
- **Don't mix `items-end` (or other non-`stretch` cross-axis alignment) with percentage-height children in a flex row.** Caused the Timeline bars to silently render at 0px height. Fixed by switching to explicit pixel heights computed in JS; see §3 and `docs/11 Risks.md` R-36. General lesson: a chart or visual component isn't verified by `tsc`/`eslint`/`next build` passing — it has to actually be looked at, rendered.
- **`ANTHROPIC_API_KEY` note above is now fully moot** — Task 2 runs on OpenAI (`gpt-4o`) and has passed live end-to-end; no further action needed on the model-provider front.
- **Playwright was installed `--no-save` for this session's visual verification and is not a project dependency** — not in `package.json`/`package-lock.json`. Reinstall (`npm install --no-save playwright@1.61.1 && npx playwright install chromium --with-deps`) if headless-browser verification is needed again in a future session; don't add it as a permanent dependency unless the project decides it wants automated visual regression tests.

---

## 9. Exact next backlog item

Task 2 is **fully passed live** — no further action needed. The visual workspace (Session 4/5 work) is **built and live-verified against fixtures** — no further action needed until real GDELT data lands. Task 4 remains the one open item, blocked externally on GDELT. A permanent rerun script is ready:

1. **Once GDELT is reachable again** (sanity-check first: `curl "https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json"`): `set -a; source .env.local; set +a && npx tsx scripts/verify-task4-seed-gdelt-live.ts`. Triggers `seed-gdelt` against `prod`, waits on `finishedAt` (not status strings — see §8), and checks the result against `docs/13 Demo Contract.md` §4's thresholds automatically.
2. After Task 4's real seed lands: **clear the dev fixtures** (`tasks.trigger("load-dev-fixtures", { clear: true })`) so `articles` holds only real rows, then re-run the same spot-check §3's Task 5 section describes (`getBriefingManifest("profile-a")` / `"profile-b"`, confirm differentiation) against the real data — the fixture-based result already proved the query logic works; this step just confirms it holds against real GDELT titles too, and re-verify the visual workspace renders correctly against real data (not just fixtures). Do the manual diversity check by hand (`docs/12 Scope Gate.md` §7.2) at the same time.
3. `scripts/verify-task2-chat-live.ts` remains available to re-confirm Task 2 any time (e.g. after a redeploy) — it should keep passing; no known reason it would regress.
4. Once Task 4 passes live and the visual workspace is re-verified against real data, update `docs/09 Sprint Plan.md`'s status lines to ✅ and move to Session 6 (rehearsal, demo recording, README — `docs/09 Sprint Plan.md`'s Session Plan table). Profile A's live paste-extraction onboarding (currently pre-seeded, the sanctioned Session 5 fallback per `docs/08 MVP.md` §2) can also be picked up here if there's time before the demo.

---

## 10. First action the next Claude Code session should perform

1. Read this document in full (done, if you're reading this).
2. Quickly re-check the one remaining external blocker:
   - GDELT: `curl https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json` — if it responds instead of timing out, run `scripts/verify-task4-seed-gdelt-live.ts` (§9).
3. **If GDELT is now clear:** run that script — no new code, no new credentials, no redeploy needed. Once it passes, clear the dev fixtures, re-verify the visual workspace against real data, run the manual diversity check, and update `docs/09`/`10` status.
4. **If still blocked:** there is no more Stage A code work to pull forward — Task 2 is fully passed, the visual workspace is built and fixture-verified, and Task 4's real seed genuinely needs GDELT to recover. Report status and wait; don't manufacture busywork. Session 6 (rehearsal, demo recording, README) can be picked up early if there's appetite to get ahead, since it doesn't depend on Task 4.
5. Use `npx trigger.dev@4.5.4 <command>`, not `@latest` — see §4/§8 for why.
6. Do not re-run Task 1's connectivity check, Task 2's live verification, Task 3's `init-schema`, or Task 5's fixture-verification — all already passed. Do not re-attempt Task 4 through the **local** `trigger.dev dev` worker for GDELT calls specifically — that path is root-caused as broken in this sandbox type (R-33) for *new third-party hosts*; the Cloud deploy is the permanent fix. (The local worker is fine for ClickHouse-only tasks like `seed-profile-cards`/`load-dev-fixtures`, which is how this session ran them.)

---

## 11. Source notes

Written per an explicit handoff request at the end of a Stage A implementation session. Updated across many subsequent sessions/turns (per `CLAUDE.md`'s standing authorization to continue implementation without re-approval, and later per explicit approved sequencing/infra changes, one explicit instruction to proceed to Task 5 despite two open external blockers, and one explicit instruction to proceed with the approved visual-workspace implementation): after Task 3 was verified live; after Task 4 was written and its local live-run blocker root-caused; after that was resolved by deploying to Trigger.dev Cloud; after a supplied `ANTHROPIC_API_KEY` turned out to belong to a disabled org, prompting a provider swap to OpenAI; after all remaining Cloud-dashboard credential gaps were resolved and live verification was attempted, surfacing and fixing a real `clientData`/`profileId` wiring defect, and confirming Task 2 and Task 4 both dispatch correctly but were blocked by OpenAI account quota and a live GDELT outage respectively; after Task 5 (the real ClickHouse-backed `getBriefing`) was implemented and verified against controlled, clearly-isolated development fixtures; and, in this revision, after **Task 2 passed live** (the OpenAI account's quota cleared on its own, retried on explicit user instruction) and the **full visual workspace was built and live-verified** (Verdict Strip, Impact Radar, Timeline, Map, Evidence Drawer), rendering exclusively from the real `getBriefingManifest()` output, catching and fixing two real bugs (a ClickHouse column-shadowing defect and a CSS flex/percentage-height defect, `docs/11 Risks.md` R-35/R-36) purely through live browser verification rather than static checks. Task 4 remains blocked on GDELT — a real, external outage, not a code or credential problem — and fixture data has never been allowed to be mistaken for satisfying its acceptance bar. Two permanent rerun scripts (`scripts/verify-task2-chat-live.ts`, `scripts/verify-task4-seed-gdelt-live.ts`) remain ready, the first to reconfirm Task 2 any time, the second for the moment GDELT recovers. Reflects repository state as of this revision's commit (see `git log --oneline` for the hash). Does not modify `CLAUDE.md`, `docs/13 Demo Contract.md`, `docs/12 Scope Gate.md`, `docs/08 MVP.md`, `docs/02 Product.md`, or `docs/01 Vision.md` — all five remain frozen, per instruction.
