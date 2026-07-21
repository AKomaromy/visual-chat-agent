# 17 — Recording Script

**What this is:** a precise, second-by-second presenter script that executes `docs/13 Demo Contract.md` exactly. The Contract is a commitment, not a suggestion — **the question, both profiles, the view order, the interaction sequence, the wow moment, and the closing line are reproduced verbatim below and must not drift.**

**Relationship to `submission-prep/demo-runbook.md`:** that file is an earlier, Cowork-authored draft written before the visual workspace existed — its own text notes the prerequisite "only executable once the visual renderers exist" was not yet met. That prerequisite **is now met** (the workspace is built and live-verified). This document carries the same choreography forward as the current, executable script.

**Target runtime:** 4:20–4:40 (Handbook allows max 5:00; leave margin).

**Before recording, read `docs/16 Demo Rehearsal Checklist.md` and complete its rehearsal gate.**

---

## Locked elements (verbatim from the Demo Contract — do not alter)

- **The question, asked identically both times:** "What should I know today?"
- **Profile A — Maya Chen, VP of Product, AI infrastructure startup.** Cards: *Ship the AI compliance feature before Q4* (Goal, 3); *AI regulation* (Interest, 3); *Enterprise AI adoption* (Interest, 2); *Competitors in the LLM tooling space* (Organization, 2); *United States* (Location, 2).
- **Profile B — Jordan Reyes, Climate policy analyst** (pre-seeded, not pasted on camera). Cards: *Track EU carbon policy changes this quarter* (Goal, 3); *Climate policy* (Interest, 3); *Energy markets* (Interest, 2); *EU regulatory bodies* (Organization, 2); *European Union* (Location, 2).
- **View order, each run:** Verdict Strip → Impact Radar (5–7 ranked signals) → Timeline → Map → Evidence Drawer (opens on selection). No other view renders. No component renders empty.
- **Wow moment:** the top-ranked Impact Radar signal changes from an AI-regulation story (A) to a climate-policy story (B) — same question, same data, nothing retyped.
- **Closing line, spoken once over Profile B, nothing after it:** *"Same world, same question — a different answer, because it's a different person asking."*

---

## Setup (before recording — off camera)

1. Confirm what's being recorded against (real production deployment vs. local `next dev` against the live `prod` Trigger.dev backend) — see `docs/16` §A; this is Andrew's call, not decided here.
2. Confirm `articles` holds the intended seed data, and confirm deliberately whether this take is live-data or fixture-backed (`docs/16` §A). If fixture-backed, that is a stated limitation, not something hidden.
3. Confirm both profiles' cards are seeded (`seed-profile-cards`).
4. Open the app to the Profile A card list, already loaded, cursor ready near the query box.
5. Browser: single tab, clean, notifications off, zoom large enough to read on a laptop.
6. Have the Trigger.dev run view and a ClickHouse query window open in background tabs for the stack-proof beat.

---

## Script

### 0:00–0:15 — Open on the product, ask the question
**Screen:** Profile A (Maya Chen) card list visible.
**Action:** With Profile A active, submit **"What should I know today?"**
**Say:** *"This is Mirror. It already knows this user — Maya, a VP of Product shipping an AI compliance feature. I'll ask one question: what should I know today?"*
**Expected screen state:** submission acknowledged in <1s; a streaming/progress state appears.

### 0:15–1:00 — The visual answer streams in
**Action:** Do not click. Let the workspace build in the contracted order.
**Expected screen state, in order:** Verdict Strip → Impact Radar (5–7 ranked signals) → Timeline (bucketed counts, not a flat line) → Map (H3 points across ≥5 countries). No empty frames.
**Say:** *"The answer isn't a report. Mirror ranked the developments most likely to affect Maya, then showed when they happened and where they're happening."*

### 1:00–1:40 — Explore and verify (coordinated interaction + evidence)
**Action, in this exact order:**
1. Click the top-ranked Impact Radar signal.
2. Watch the Timeline and Map respond to that selection.
3. Open the Evidence Drawer for that signal; point at the source and timestamp.
**Say:** *"Click the top signal, and the timeline and map respond — it's one coordinated workspace, not four separate charts. And every signal is backed by a real source, with its date."*
**Expected screen state:** other views visibly react; drawer shows stored title/domain/date (this renders even if the outbound link is dead).

### 1:40–2:20 — The personalization proof (the wow moment)
**Action:**
1. Switch the profile switcher to Profile B (Jordan Reyes). **No re-paste. No page reload.**
2. Submit the identical question: **"What should I know today?"**
3. Let it stream in fully before speaking.
**Expected screen state:** the top-ranked Radar signal is now a climate-policy story (was AI-regulation for A); the Verdict differs; the Map emphasis shifts toward the EU.
**Say (only after it settles):** *"Same question. Same underlying world. But this is Jordan, a climate policy analyst — and the answer is completely different."*

### 2:20–2:50 — Stack proof (ClickHouse + Trigger.dev)
**Action:** Briefly bring up the Trigger.dev run (the `chat.agent()` run and/or the ingestion run) and one ClickHouse query behind a visual.
**Say:** *"Under the hood: Trigger.dev runs the whole conversation as a durable agent and orchestrates the ingestion. ClickHouse is the only database — it does the ranking, the time buckets, and the geographic aggregation for the map."*
**If time is tight:** trim this beat first — never the wow moment.

### 2:50–3:00 — Close
**Action:** Return focus to the Profile B workspace.
**Say (once, then stop — nothing follows):** *"Same world, same question — a different answer, because it's a different person asking."*
**Expected screen state:** end on the working workspace. No slide, no logo, no credits.

---

## Recovery actions (if something breaks mid-take)

Stop and re-take rather than improvise on camera.

| Failure on camera | Recovery |
|---|---|
| Chat turn errors / spins | Stop take. Off camera, resubmit and confirm the cause before recording again. |
| A view renders empty | Stop take — the Contract forbids empty components on camera. Re-check seed data thresholds before re-recording. |
| Wow moment is weak/ambiguous | **Stop everything.** Verify with a manual query that A and B genuinely differ before re-recording. Do not record a marginal contrast. |
| Evidence link 404s | Fine — the drawer shows stored title/domain/date as primary evidence; do not click through to the live URL on camera. |
| Dev-fixture titles appear unintentionally | Stop — clear fixtures and re-record, unless this take is deliberately and knowingly fixture-backed per `docs/16` §A. |

---

## Integrity guardrails (do not violate)

- Do not fake the live query or splice a pre-rendered result in as if it were live.
- If any part is fixture-backed rather than live, that limitation is stated in the README/summary — the video is still a truthful screen recording of the real UI.
- Speeding up clearly-labelled background waiting is acceptable; fabricating a result is not.
