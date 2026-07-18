# 14 — Engineering Handoff

**Purpose:** let a fresh Claude Code session (no prior chat history) continue this build with zero ambiguity. This document is self-contained — read it before reading anything else, including `CLAUDE.md`.
**This is a living document.** Overwrite it at the end of every future session so it never goes stale.

---

## 1. Current implementation status

**Stage A, Session 1–2, in progress.** Task 1 and Task 3 are fully verified live. Task 2 and Task 4's code are both complete and pass all static checks but are each blocked on something outside the code itself — Task 2 on a missing credential, Task 4 on this session's sandbox networking (§7 below). Task 5 (real ClickHouse-backed tool) and the Session 3–6 work (renderers, personalization, deploy, demo) have not started.

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
| *(see `git log` for the hash of the commit that added this file update)* | Added Task 3: `trigger/init-schema.ts` (creates `articles`/`profile_cards`/`artifacts`, runs the round-trip + H3 sanity acceptance checks, cleans up its own test rows). Verified live — see §3. Updated `docs/09`/`10` status. |

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

### Task 2 — `chat.agent()` fixture — 🟡 code complete, NOT yet run live

`npm run typecheck`, `npm run lint`, `npm run build` all pass clean as of this handoff. The actual `chat.agent()` run (which calls a real Anthropic model to decide to invoke the `getBriefing` tool) has never been executed — `ANTHROPIC_API_KEY` isn't set yet. Do not report Task 2 as passed until it has actually streamed a real response.

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

### Task 4 — `seed-gdelt` ingestion — 🟡 code complete, NOT yet run live (blocked, see §7)

`npm run typecheck`, `npm run lint`, `npm run build` all pass clean. The GDELT DOC 2.0 API contract used by the parser (`{"articles": [{url, title, seendate, domain, language, sourcecountry}]}`, `seendate` as `YYYYMMDDTHHMMSSZ`, `sourcecountry` as a full country name not an ISO code) was verified live via direct `curl`/`node fetch` calls from this session — real, current (2026-07-18) articles came back correctly. The task itself has never completed a live run end-to-end: every attempt to trigger it through the local `trigger.dev dev` worker fails with a TCP connect timeout to `api.gdeltproject.org`, root-caused to a sandbox networking constraint, not a code defect — full detail in §7. Do not report Task 4 as passed until it has actually inserted real rows and the manual diversity check (`docs/12 Scope Gate.md` §7.2) has been run against them.

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

**Trigger.dev:** project `visual-chat-agent` (`proj_nlisinjujntnqjrchglx`), org "Attentionic Inc." CLI is logged in and the login persists locally (no need to re-auth unless working from a different machine/environment). `chat.agent()` `mirror-agent` and tasks `connectivity-check`/`init-schema` are all defined in `trigger/` and discoverable by `trigger.dev dev`. `init-schema` has been invoked live and passed (§3); `mirror-agent` has never actually been invoked.

**Frontend:** `app/page.tsx` renders `Chat` (`app/components/chat.tsx`) — a profile switcher (Profile A / Profile B, no auth), a button that sends the exact Demo Contract question, and a raw-JSON display of whatever the `getBriefing` tool returns. There are no Impact Radar / Timeline / Map visual components yet — that's a later task (after Task 5).

---

## 5. Remaining external credentials required

| Credential | Status | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | ❌ **missing** — this is the only remaining credential blocker | console.anthropic.com → API Keys. Paste directly into `.env.local` yourself, not into chat (see `docs/11 Risks.md` R-31 for why this matters). |

Everything else (ClickHouse credentials, Trigger.dev project ref, Trigger.dev dev secret key) is already obtained and in place — see §6. Task 4's blocker (§7) is an environment/networking constraint, not a missing credential — no credential unblocks it.

If OpenAI is preferred instead of Anthropic: swap `@ai-sdk/anthropic`'s `anthropic("claude-sonnet-4-5")` for `@ai-sdk/openai`'s `openai("gpt-...")` in `trigger/chat.ts` (two-line change, package not yet installed) and use `OPENAI_API_KEY` instead.

---

## 6. Current environment variables expected (`.env.local`, names only — never values)

| Variable | Status | Purpose |
|---|---|---|
| `CLICKHOUSE_URL` | ✅ set | ClickHouse Cloud HTTPS endpoint |
| `CLICKHOUSE_USERNAME` | ✅ set | `default` |
| `CLICKHOUSE_PASSWORD` | ✅ set | ⚠️ was pasted in chat once — treat as exposed, rotate before any public sharing (`docs/11 Risks.md` R-31) |
| `CLICKHOUSE_DATABASE` | not set | optional, defaults to `"default"` in `lib/env.ts` |
| `TRIGGER_SECRET_KEY` | ✅ set | ⚠️ was also pasted in chat once — same rotation note applies |
| `ANTHROPIC_API_KEY` | ❌ placeholder (`REPLACE_ME`) | **the current blocker** — see §5 |

