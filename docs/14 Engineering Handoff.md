# 14 — Engineering Handoff

**Purpose:** let a fresh Claude Code session (no prior chat history) continue this build with zero ambiguity. This document is self-contained — read it before reading anything else, including `CLAUDE.md`.
**This is a living document.** Overwrite it at the end of every future session so it never goes stale.

---

## 1. Current implementation status

**Stage A, Session 1–2, in progress.** Task 1 and Task 3 are fully verified live. Task 2 and Task 4's code are both complete, statically clean, and now **deployed to Trigger.dev Cloud** (`prod` environment, version `20260719.2`, 4 tasks) — this deployment happened specifically to route around a local-sandbox networking limitation that blocked verifying either task through the local `trigger.dev dev` worker (`docs/11 Risks.md` R-33). Task 2's model provider was also swapped from Anthropic to OpenAI mid-session (`docs/11 Risks.md` R-22 — the Anthropic org behind this project's key was disabled). Both tasks still need manual dashboard/credential steps before their live verification can run — see §7. Task 5 (real ClickHouse-backed tool) and the Session 3–6 work (renderers, personalization, demo) have not started.

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
| *(see `git log` for the hash of the commit that added this file update)* | User provided `ANTHROPIC_API_KEY` (into chat, not `.env.local` — treated as exposed regardless of outcome, `docs/11 Risks.md` R-31). Live test revealed the Anthropic organization behind it was disabled at the account level (`docs/11 Risks.md` R-22), not a code or format problem. Swapped `mirror-agent`'s model provider from `@ai-sdk/anthropic` to `@ai-sdk/openai` (`gpt-4o`) in `trigger/chat.ts`; removed the unused `@ai-sdk/anthropic` dependency; updated `.env.example`. Redeployed to Trigger.dev Cloud (`prod`, version `20260719.2`). Updated `docs/09`/`10`/`11`/`14` status. |

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

### Task 2 — `chat.agent()` fixture — 🟡 code complete, deployed, NOT yet run live

`npm run typecheck`, `npm run lint`, `npm run build` all pass clean as of this handoff, and `mirror-agent` is live on Trigger.dev Cloud (`prod`, version `20260719.2`). The actual `chat.agent()` run (which calls a real model to decide to invoke the `getBriefing` tool) has never been executed.

**Model provider is now OpenAI, not Anthropic.** A user-provided `ANTHROPIC_API_KEY` was tested live (`curl` directly against `api.anthropic.com/v1/messages`, model `claude-sonnet-5`) and rejected with `"This organization has been disabled."` — an account-level state (billing/compliance review), not a code, format, or model-ID problem; confirmed via a direct API call, not inferred. The org is under appeal with no known resolution time (`docs/11 Risks.md` R-22). Rather than block on that, `trigger/chat.ts` was switched to `@ai-sdk/openai`'s `openai("gpt-4o")`. **`ANTHROPIC_API_KEY` is no longer used anywhere in this codebase** — do not re-add it without a product/infra reason; `OPENAI_API_KEY` is the credential that now matters for Task 2 (§5/§6/§7). Do not report Task 2 as passed until it has actually streamed a real response from OpenAI.

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
- Redeployed: `npx trigger.dev@latest deploy --env prod` → `Version 20260719.2 deployed with 4 detected tasks`.

**Net effect on the rest of this document:** every remaining reference to `ANTHROPIC_API_KEY` as Task 2's blocking credential should be read as `OPENAI_API_KEY` instead — the credential changed, the blocker shape (needs to be in `.env.local` for local dev and the Trigger.dev Cloud `prod` environment for the deployed task) did not.

### Task 4 — `seed-gdelt` ingestion — 🟡 code complete, deployed, NOT yet run live (blocked, see §7)

`npm run typecheck`, `npm run lint`, `npm run build` all pass clean. The GDELT DOC 2.0 API contract used by the parser (`{"articles": [{url, title, seendate, domain, language, sourcecountry}]}`, `seendate` as `YYYYMMDDTHHMMSSZ`, `sourcecountry` as a full country name not an ISO code) was verified live via direct `curl`/`node fetch` calls from this session — real, current (2026-07-18) articles came back correctly. Every attempt to trigger the task through the local `trigger.dev dev` worker failed with a TCP connect timeout to `api.gdeltproject.org`, root-caused to this session's sandbox networking (`docs/11 Risks.md` R-33), not a code defect. `seed-gdelt` is now deployed to Trigger.dev Cloud (`prod`) instead, which has normal internet access — but it still hasn't completed a live run there, because the `prod` environment has no `CLICKHOUSE_*` variables yet (§7). Do not report Task 4 as passed until it has actually inserted real rows and the manual diversity check (`docs/12 Scope Gate.md` §7.2) has been run against them.

---

## 4. Current architecture state

**Deliberate deviation from `docs/07 Tech Stack.md`:** this is a single Next.js app at the repo root, not a pnpm/Turborepo monorepo with separate `apps/`/`packages/`. That doc's monorepo design was sized for a multi-package, multi-team build; at this scope (three ClickHouse tables, one agent, one tool) a monorepo is unnecessary setup overhead. Package manager is **npm**, not pnpm. This is implementation-level, not a product decision — no approval was needed or sought.

**Repo layout as it exists right now:**
```
/
├── app/
│   ├── layout.tsx, page.tsx, globals.css
│   ├── actions.ts              (server actions: startChatSession, mintChatAccessToken)
│   └── components/chat.tsx     (profile switcher + demo question + raw manifest JSON display)
├── lib/
│   ├── env.ts                  (Zod validation for CLICKHOUSE_* vars)
│   ├── clickhouse.ts           (singleton @clickhouse/client)
│   └── visual-response.ts      (MVRP manifest Zod schema — impactRadar/timeline/map)
├── trigger/
│   ├── connectivity-check.ts   (Task 1 diagnostic — safe to delete once Task 5 is stable)
│   ├── init-schema.ts          (Task 3 — creates the 3 product tables + runs acceptance checks)
│   ├── seed-gdelt.ts           (Task 4 — GDELT ingestion, code complete, live run blocked — see §7)
│   └── chat.ts                 (mirror-agent chat.agent() + getBriefing fixture tool)
├── trigger.config.ts           (real project ref: proj_nlisinjujntnqjrchglx)
├── docs/                       (00-14, this file included)
└── package.json / tsconfig.json / eslint.config.mjs / next.config.mjs / postcss.config.mjs
```

**ClickHouse Cloud:** service `visual-chat-agent`, Mini tier, 1 replica, 12 GiB, region `ca-central-1` (AWS), status running. Contains four tables: `_scratch_connectivity_check` (Task 1's diagnostic — not product schema, still unremoved) and the three product tables `articles`, `profile_cards`, `artifacts` (Task 3, created, empty — 0 rows in all three as of this handoff). `articles.h3_r5` is a `MATERIALIZED` column computed server-side via `geoToH3(longitude, latitude, 5)`; `profile_cards.item_type` is an `Enum8('goal'=1,'interest'=2,'entity'=3,'location'=4)`.

**Trigger.dev:** project `visual-chat-agent` (`proj_nlisinjujntnqjrchglx`), org "Attentionic Inc." CLI is logged in and the login persists locally (no need to re-auth unless working from a different machine/environment). All 4 tasks (`connectivity-check`, `init-schema`, `seed-gdelt`, `mirror-agent`) are deployed live to the `prod` environment as version `20260719.2` — see the Deployment and Provider swap records in §3. `init-schema` has been invoked live and passed; `seed-gdelt` and `mirror-agent` have not yet been invoked live (both need env vars in `prod` first — §7). The `staging` environment does not exist for this project (confirmed live, §3) — `prod` is the only deploy target available.

**Frontend:** `app/page.tsx` renders `Chat` (`app/components/chat.tsx`) — a profile switcher (Profile A / Profile B, no auth), a button that sends the exact Demo Contract question, and a raw-JSON display of whatever the `getBriefing` tool returns. There are no Impact Radar / Timeline / Map visual components yet — that's a later task (after Task 5).

---

## 5. Remaining external credentials required

Two separate places need credentials now: **local `.env.local`** (for local dev / this session's own scripts) and **the Trigger.dev Cloud `prod` environment's dashboard** (for the deployed tasks — a completely separate store, not synced from `.env.local` automatically). See §7 for the exact dashboard steps.

| Credential | Status locally (`.env.local`) | Status on Trigger.dev Cloud (`prod`) | Where to get it |
|---|---|---|---|
| `OPENAI_API_KEY` | ❌ missing (`REPLACE_ME`) | ❌ not set | platform.openai.com → API Keys. |
| `CLICKHOUSE_URL` / `CLICKHOUSE_USERNAME` / `CLICKHOUSE_PASSWORD` | ✅ set | ❌ not set | Already have these locally — just need to be copied into the Trigger.dev dashboard too. |
| `CLICKHOUSE_DATABASE` | not set (defaults to `"default"`) | not set | Optional either place. |

**`ANTHROPIC_API_KEY` is no longer used anywhere in this project** (§3 Provider swap) — don't chase it as a blocker; `OPENAI_API_KEY` replaced it for Task 2.

**Do not paste any of these into chat, and do not ask the user to.** Local values go in `.env.local` (the established pattern in this project — see `docs/11 Risks.md` R-31, now recurred twice). Cloud values go directly into the Trigger.dev dashboard's Environment Variables page (§7) — never through this conversation, and an automated script-based path was tried and failed (`docs/11 Risks.md` R-34).

---

## 6. Current environment variables expected (`.env.local`, names only — never values)

| Variable | Status | Purpose |
|---|---|---|
| `CLICKHOUSE_URL` | ✅ set | ClickHouse Cloud HTTPS endpoint |
| `CLICKHOUSE_USERNAME` | ✅ set | `default` |
| `CLICKHOUSE_PASSWORD` | ✅ set | ⚠️ was pasted in chat once — treat as exposed, rotate before any public sharing (`docs/11 Risks.md` R-31) |
| `CLICKHOUSE_DATABASE` | not set | optional, defaults to `"default"` in `lib/env.ts` |
| `TRIGGER_SECRET_KEY` | ✅ set | ⚠️ was also pasted in chat once — same rotation note applies. This is a **dev-environment-scoped** secret key — it cannot trigger or manage the `prod` environment's runs (a separate, `prod`-scoped secret key would be needed for that, and none is currently held anywhere in this project). |
| `OPENAI_API_KEY` | ❌ placeholder (`REPLACE_ME`) | **a current blocker** — see §5/§7. Replaces `ANTHROPIC_API_KEY`, which is no longer used anywhere in this project (§3 Provider swap) — a live-tested key for it was pasted in chat, found to belong to a disabled Anthropic org, and removed from `.env.local` entirely. |

`.env.local` is correctly gitignored (`.gitignore` has `.env.*`). Confirmed: no credential has ever been committed. `.env.example` at the repo root documents the same variables without values. **None of these are synced to Trigger.dev Cloud automatically** — Cloud environment variables are a separate store (§5/§7).

---

## 7. Outstanding blockers

The local-sandbox networking limitation that originally blocked Task 4 (R-33 — local background processes time out connecting to new third-party hosts like `api.gdeltproject.org`, root-caused with a minimal repro outside Trigger.dev entirely) is **resolved for verification purposes**: the project is now deployed to Trigger.dev Cloud (`prod`, version `20260719.2`, §3), whose workers run on Trigger.dev's own infrastructure with normal internet access. What remains are environment-variable and credential gaps in that Cloud environment — three concrete manual actions, none of which can be done by pasting anything into this chat:

**1. Add `OPENAI_API_KEY` to the Trigger.dev Cloud `prod` environment** (blocks Task 2 — this replaces the earlier `ANTHROPIC_API_KEY` ask; see the Provider swap record in §3 for why):
   - Get a key from platform.openai.com → API Keys.
   - Go to `https://cloud.trigger.dev/projects/v3/proj_nlisinjujntnqjrchglx` → **Environment Variables** → **New environment variable** → environment **prod** → name `OPENAI_API_KEY` → mark **Secret** → paste the value directly into that dashboard field (not into `.env.local`, not into this chat — the Cloud environment is a separate store, §5).
   - Optional but recommended: also add it to `.env.local` (`OPENAI_API_KEY=...`, replacing `REPLACE_ME`) so local dev has it too — the two are independent.

**2. Add the ClickHouse credentials to the same Cloud `prod` environment** (blocks Task 4):
   - Same dashboard page, environment **prod**, add `CLICKHOUSE_URL`, `CLICKHOUSE_USERNAME`, `CLICKHOUSE_PASSWORD` (mark each **Secret**) — copy these from `.env.local`, where they already exist.
   - An automated push of these was attempted this session via the SDK's `envvars.upload()` management call (scripted, no chat exposure) and failed with a 401 — see `docs/11 Risks.md` R-34. The dashboard is the only path confirmed to work.

**3. A way to trigger runs in `prod` for verification** — the `TRIGGER_SECRET_KEY` currently in `.env.local` is scoped to the **dev** environment only and cannot trigger or inspect `prod` runs. Two options:
   - **Recommended:** get the `prod`-scoped secret key from the same dashboard project → **API Keys** page, add it to `.env.local` as e.g. `TRIGGER_PROD_SECRET_KEY` (same paste-not-chat pattern as every other credential here) — this lets live verification continue the same scripted way Tasks 1/3 were verified (`tasks.trigger()` / `runs.retrieve()`).
   - **Alternative, no key needed:** use the dashboard's own test UI directly — `https://cloud.trigger.dev/projects/v3/proj_nlisinjujntnqjrchglx/test?environment=prod` — to manually trigger `mirror-agent` and `seed-gdelt` and read their results in the browser. Slower to iterate on, but requires nothing new from this session.

Once all three are in place, live verification of Task 2 and Task 4 can proceed exactly as described in `docs/09 Sprint Plan.md`'s acceptance criteria — see §9 below for the precise steps.

No other blockers. ClickHouse and Trigger.dev are both fully provisioned, connected, and verified. The product schema exists. The code for both Task 2 and Task 4 is finished and deployed — everything left is credentials and dashboard configuration, not implementation.

---

## 8. Known technical debt

- **Monorepo → single app.** Documented in §4 — intentional, not a defect, but future sessions should not "fix" this back to match `docs/07 Tech Stack.md` literally; that doc is superseded here per its own scope-drift banner.
- **Three credentials exposed in chat transcript** (`CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`, and an `ANTHROPIC_API_KEY` that turned out to belong to a disabled org and is no longer used) — see `docs/11 Risks.md` R-31. Rotate the first two before making this repository public; the third is moot (non-functional, already removed from `.env.local`) but should not be reused if the Anthropic appeal succeeds.
- **`_scratch_connectivity_check` table** exists in the ClickHouse service and is not yet cleaned up. Harmless (a few rows), explicitly deferred until Task 5 is stable per the comment in `trigger/connectivity-check.ts`.
- **ClickHouse Cloud service accepts connections from anywhere** (no IP allowlist) — a deliberate, low-priority trade-off (restricting it would require allowlisting Vercel/Trigger.dev's rotating egress IPs). Revisit only if unexpected usage/billing appears.
- **`.trigger/` local build-cache directory** exists at the repo root from running `trigger.dev dev` locally. Gitignored, harmless, safe to delete if it grows large.
- **No artifact persistence yet** — the `getBriefing` tool's fixture output is not written to any table. This is expected; the `artifacts` table now exists (Task 3), but the real tool write lands with Task 5, not before.
- **`seed-gdelt`'s GDELT query set has not been empirically tuned.** The 4 queries in `trigger/seed-gdelt.ts` (`ai-regulation`, `climate-energy`, `markets`, `geopolitics`) and the `TAG_KEYWORDS`/`COUNTRY_LOOKUP` tables are a reasoned first pass, not yet validated against real result counts or the Demo Contract §4 thresholds (≥150 articles, ≥30 per profile side, ≥5 countries) because the task has never completed a live run (§7). Expect to iterate on query wording or the keyword list once real output is visible.
- **`staging` Trigger.dev environment does not exist for this project** — only `dev` (local) and `prod` (Cloud) are available. If a genuine staging tier is wanted later, it needs to be provisioned/enabled from the dashboard first; not investigated further since `prod` was sufficient to unblock verification.
- **No `prod`-scoped `TRIGGER_SECRET_KEY` held anywhere in this project yet** — only the `dev`-scoped one in `.env.local`. This blocks scripted live verification of the now-deployed `prod` tasks until one is added (§7 item 3).
- **`gpt-4o` was picked without empirically comparing alternatives.** It's a safe, known-good, tool-calling-capable default (§3 Provider swap), not a researched "best" choice — revisit if cost, latency, or output quality become a concern once live verification actually runs.
- **Untracked, unreferenced files sit in the repo root** (`architecture.md`, `data.md`, `implementation-guide.md`, `risk-register.md`, `tech-stack.md`, `mirror-visual-system.zip`, `mirror_strategy_bundle.zip`, `skills-lock.json`, two PDFs). These are not part of `docs/00`–`14` and are not read or referenced by any task in this plan — they appear to be earlier source/research material (note `risk-register.md` matches the "Deep Research corpus" cited in `docs/11 Risks.md`'s source notes). Left untouched and un-actioned per explicit instruction this session; still flag before deleting or relying on them, since their provenance wasn't established.

---

## 9. Exact next backlog item

Task 2's and Task 4's code are both **done and deployed**. What's left is entirely the three manual dashboard/credential actions in §7 — there is no more code-only work available in Stage A until those land. Once they do:

1. **Verify Task 2 live:** trigger `mirror-agent` (`prod`, now running on OpenAI's `gpt-4o` — §3 Provider swap) with the exact Demo Contract question ("What should I know today?") and `profileId: "profile-a"`, then again with `"profile-b"`. Confirm each run completes, `getBriefing` fires, and the output validates against `visualResponseManifestSchema`. Confirm the two manifests differ (verdict, top Impact Radar item) — this is the fixture-data version of the Demo Contract's core claim.
2. **Verify Task 4 live:** trigger `seed-gdelt` (`prod`). Confirm it completes, check the returned summary (`totalInserted`, `distinctCountries`, `perTopicFetched`) against `docs/13 Demo Contract.md` §4's thresholds (≥150 articles, ≥30 per profile side, ≥5 countries, within 14 days). Then do the manual diversity check by hand in the ClickHouse console (`docs/12 Scope Gate.md` §7.2) before writing any more code.
3. If using the scripted path (§7 item 3, recommended): a small script using `tasks.trigger`/`runs.retrieve` targeting the `prod`-scoped secret key is the fastest way to do both — see `trigger/init-schema.ts`'s pattern for the shape — write it outside the tracked tree or delete it after use, as was done for every prior live verification in this project.
4. Once both pass, update `docs/09 Sprint Plan.md`'s Task 2 and Task 4 status lines to ✅ (same pattern as Task 1's/Task 3's), commit, and move to **Task 5** (`docs/09 Sprint Plan.md` / `docs/10 Task Backlog.md` §2): replace `getBriefing`'s fixture body with the real ranked-signal/timeline/H3 ClickHouse queries against the seeded `articles` table.

---

## 10. First action the next Claude Code session should perform

1. Read this document in full (done, if you're reading this).
2. Check whether the three items in §7 have landed: `OPENAI_API_KEY` (not `ANTHROPIC_API_KEY` — see §3 Provider swap) and `CLICKHOUSE_*` in the Trigger.dev Cloud `prod` environment, and either a `prod`-scoped secret key in `.env.local` or a plan to verify via the dashboard's test UI.
   - **If all three are in place:** proceed directly to §9's live verification steps.
   - **If not:** don't idle waiting — there is genuinely no other Stage A code work available until these land (Task 5 depends on Task 4's real data). Ask the user for whichever of the three is still missing, using the exact dashboard/`.env.local` paths in §7 — never ask for a value to be pasted into chat.
3. Do not re-run Task 1's connectivity check or Task 3's `init-schema` as a first step — both already passed live and re-running either adds nothing (though `init-schema` is safe to re-run if ever needed, since it's idempotent and self-cleaning).
4. Do not re-attempt Task 2 or Task 4's live run through the **local** `trigger.dev dev` worker — that path is root-caused as broken in this sandbox type (R-33) and deploying to Cloud was the fix, not a workaround to retry differently.

---

## 11. Source notes

Written per an explicit handoff request at the end of a Stage A implementation session. Updated across four subsequent sessions/turns (per `CLAUDE.md`'s standing authorization to continue implementation without re-approval, and later per explicit approved sequencing/infra changes): after Task 3 (ClickHouse schema) was written and verified live; after Task 4 (`seed-gdelt`) was written, statically verified, and its local live-run blocker investigated to a definitive root cause; after that blocker was resolved by deploying the project to Trigger.dev Cloud (`prod`, version `20260719.1`) — an explicitly approved earlier-than-planned deploy; and after the user's supplied `ANTHROPIC_API_KEY` turned out to belong to a disabled Anthropic organization, prompting a provider swap to OpenAI and a redeploy (`prod`, version `20260719.2`). The Cloud-credential-automation attempt from the deploy step still did not succeed (`docs/11 Risks.md` R-34), so this revision stops at the three manual dashboard/credential actions in §7 (now for `OPENAI_API_KEY`, not `ANTHROPIC_API_KEY`) rather than guessing further at unauthenticated API workarounds. Reflects repository state as of commit `dc8d63c` plus the provider-swap changes and documentation updates committed alongside this revision. Does not modify `CLAUDE.md`, `docs/13 Demo Contract.md`, `docs/12 Scope Gate.md`, `docs/08 MVP.md`, `docs/02 Product.md`, or `docs/01 Vision.md` — all five remain frozen, per instruction.
