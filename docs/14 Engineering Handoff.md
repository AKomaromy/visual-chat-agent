# 14 — Engineering Handoff

**Purpose:** let a fresh Claude Code session (no prior chat history) continue this build with zero ambiguity. This document is self-contained — read it before reading anything else, including `CLAUDE.md`.
**This is a living document.** Overwrite it at the end of every future session so it never goes stale.

---

## 1. Current implementation status

**Stage A, Session 1, in progress.** Task 1 is fully verified live. Task 2's code is complete and passes all static checks but has not yet been run against a real model — one credential away. Tasks 3–5 (schema, seed ingestion, real ClickHouse-backed tool) and the Session 4–6 work (renderers, personalization, deploy, demo) have not started.

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
| *(see `git log` for the hash of the commit that added this file and the accompanying `docs/09`/`10`/`11` status updates)* | Updated `docs/09 Sprint Plan.md`, `docs/10 Task Backlog.md`, `docs/11 Risks.md` with current status; added this handoff document. |

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
│   └── chat.ts                 (mirror-agent chat.agent() + getBriefing fixture tool)
├── trigger.config.ts           (real project ref: proj_nlisinjujntnqjrchglx)
├── docs/                       (00-14, this file included)
└── package.json / tsconfig.json / eslint.config.mjs / next.config.mjs / postcss.config.mjs
```

**ClickHouse Cloud:** service `visual-chat-agent`, Mini tier, 1 replica, 12 GiB, region `ca-central-1` (AWS), status running. Contains exactly one table: `_scratch_connectivity_check` (Task 1's diagnostic — not product schema). The three product tables (`articles`, `profile_cards`, `artifacts`) described in `docs/10 Task Backlog.md` §4 do not exist yet.

**Trigger.dev:** project `visual-chat-agent` (`proj_nlisinjujntnqjrchglx`), org "Attentionic Inc." CLI is logged in and the login persists locally (no need to re-auth unless working from a different machine/environment). `chat.agent()` `mirror-agent` and task `connectivity-check` are both defined in `trigger/` and discoverable by `trigger.dev dev`, but `mirror-agent` has never actually been invoked.

**Frontend:** `app/page.tsx` renders `Chat` (`app/components/chat.tsx`) — a profile switcher (Profile A / Profile B, no auth), a button that sends the exact Demo Contract question, and a raw-JSON display of whatever the `getBriefing` tool returns. There are no Impact Radar / Timeline / Map visual components yet — that's a later task (after Task 5).

---

## 5. Remaining external credentials required

| Credential | Status | Where to get it |
|---|---|---|
| `ANTHROPIC_API_KEY` | ❌ **missing** — this is the only blocker | console.anthropic.com → API Keys. Paste directly into `.env.local` yourself, not into chat (see `docs/11 Risks.md` R-31 for why this matters). |

Everything else (ClickHouse credentials, Trigger.dev project ref, Trigger.dev dev secret key) is already obtained and in place — see §6.

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

1. **`ANTHROPIC_API_KEY` not set** — blocks the only remaining Task 2 work (the live model-call test). Nothing else is blocked by this; Task 3 (ClickHouse schema) can proceed independently in the meantime (see §10).

No other blockers. ClickHouse and Trigger.dev are both fully provisioned, connected, and verified.

---

## 8. Known technical debt

- **Monorepo → single app.** Documented in §4 — intentional, not a defect, but future sessions should not "fix" this back to match `docs/07 Tech Stack.md` literally; that doc is superseded here per its own scope-drift banner.
- **Two credentials exposed in chat transcript** (`CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`) — see `docs/11 Risks.md` R-31. Rotate both before making this repository public.
- **`_scratch_connectivity_check` table** exists in the ClickHouse service and is not yet cleaned up. Harmless (a few rows), explicitly deferred until Task 5 is stable per the comment in `trigger/connectivity-check.ts`.
- **ClickHouse Cloud service accepts connections from anywhere** (no IP allowlist) — a deliberate, low-priority trade-off (restricting it would require allowlisting Vercel/Trigger.dev's rotating egress IPs). Revisit only if unexpected usage/billing appears.
- **`.trigger/` local build-cache directory** exists at the repo root from running `trigger.dev dev` locally. Gitignored, harmless, safe to delete if it grows large.
- **No artifact persistence yet** — the `getBriefing` tool's fixture output is not written to any table. This is expected; it lands with Task 3 (table exists) / Task 5 (real tool writes to it), not before.

---

## 9. Exact next backlog item

**Task 2, live verification** (the only remaining piece of the already-written code):

1. Confirm `ANTHROPIC_API_KEY` is set in `.env.local` (check presence only, per the rule in §6 — never print the value).
2. Run `npx trigger.dev@latest dev` in the background.
3. Trigger `mirror-agent` with a real message containing the exact Demo Contract question ("What should I know today?") and `profileId: "profile-a"`, either via the frontend (`npm run dev`, open the app, click the demo-question button) or via a small script using `tasks.trigger`/`runs.poll` (see the Task 1 verification pattern already used and then deleted — rewrite it if needed, don't leave it committed).
4. Confirm the run completes, the `getBriefing` tool fires, and its output validates against `visualResponseManifestSchema` from `lib/visual-response.ts`.
5. Repeat with `profileId: "profile-b"` and confirm the returned manifest differs (verdict and top Impact Radar item) — this is the earliest point the Demo Contract's core "two profiles, one question, different answer" claim can be smoke-tested, even on fixture data.

**Acceptance criteria (from the original Task 2 spec, unchanged):**
- `chat.agent()` runs successfully.
- The frontend can send the approved demo question.
- The agent streams a fixture visual response manifest.
- No real ClickHouse queries are required yet.
- The response manifest matches the approved visual response contract (`visualResponseManifestSchema`).
- The implementation remains fully compatible with replacing the fixture using the real ClickHouse briefing tool in the next task (Task 5) — i.e., don't change `getBriefing`'s input/output shape while verifying this.

Once Task 2 passes live, update `docs/09 Sprint Plan.md`'s Task 2 status line to ✅ (same pattern as Task 1's), commit, and proceed to **Task 3** (`docs/09 Sprint Plan.md` / `docs/10 Task Backlog.md` §4–5): create the `articles`, `profile_cards`, `artifacts` tables, including the H3 known-coordinate sanity check.

---

## 10. First action the next Claude Code session should perform

1. Read this document in full (done, if you're reading this).
2. Check whether `ANTHROPIC_API_KEY` is set in `.env.local` (presence check only, never display the value).
   - **If set:** proceed directly to §9's live verification steps.
   - **If still `REPLACE_ME`:** don't idle waiting for it — start Task 3 (ClickHouse schema) instead, since it has no dependency on the model-call test. Ask the user for the Anthropic (or OpenAI) key using the same safe pattern as every prior credential in this build (paste into `.env.local`, never into chat), then return to Task 2's live verification once it arrives.
3. Do not re-run Task 1's connectivity check as a first step — it already passed live and re-running it adds nothing; go straight to Task 2 or Task 3 per the branch above.

---

## 11. Source notes

Written per an explicit handoff request at the end of a Stage A implementation session. Reflects repository state as of commit `234461f` plus the documentation updates committed alongside this file. Does not modify `CLAUDE.md`, `docs/13 Demo Contract.md`, `docs/12 Scope Gate.md`, `docs/08 MVP.md`, `docs/02 Product.md`, or `docs/01 Vision.md` — all five remain frozen, per instruction.
