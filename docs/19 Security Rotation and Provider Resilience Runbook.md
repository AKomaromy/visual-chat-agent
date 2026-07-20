# 19 — Security Rotation and Provider Resilience Runbook

**Filed as doc 19, not 15.** The user's message asked for this to be added "as doc 15," but that number was already taken by `docs/15 Judging Criteria Mapping.md` (added the prior session). Renumbered to the next free slot (19) rather than overwriting existing content; flagged to the user in the accompanying report.

**Provenance:** authored outside this session (by the user, or drafted with Claude Cowork) as a shared runbook for both Claude Code and Claude Cowork. Reproduced verbatim below. Only the "Instructions for Claude Code" section was executed by this session, per explicit instruction — the "Instructions for Claude Cowork" section was left for Cowork to pick up separately, and this session made no application-code, configuration, secret, git-history, or canonical-product-document changes on Cowork's behalf.

**Execution status, Session 7 (2026-07-20):**
- **Part A (audit):** done. No secret ever committed to Git — confirmed via history search, not assumed. Working-tree/history scans for OpenAI/Trigger.dev/ClickHouse secret-shaped patterns found nothing besides four bundled third-party skill-doc files (`.claude/skills/...`) showing generic `user:password@host` URL syntax as documentation examples, not real credentials. No history rewriting needed.
- **Credentials requiring rotation (all three, confirmed):** `CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`, and `OPENAI_API_KEY` — all confirmed pasted into chat at some point (the OpenAI one required asking the user directly, since this project's own risk log hadn't actually documented that claim despite an inconsistent summary line asserting it — see `docs/11 Risks.md` R-31's 2026-07-20 addendum).
- **Part B (guided rotation):** presented to the user as the standing human checklist below; requires the user's own dashboard/paste actions, so it is not something this session can complete unattended. Not yet confirmed done as of this revision.
- **Part C (reverification):** blocked on Part B completing; will run immediately once the user confirms rotation (`npx trigger.dev@4.5.4 deploy --env prod` if the Trigger.dev key rotated, then `scripts/verify-task2-chat-live.ts`, then a browser pass for both profiles).
- **Part D/E (provider abstractions):** **explicitly skipped for this session**, per the user's own decision when asked — the immediately-following hardening-phase instruction froze scope and said not to add capabilities "simply because they seem useful," which conflicts with building new adapter/abstraction code. Revisit only on explicit future request.

---

## Purpose

Use this document as the shared runbook for Claude Code or Claude Cowork.

**Important:** Secret values must never be pasted into any AI chat, committed to Git, written into documentation, printed in logs, or echoed back in a terminal transcript.

The human owner will paste secrets directly into the appropriate local file or provider dashboard only when the agent has opened the correct destination and stopped.

---

## Current facts

- The actual ClickHouse password and Trigger.dev secret key were previously pasted into an AI chat.
- Treat both as exposed and rotate them.
- Rotate the OpenAI API key as well if its actual value was pasted into chat.
- Mirror currently uses OpenAI successfully through Trigger.dev `chat.agent()`.
- The visual workspace and ClickHouse-backed briefing pipeline are working.
- Live GDELT ingestion remains externally blocked by the GDELT API outage.
- Controlled development fixtures remain the safe fallback dataset until a real news source is verified.
- Do not delete those fixtures until real ingestion and the complete visual flow have both been reverified.

---

# Instructions for Claude Code

Act as the engineering owner for a safe credential rotation and a minimal provider-abstraction hardening pass.

Do not ask the user to paste a secret into chat. Do not print, inspect, log, summarize, or commit secret values.

## Part A — Audit without exposing secrets

1. Inspect:
   - `.gitignore`
   - `.env.local`
   - tracked environment example files
   - Trigger.dev configuration
   - Git history
   - current working tree
   - deployment documentation
2. Confirm whether any actual secret values were committed to Git.
3. Search safely for likely secret prefixes and accidental plaintext exposure without printing matches:
   - Trigger.dev secret-key prefixes
   - OpenAI API-key prefixes
   - ClickHouse credentials or URLs containing embedded passwords
4. Report only:
   - whether exposure exists in Git history;
   - which credential types require rotation;
   - which files or commits are affected;
   - whether history rewriting is necessary.
5. Never display a matching secret value.

## Part B — Guide the human through rotation

For each credential requiring rotation:

1. Tell the user the exact provider dashboard page or account area to open.
2. Tell the user which credential to create or rotate.
3. Open the exact local destination file in VS Code, or identify the exact Trigger.dev environment-variable field.
4. Stop and wait for the user to paste the value directly into that destination.
5. After the user confirms completion, verify only that the variable exists and is non-placeholder.
6. Never read the value back.
7. Revoke the old credential after the replacement is verified.

Credentials to handle:

- `CLICKHOUSE_PASSWORD`
- `TRIGGER_SECRET_KEY`
- `OPENAI_API_KEY` if its value was exposed
- any other secret identified by the audit

Update the credentials in:

- local `.env.local`
- Trigger.dev production environment
- any other deployed environment actually used by Mirror

## Part C — Reverification

After rotation:

1. Redeploy Trigger.dev if necessary.
2. Run the existing connectivity verification.
3. Run Task 2 live for both locked profiles.
4. Confirm ClickHouse reads and writes still work.
5. Confirm the full visual workspace still renders for both profiles.
6. Run typecheck, lint, and build.
7. Commit and push only non-secret code or documentation changes.
8. Document that credentials were rotated without recording the values.

## Part D — Minimal news-provider abstraction

Do not redesign the product and do not overengineer.

Create or confirm one narrow ingestion boundary that normalizes any news provider into the existing canonical `articles` schema.

The boundary should support:

- `gdelt`
- `opoint`
- controlled development fixtures

Use a small interface or adapter pattern with fields equivalent to:

- stable external article ID
- provider name
- title
- source or publisher
- source URL
- publication timestamp
- language
- country or geography
- latitude/longitude when available
- topic/keyword tags
- summary/snippet if licensed and available
- raw provider metadata where useful and safe

Requirements:

1. Keep the existing ClickHouse schema and briefing queries provider-neutral wherever possible.
2. Provider-specific parsing, authentication, pagination, and rate-limit handling belong only in the adapter.
3. Select the active ingestion provider by an environment variable such as `NEWS_PROVIDER`.
4. Do not make Opoint a blocker unless trial credentials are actually available.
5. Do not remove GDELT.
6. Do not count fixtures as live-data verification.
7. Add an Opoint adapter only when official trial documentation and credentials are available.
8. Prefer a minimal working adapter over a generalized framework.

## Part E — Minimal LLM-provider abstraction

Keep Trigger.dev `chat.agent()` and the current typed-tool behaviour unchanged.

Use the AI SDK provider abstraction so the model provider can be selected by environment configuration, for example:

- `LLM_PROVIDER=openai`
- `LLM_PROVIDER=anthropic`

Requirements:

1. OpenAI remains the working default.
2. Add Anthropic only after a valid API key is available.
3. Keep model names configurable by environment variable.
4. Do not duplicate agent logic between providers.
5. The LLM remains limited to request interpretation, typed tool invocation, and streaming.
6. ClickHouse remains responsible for evidence, ranking, personalization, timeline, and geography.
7. A missing optional provider key must not break the configured working provider.
8. Test the configured provider only; do not require both providers for build success.

## Stop conditions

Stop only when:

- the user must perform account authentication, secret creation, rotation, revocation, or dashboard entry;
- official Opoint credentials or documentation are required;
- a product decision would alter the Demo Contract;
- or a genuine technical blocker prevents continued work.

Report only:

- security audit result;
- credentials requiring rotation;
- manual action currently required;
- completed verification;
- provider-abstraction status;
- unresolved blockers;
- next action.

---

# Instructions for Claude Cowork

Act as the security, submission-truthfulness, and provider-due-diligence reviewer. Do not edit application code, configuration, secrets, Git history, or canonical product documents.

1. Read the latest `docs/14 Engineering Handoff.md` and current status documents before relying on prior Cowork output.
2. Mark stale statements in `submission-prep/`:
   - OpenAI quota is resolved.
   - Task 2 is live-verified.
   - The complete visual workspace exists and is verified.
   - GDELT ingestion is the remaining external data blocker.
3. Update only files under `submission-prep/`.
4. Prepare:
   - a credential-rotation checklist that never contains secret values;
   - a claims audit distinguishing live-verified, fixture-verified, and pending-GDELT claims;
   - an Opoint trial due-diligence checklist;
   - a recommendation on whether Opoint should be used as the demo source, backup source, or later enhancement;
   - a public-repository security checklist.
5. For Opoint, identify from official materials:
   - authentication method;
   - relevant API product;
   - trial limitations;
   - response fields;
   - pagination;
   - rate limits;
   - content-display and retention rights;
   - attribution obligations;
   - whether article body text may be stored or shown;
   - whether demo/video/public-repository use is permitted.
6. Do not recommend replacing GDELT until the trial terms and integration effort are known.
7. Do not make unsupported claims about the cause or duration of the GDELT outage.
8. Do not touch the active source tree.

Report:

- stale files corrected;
- security actions still requiring the user;
- Opoint questions that must be answered by its representative;
- submission claims that remain unsafe;
- decisions that genuinely require the user.

---

# Human-only checklist

Do not paste any secret below into chat.

## ClickHouse

- Open the ClickHouse Cloud service.
- Create or reset the service password.
- Paste the new value directly into:
  - local `.env.local` as `CLICKHOUSE_PASSWORD=...`
  - Trigger.dev production environment as `CLICKHOUSE_PASSWORD`
- Verify the new credential works.
- Revoke or invalidate the old credential.

## Trigger.dev

- Open the Trigger.dev project API Keys area.
- Rotate or create a new production secret key.
- Paste it directly into:
  - local `.env.local` as `TRIGGER_SECRET_KEY=...`
  - any deployment environment that requires it
- Verify deployment and task dispatch.
- Revoke the old key.

## OpenAI

Rotate only if the actual key value was pasted into chat.

- Open the funded OpenAI API project.
- Create a replacement project API key.
- Paste it directly into:
  - local `.env.local` as `OPENAI_API_KEY=...`
  - Trigger.dev production environment as `OPENAI_API_KEY`
- Run Task 2 successfully.
- Delete the old key.

## Opoint

Before accepting or integrating a trial, obtain written answers to:

- Which API is included: Search API, feed, or another product?
- What date range and article volume are available?
- What rate limits and pagination rules apply?
- Are full article bodies included, or metadata/snippets only?
- May Mirror store the returned content in ClickHouse?
- May Mirror display titles, snippets, source names, and URLs in a public demo?
- May screenshots and recorded video show the returned content?
- Is attribution required?
- Must trial data be deleted after the trial?
- Can the hackathon repository include an adapter without including credentials?
- Is the trial reliable through the submission and judging period?
- Is commercial or post-hackathon use excluded?

Do not make Opoint the sole demo dependency until these answers and working credentials exist.
