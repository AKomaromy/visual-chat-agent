# 14 — Engineering Handoff

**Purpose:** let a fresh Claude Code session (no prior chat history) continue this build with zero ambiguity. This document is self-contained — read it before reading anything else, including `CLAUDE.md`.
**This is a living document.** Overwrite it at the end of every future session so it never goes stale.

---

## 1. Current implementation status

**Stage A, Session 1–2, in progress.** Task 1 and Task 3 are fully verified live. Task 2 and Task 4's code are both complete, deployed to Trigger.dev Cloud (`prod`, version `20260719.3`), and **all required credentials are confirmed correctly configured there** — every remaining credential/dashboard blocker from earlier in this session is resolved. Both tasks were live-tested this session and both hit a **real external blocker with nothing left to fix in code**: Task 2 on OpenAI account quota (`docs/11 Risks.md` R-22), Task 4 on a live GDELT API outage (`docs/11 Risks.md` R-05). A genuine implementation defect was also found and fixed along the way (§3, Task 2 — `clientData`/`profileId` was never wired to the model). Task 5 (real ClickHouse-backed tool) and the Session 3–6 work (renderers, personalization, demo) have not started; both remaining blockers are outside this project's code, so there is no further Stage A code work available until one of them clears.

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
| *(see `git log` for the hash of the commit that added this file update)* | Found and fixed a real defect before the first live chat attempt: `run()` never read `clientData`, so the model had no way to know which profile was active. Fixed via `onChatStart` + `chat.prompt.set()` in `trigger/chat.ts`. Redeployed (`prod`, version `20260719.3`). Live-verified the full session/dispatch path for `mirror-agent` (reached `WAITING` with the correct payload) — blocked only on OpenAI quota, confirmed still failing after the user's reported billing fix. Live-attempted `seed-gdelt` twice on Cloud — confirmed `CLICKHOUSE_*` credentials work, but both attempts hit a genuine `api.gdeltproject.org` outage, isolated via an independent `curl` failure at the same time. Added R-05/R-22 occurrence notes to `docs/11 Risks.md`. Updated `docs/09`/`10`/`14` status. |

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

### Task 2 — `chat.agent()` — 🟡 code complete, deployed, live-tested, blocked on OpenAI account quota (external)

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

Root cause: `OPENAI_API_KEY` itself, re-tested directly against `api.openai.com/v1/chat/completions` immediately after — still `429 insufficient_quota`, the *same* error as before the user's reported OpenAI billing fix. **This confirms the Cloud dispatch path is fully correct** (session creation, secret-key auth, payload wiring, `clientData` fix all working) — the only failure is the OpenAI account itself not having usable quota yet. Nothing left to fix in this codebase; see `docs/11 Risks.md` R-22 for the exact error and next steps on the OpenAI side (check **Settings → Limits**, not just **Settings → Billing** — a common gotcha where a payment method is added but the usage limit is still $0).

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

**Trigger.dev:** project `visual-chat-agent` (`proj_nlisinjujntnqjrchglx`), org "Attentionic Inc." CLI is logged in and the login persists locally (no need to re-auth unless working from a different machine/environment). All 4 tasks (`connectivity-check`, `init-schema`, `seed-gdelt`, `mirror-agent`) are deployed live to the `prod` environment as version `20260719.3` — see the Deployment and Provider swap records in §3. `init-schema` has been invoked live and passed; `seed-gdelt` and `mirror-agent` have both been invoked live and correctly dispatched (session/payload/credentials all confirmed working) but each hit a real external blocker before completing (§3, §7). The `staging` environment does not exist for this project (confirmed live, §3) — `prod` is the only deploy target available.

**Frontend:** `app/page.tsx` renders `Chat` (`app/components/chat.tsx`) — a profile switcher (Profile A / Profile B, no auth), a button that sends the exact Demo Contract question, and a raw-JSON display of whatever the `getBriefing` tool returns. There are no Impact Radar / Timeline / Map visual components yet — that's a later task (after Task 5).

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

## 7. Outstanding blockers — both external, neither fixable in this codebase

The local-sandbox networking limitation that originally blocked Task 4 (R-33) is resolved via the Cloud deploy. Every credential/dashboard gap from earlier in this session (§5) is resolved. What's left:

**1. OpenAI account has no usable quota (blocks Task 2).** `OPENAI_API_KEY` authenticates correctly but every call returns `429 insufficient_quota`, confirmed live twice — once before the user reported adding OpenAI billing, once after, with the identical result both times (`docs/11 Risks.md` R-22). Likely causes, roughly in order of likelihood: the payment method was added but a separate **usage limit** on platform.openai.com → **Settings → Limits** is still $0 (a common gotcha distinct from just having a card on file); the billing change hasn't propagated yet (can take a few minutes on OpenAI's side); or the payment method was added to a different org/project than the one that issued this key. **Action needed:** the user checks platform.openai.com directly. Once fixed, re-run the live verification — no code or redeploy needed, just re-trigger.

**2. GDELT's API is currently unreachable (blocks Task 4).** `api.gdeltproject.org` failed to connect from three independent network paths at the same time, while unrelated hosts (including GDELT's own marketing site) responded normally — a real, live outage of that specific API, not anything in this project (`docs/11 Risks.md` R-05). **Action needed:** none from the user — just wait and retry. Before re-triggering `seed-gdelt`, sanity-check with a plain `curl https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json` to confirm it's back before spending a run on it.

