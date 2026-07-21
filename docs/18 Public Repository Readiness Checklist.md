# 18 — Public Repository Readiness Checklist

**Purpose:** everything to check before making this repository public and submitting it, so a judge cloning or browsing it signed-out sees exactly what's intended — nothing more, nothing less. **Advisory only. Nothing in this document has moved, deleted, or made anything public.** Every action below is for Andrew (or a future session, on explicit instruction) to take deliberately.

**Relationship to `submission-prep/repository-cleanup-audit.md`:** that file is an earlier, Cowork-authored audit and remains a good, still-largely-accurate inventory. This document re-verifies its central security claim directly against the repository (§2 below) and restates the action items as a checklist against the current state (README now exists; this document and three others now exist under `docs/`).

---

## 1. What a signed-out clone should see

- [ ] `README.md` — exists as of this session, documents ClickHouse/Trigger.dev roles, honest current status, and scope cuts.
- [ ] `docs/00`–`18` — the full planning + engineering-handoff corpus, including this checklist.
- [ ] `LICENSE` — MIT, already correct.
- [ ] Application code (`app/`, `lib/`, `trigger/`, `scripts/`), config files, `.env.example` (no values).
- [ ] **Not present:** any `.env*` file except `.env.example`; any real secret value anywhere in tracked history.

## 2. Secret-exposure claim — verified directly against this repository

`docs/11 Risks.md` R-31 states that `CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`, and (briefly) an `ANTHROPIC_API_KEY` were pasted into chat during earlier sessions. That claim rests on those sessions' own contemporaneous record — it cannot be confirmed or refuted by git history, because a chat transcript is never stored in git either way. What **can** be verified directly against the repository, and was, this session:

- `git log --all --diff-filter=A --name-only` — no `.env` or `.env.local` file has ever been added in any commit.
- `git log --all -- .env.local` — empty; that file has never been part of any commit.
- `git log --all -p | grep` for `CLICKHOUSE_PASSWORD=`, `TRIGGER_SECRET_KEY=`, `TRIGGER_PROD_SECRET_KEY=` — the only matches are the **empty** placeholder assignments in `.env.example`, never a real value.
- `.gitignore` correctly excludes `.env` and `.env.*`, with an explicit `!.env.example` carve-out.

**Conclusion:** no secret has ever been committed to this repository — confirmed, not assumed. The three credentials named in R-31 should still be treated as exposed (per that risk's own standing rule) and rotated before or around publishing, because the chat-transcript exposure is a separate channel that git evidence cannot speak to either way — but the repository itself is clean.

- [x] **Local rotation done:** Andrew rotated `CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`, and `OPENAI_API_KEY` directly in local `.env.local` during the Session 7 hostile-judge hardening pass.
- [ ] **Action for Andrew, still pending:** update the same three credentials in the **Trigger.dev Cloud `prod` environment's dashboard** (Project → Environment Variables → `prod`) — a separate store from `.env.local`, never auto-synced, and it still holds the pre-rotation values. See `docs/19 Security Rotation and Provider Resilience Runbook.md` for the guided per-credential procedure. The Anthropic key is already dead (disabled org) and no longer used anywhere in this codebase.
- [ ] Run a secret scanner (`gitleaks`/`trufflehog` or GitHub's own scanning) over full history as a belt-and-suspenders check before flipping public.

## 3. Untracked files at the repository root — dispositions still needed

These sit on disk, are **not** gitignored, and would be committed by a careless `git add -A`. This session did not touch any of them, per instruction.

| File(s) | Recommended disposition | Why |
|---|---|---|
| `43a324af-….pdf`, `e91caa15-….pdf` (event PDFs) | Move outside the public repo | Organizers' copyrighted material; adds nothing to the submission |
| `mirror_strategy_bundle.zip`, `mirror-visual-system.zip` | Move outside the public repo | Internal strategy/positioning artifacts, partially redundant with `docs/`; one (`judging.md`) is explicit competitive strategy, off-key to publish |
| `architecture.md`, `data.md`, `implementation-guide.md`, `risk-register.md`, `tech-stack.md` | Move outside, or fold any unique content into the matching `docs/0N` file, then remove | Superseded by the tracked `docs/` corpus; keeping both invites confusion about what was actually built |
| `submission-prep/` (this session's audit input) | Andrew's call | Contains a genuine, mostly-accurate submission audit and drafts; some of it (e.g. `judging-scorecard.md`) is now stale relative to `docs/15`–`17`. Keep privately, incorporate selectively, or discard — not for this session to decide |
| `skills-lock.json` | Andrew's call | Harmless if published (a Trigger.dev/ClickHouse skills lockfile); low priority either way |
| `.claude/` | **Checked, safe to keep** | `settings.local.json` contains only generic permission rules (git-config-reading Bash patterns) — no local paths, usernames, or PII. Confirmed by direct read this session. |

## 4. Confirmed already-correct (no action needed)

- [x] `.env.local` correctly gitignored; no secret ever committed (§2).
- [x] License is MIT, permissive, satisfies the Handbook's licensing requirement.
- [x] No proprietary or unauthorized third-party code — dependencies are all open-source, exact-pinned.
- [x] `.env.example` documents required variables without values.
- [x] `.claude/settings.local.json` carries no PII (§3).
- [x] No real-person PII in the codebase — the two demo profiles (Maya Chen, Jordan Reyes) are fictional.
- [x] Team member emails are not in the repository (submission form only) — keep it that way.

## 5. Before flipping the repository public

1. Decide dispositions for §3's untracked files (move/incorporate/delete) — do not `git add -A` before this is settled.
2. Rotate the three live exposed secrets in the Trigger.dev Cloud `prod` dashboard — local `.env.local` is already done (§2).
3. Run a secret scanner over full history.
4. Push all commits, flip repository visibility to public.
5. **Verify signed-out access immediately**, not at the last minute: open the repo URL in a private/incognito window and confirm the README, code, and docs all render without needing to be logged into GitHub.
6. Keep the repository public through the full judging period (through 2026-07-29) — do not flip back to private after submitting.

**Reminder:** this document changed nothing on disk. All actions above are for deliberate human action.