`.env.local` is correctly gitignored (`.gitignore` has `.env.*`). Confirmed: no credential has ever been committed. `.env.example` at the repo root documents the same variables without values.

---

## 7. Outstanding blockers

1. **`ANTHROPIC_API_KEY` not set** (still `REPLACE_ME` as of this handoff) — blocks the live model-call half of Task 2 verification. See item 2 below: even once set, the live run may hit the same sandbox constraint as Task 4.

2. **This development sandbox's background processes cannot reach new third-party hosts — discovered while attempting Task 4's live run.** `npx trigger.dev@latest dev` must run as a long-lived background process (that's how Trigger.dev's local dev mode works — there's no foreground-only alternative). Every attempt to trigger `seed-gdelt` through that background worker failed with:
   ```
   ConnectTimeoutError: Connect Timeout Error (attempted address: api.gdeltproject.org:443, timeout: 10000ms)
   ```
   This was root-caused, not just observed once:
   - A `curl`/`node fetch` call to the exact same GDELT URL, run as a **foreground** command, succeeds immediately (confirmed the API contract used in `trigger/seed-gdelt.ts` — see §3).
   - A plain `node -e` script with no Trigger.dev involvement at all, run as a **background** command, reproduces the identical `ConnectTimeoutError` to the identical host. This isolates the cause to *this session's background-process networking*, not to Trigger.dev, not to GDELT, and not to the seed task's code.
   - By contrast, the same background `trigger.dev dev` worker successfully reached ClickHouse Cloud for both Task 1 and Task 3 — so this isn't "background processes have no network," it's specifically new/arbitrary third-party hosts from a backgrounded process.

   **Why this matters beyond Task 4:** the same mechanism will very likely block **Task 2's live verification too**, once `ANTHROPIC_API_KEY` is set — `chat.agent()`'s model call also runs inside the same backgrounded `trigger.dev dev` worker and would be connecting to `api.anthropic.com`, a host that worker has never reached before either. Don't be surprised if Task 2's live test times out the same way; if it does, it's this same environmental constraint, not a code or credential problem.

   **This is specific to developing inside this particular sandboxed session — not a property of the product, Trigger.dev, or GDELT.** Three ways to unblock, in likely order of convenience:
   - Run `npx trigger.dev@latest dev` (and the verification script) on a normal developer machine / unrestricted shell outside this sandbox — the code needs zero changes.
   - `npx trigger.dev@latest deploy` to a Trigger.dev Cloud environment (dev or staging) — those workers run on Trigger.dev's own infrastructure with normal internet access, so both Task 2 and Task 4 could be verified there without leaving this session. This moves the "Deploy" step earlier than `docs/09 Sprint Plan.md`'s Session 6 plan, so it's worth a quick confirmation before doing it rather than assuming it's in scope for right now.
   - Ask whoever operates the host machine this sandbox runs on whether background-process egress to arbitrary new hosts can be allowed for this session.

No other blockers. ClickHouse and Trigger.dev are both fully provisioned, connected, and verified. The product schema now exists.

---

## 8. Known technical debt

- **Monorepo → single app.** Documented in §4 — intentional, not a defect, but future sessions should not "fix" this back to match `docs/07 Tech Stack.md` literally; that doc is superseded here per its own scope-drift banner.
- **Two credentials exposed in chat transcript** (`CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`) — see `docs/11 Risks.md` R-31. Rotate both before making this repository public.
- **`_scratch_connectivity_check` table** exists in the ClickHouse service and is not yet cleaned up. Harmless (a few rows), explicitly deferred until Task 5 is stable per the comment in `trigger/connectivity-check.ts`.
- **ClickHouse Cloud service accepts connections from anywhere** (no IP allowlist) — a deliberate, low-priority trade-off (restricting it would require allowlisting Vercel/Trigger.dev's rotating egress IPs). Revisit only if unexpected usage/billing appears.
- **`.trigger/` local build-cache directory** exists at the repo root from running `trigger.dev dev` locally. Gitignored, harmless, safe to delete if it grows large.
- **No artifact persistence yet** — the `getBriefing` tool's fixture output is not written to any table. This is expected; the `artifacts` table now exists (Task 3), but the real tool write lands with Task 5, not before.
- **`seed-gdelt`'s GDELT query set has not been empirically tuned.** The 4 queries in `trigger/seed-gdelt.ts` (`ai-regulation`, `climate-energy`, `markets`, `geopolitics`) and the `TAG_KEYWORDS`/`COUNTRY_LOOKUP` tables are a reasoned first pass, not yet validated against real result counts or the Demo Contract §4 thresholds (≥150 articles, ≥30 per profile side, ≥5 countries) because the task has never completed a live run (§7). Expect to iterate on query wording or the keyword list once real output is visible.
- **Untracked, unreferenced files sit in the repo root** (`architecture.md`, `data.md`, `implementation-guide.md`, `risk-register.md`, `tech-stack.md`, `mirror-visual-system.zip`, `mirror_strategy_bundle.zip`, `skills-lock.json`, two PDFs). These are not part of `docs/00`–`14` and are not read or referenced by any task in this plan — they appear to be earlier source/research material (note `risk-register.md` matches the "Deep Research corpus" cited in `docs/11 Risks.md`'s source notes). Left untouched and un-actioned; flag to the user before deleting or relying on them, since their provenance wasn't established in this session.

---

## 9. Exact next backlog item

Task 2's and Task 4's code are both **done**; both are waiting on the same class of problem (§7) rather than on more code. There is no more code-only work available in Stage A until one of these unblocks — Task 5 depends on Task 4's real data, and the renderer work (Session 4) depends on Task 5.

**Unblock path (pick one, then run both verifications in the same environment):**

1. **Preferred — verify outside this sandbox.** On a normal developer machine (or any shell without this session's background-process networking restriction): pull the latest commit, set `ANTHROPIC_API_KEY` in `.env.local`, run `npx trigger.dev@latest dev`, and do both of the following:
   - **Task 2:** trigger `mirror-agent` with the exact Demo Contract question ("What should I know today?") and `profileId: "profile-a"`, then again with `"profile-b"`. Confirm each run completes, `getBriefing` fires, and the output validates against `visualResponseManifestSchema`. Confirm the two manifests differ (verdict, top Impact Radar item).
   - **Task 4:** trigger `seed-gdelt`. Confirm it completes, check the returned summary (`totalInserted`, `distinctCountries`, `perTopicFetched`) against `docs/13 Demo Contract.md` §4's thresholds (≥150 articles, ≥30 per profile side, ≥5 countries, within 14 days). Then do the manual diversity check by hand in the ClickHouse console (`docs/12 Scope Gate.md` §7.2) before writing any more code.
   - For both, a small script using `tasks.trigger`/`runs.retrieve` is the fastest path (see `trigger/init-schema.ts`'s pattern for the shape) — write it outside the tracked tree or delete it after use, as was done for Tasks 1, 3, and the (failed) Task 4 attempt in this session.
2. **Alternative — deploy to Trigger.dev Cloud.** `npx trigger.dev@latest deploy` to a dev/staging environment moves execution onto Trigger.dev's own infrastructure, which has normal internet access. This works from inside this sandbox too, but it's an earlier "Deploy" than `docs/09 Sprint Plan.md`'s Session 6 plan — confirm with the user first rather than doing it as a side effect of unblocking a test.

Once both pass, update `docs/09 Sprint Plan.md`'s Task 2 and Task 4 status lines to ✅ (same pattern as Task 1's/Task 3's), commit, and move to **Task 5** (`docs/09 Sprint Plan.md` / `docs/10 Task Backlog.md` §2): replace `getBriefing`'s fixture body with the real ranked-signal/timeline/H3 ClickHouse queries against the seeded `articles` table.

---

## 10. First action the next Claude Code session should perform

1. Read this document in full (done, if you're reading this).
2. Check whether `ANTHROPIC_API_KEY` is set in `.env.local` (presence check only, never display the value). If not, ask the user for it using the same safe pattern as every prior credential in this build (paste into `.env.local`, never into chat).
3. Ask the user which unblock path from §9 they want (verify on their own machine vs. have this session deploy to Trigger.dev Cloud) — don't guess, since deploying is a step ahead of the planned sequence and worth a quick confirmation.
4. Do not re-run Task 1's connectivity check or Task 3's `init-schema` as a first step — both already passed live and re-running either adds nothing (though `init-schema` is safe to re-run if ever needed, since it's idempotent and self-cleaning).
5. Do not re-attempt Task 2 or Task 4's live run inside this same kind of sandboxed session without first confirming background-process networking has actually changed — otherwise this will just reproduce the same `ConnectTimeoutError` and burn time re-discovering §7.

---

## 11. Source notes

Written per an explicit handoff request at the end of a Stage A implementation session. Updated twice in a subsequent autonomous session (per `CLAUDE.md`'s standing authorization to continue implementation without re-approval): once after Task 3 (ClickHouse schema) was written and verified live, and again after Task 4 (`seed-gdelt`) was written, statically verified, and its live run investigated to a definitive root cause (§7) — the session stopped there rather than guessing further, since unblocking it is an environment/deployment decision, not an implementation one. Reflects repository state as of commit `e5a45e4` plus Task 3's `trigger/init-schema.ts`, Task 4's `trigger/seed-gdelt.ts`, and the documentation updates committed alongside this revision. Does not modify `CLAUDE.md`, `docs/13 Demo Contract.md`, `docs/12 Scope Gate.md`, `docs/08 MVP.md`, `docs/02 Product.md`, or `docs/01 Vision.md` — all five remain frozen, per instruction.