Both are naturally transient — nothing in this project's code, configuration, or credentials needs to change for either to resolve. See §9 for the exact re-verification steps once each clears.

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
- **`gpt-4o` was picked without empirically comparing alternatives.** It's a safe, known-good, tool-calling-capable default (§3 Provider swap), not a researched "best" choice — revisit if cost, latency, or output quality become a concern once live verification actually runs.
- **`.env.example` does not yet document `TRIGGER_PROD_SECRET_KEY`.** It's currently a verification-only convenience (not read by any app code, only by this session's throwaway scripts), so it was left out deliberately; add it if a future session starts depending on it for something durable.
- **Untracked, unreferenced files sit in the repo root** (`architecture.md`, `data.md`, `implementation-guide.md`, `risk-register.md`, `tech-stack.md`, `mirror-visual-system.zip`, `mirror_strategy_bundle.zip`, `skills-lock.json`, two PDFs). These are not part of `docs/00`–`14` and are not read or referenced by any task in this plan — they appear to be earlier source/research material (note `risk-register.md` matches the "Deep Research corpus" cited in `docs/11 Risks.md`'s source notes). Left untouched and un-actioned per explicit instruction this session; still flag before deleting or relying on them, since their provenance wasn't established.

---

## 9. Exact next backlog item

Task 2's and Task 4's code are both **done, deployed, and live-tested** — the dispatch path, credentials, and (for Task 2) a real bug are all confirmed working. What's left is waiting out two external conditions (§7), then re-running the exact same verification that already ran once:

1. **Once OpenAI quota is fixed:** re-trigger `mirror-agent` (`prod`) for `profile-a` then `profile-b` with the exact Demo Contract question. This session's verification script (a real session-protocol call, not the offline `mockChatAgent` test harness — see `docs/ai-chat/testing.mdx` for why that harness doesn't apply here, it never calls a real model) already proved the dispatch path works; only the model call itself needs to succeed this time. Confirm `getBriefing` fires and the two manifests differ (verdict, top Impact Radar item).
2. **Once GDELT is reachable again:** re-trigger `seed-gdelt` (`prod`) — sanity-check with a plain `curl` to `api.gdeltproject.org` first (§7). Confirm the returned summary (`totalInserted`, `distinctCountries`, `perTopicFetched`) against `docs/13 Demo Contract.md` §4's thresholds (≥150 articles, ≥30 per profile side, ≥5 countries, within 14 days), then do the manual diversity check by hand in the ClickHouse console (`docs/12 Scope Gate.md` §7.2).
3. For both, `TRIGGER_PROD_SECRET_KEY` is already in `.env.local` (§6) — a small script using `sessions.start()` (for the chat) or `tasks.trigger()` (for `seed-gdelt`) plus `runs.retrieve()`/`session.out` reading is the fastest path; write it outside the tracked tree or delete it after use, same as every prior live verification in this project.
4. Once both pass, update `docs/09 Sprint Plan.md`'s Task 2 and Task 4 status lines to ✅, commit, and move to **Task 5** (`docs/09 Sprint Plan.md` / `docs/10 Task Backlog.md` §2): replace `getBriefing`'s fixture body with the real ranked-signal/timeline/H3 ClickHouse queries against the seeded `articles` table.

---

## 10. First action the next Claude Code session should perform

1. Read this document in full (done, if you're reading this).
2. Quickly re-check both external blockers before assuming either is still open:
   - OpenAI: `curl https://api.openai.com/v1/chat/completions` with `$OPENAI_API_KEY` from `.env.local` — if it no longer returns `429 insufficient_quota`, Task 2 is unblocked.
   - GDELT: `curl https://api.gdeltproject.org/api/v2/doc/doc?query=test&mode=ArtList&maxrecords=1&format=json` — if it responds instead of timing out, Task 4 is unblocked.
3. **If either is now clear:** proceed directly to §9's re-verification steps for that task — no new code, no new credentials, no redeploy needed.
4. **If both are still blocked:** don't idle waiting — there is genuinely no other Stage A code work available until at least one clears (Task 5 depends on Task 4's real data, and there's no other independent Stage A task left to pull forward). Report status and wait.
5. Do not re-run Task 1's connectivity check or Task 3's `init-schema` — both already passed live. Do not re-attempt Task 2 or Task 4 through the **local** `trigger.dev dev` worker — that path is root-caused as broken in this sandbox type (R-33); the Cloud deploy is the permanent fix, not a workaround to retry differently.

---

## 11. Source notes

Written per an explicit handoff request at the end of a Stage A implementation session. Updated across several subsequent sessions/turns (per `CLAUDE.md`'s standing authorization to continue implementation without re-approval, and later per explicit approved sequencing/infra changes): after Task 3 (ClickHouse schema) was written and verified live; after Task 4 (`seed-gdelt`) was written, statically verified, and its local live-run blocker investigated to a definitive root cause; after that blocker was resolved by deploying to Trigger.dev Cloud (`prod`, version `20260719.1`); after the user's supplied `ANTHROPIC_API_KEY` turned out to belong to a disabled Anthropic organization, prompting a provider swap to OpenAI and a redeploy (`20260719.2`); and after all remaining Cloud-dashboard credential gaps were resolved (via Claude Cowork, per the user's explicit choice) and live verification was actually attempted against the deployed `prod` environment — during which a real `clientData`/`profileId` wiring defect was found and fixed (redeploy `20260719.3`), and both Task 2 and Task 4 were confirmed to dispatch and execute correctly, blocked only by two external conditions (OpenAI account quota, a live GDELT outage) that this session cannot resolve. Reflects repository state as of commit `e3f59cd` plus the `clientData` fix and documentation updates committed alongside this revision. Does not modify `CLAUDE.md`, `docs/13 Demo Contract.md`, `docs/12 Scope Gate.md`, `docs/08 MVP.md`, `docs/02 Product.md`, or `docs/01 Vision.md` — all five remain frozen, per instruction.
