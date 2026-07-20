# 15 — Judging Criteria Mapping

**Purpose:** map the current, actually-shipped Mirror build to every official judging criterion, state exactly what evidence a judge can see for each, and flag anything a criterion may not prove strongly enough. This document reflects the build **as of 2026-07-20 (Session 6)** — after the visual workspace shipped and Task 2 passed live — not the earlier plan-stage assessment.

**Supersedes:** an earlier draft (`submission-prep/judging-scorecard.md`, produced before the visual workspace existed and before Task 2 passed) is now substantially stale — most of its "Missing" items are done. That file is left untouched as historical record per instruction; this document is the current, accurate mapping.

**Authoritative rubric:** scores are 1–10 per criterion, weighted, 15 judges scoring independently.

| Criterion | Weight | What judges evaluate |
|---|---:|---|
| Use of ClickHouse & Trigger.dev | 25% | Depth, creativity, and correctness in leveraging both |
| Problem Fit | 20% | How well it addresses the problem; does it solve the right problem? |
| Technical Implementation | 20% | Code quality, architecture, system design; production-ready? |
| Innovation | 20% | Novelty and originality |
| Scalability & Impact | 10% | Real-world applicability and potential to scale |
| Presentation | 5% | Clarity and quality of the demo video |

---

## 1. Use of ClickHouse & Trigger.dev — 25%

**What's live and verifiable today:**
- ClickHouse does real analytical work, not storage-only — personalized ranking, time-bucketed timeline, H3 geospatial aggregation, all in SQL (`lib/briefing.ts`), all traceable to a query.
- `chat.agent()` runs the full conversation live — verified end-to-end for both profiles, script and real browser, zero errors, 2026-07-20.
- The ingestion task (`seed-gdelt`) is deployed and correctly dispatches; its live run against real GDELT data specifically is still blocked (see §7 below and `docs/11 Risks.md` R-05/R-37).

**Where it's not yet fully proven:** the ClickHouse queries above have been exercised live only against a small, honestly-labelled fixture dataset, not a real GDELT corpus. The ranking/timeline/geo logic is proven correct; it hasn't yet been proven against the messier shape of real-world data.

**On camera:** name the query class per visual as it appears ("this ranking is a ClickHouse query; this map is H3 aggregation; this timeline is a date bucket"); briefly show the Trigger.dev run tree and one ClickHouse query behind a visual (Demo Contract 2:20–2:50).

---

## 2. Problem Fit — 20%

**What's live and verifiable today:** the visual workspace is built and renders in the fixed order (Verdict Strip → Impact Radar → Timeline → Map → Evidence Drawer) exclusively from the real manifest — this is no longer a design claim, it's a working, live-verified UI. One sentence in, a visual workspace out, not a paragraph.

**Where it's not yet fully proven:** the coordinated-selection interaction and the two-profile contrast have been demonstrated on fixture data in rehearsal, not yet on a full recorded take against the intended final dataset.

**On camera:** lead with the completed workspace filling the screen; perform the coordinated selection (click a Radar signal → Timeline + Map respond); do not narrate a paragraph summary — let the visuals carry it.

---

## 3. Technical Implementation — 20%

**What's live and verifiable today (a genuine strength):** typed response contract validated before render (`lib/visual-response.ts`); all ranking/timeline/geo math in SQL, none model-invented or client-fabricated; every ranked/plotted item carries a resolvable evidence ID; a "no material signals" empty state; two real defects (a ClickHouse column-shadowing bug, a CSS layout bug) caught and fixed through live verification rather than left in place; the H3 coordinate-order bug from Task 3 caught by an acceptance check before it could propagate.

**Where it's not yet fully proven:** artifact persistence to the `artifacts` table is not wired (deliberately deferred, not part of any task's stated acceptance criteria); no auth, multi-tenancy, or second database — a deliberate, documented cut, not an oversight.

**On camera:** open the Evidence Drawer to show every number traces to a source; trigger the empty state once (a nonsense question) to show graceful failure; name the deliberate trade explicitly ("no auth for a single-presenter demo; ClickHouse-only by choice").

---

## 4. Innovation — 20%

**What's live and verifiable today:** the same question, two profiles, visibly different Impact Radar and verdict — this is now a real, rendered, on-screen contrast (not just a SQL result in a terminal, as it was before the workspace existed). Zero top-signal overlap between profiles confirmed on fixture data.

**Where it's not yet fully proven:** the profile contrast has been observed on fixture data; the same manual diversity check (`docs/12 Scope Gate.md` §7.2) has not yet been re-run against real GDELT titles, since Task 4's live seed hasn't completed.

**On camera:** make the swap unmissable — same on-screen question text, no reload, let both workspaces fully settle before speaking. Keep the editable cards visible at least once so personalization reads as inspectable, not a hidden prompt.

---

## 5. Scalability & Impact — 10%

**What's live and verifiable today:** a clear, stated recurring-use framing (the daily strategic briefing) and an architecture that separates durable orchestration (Trigger.dev) from analytical storage (ClickHouse) in a way that scales independently of this demo's data volume.

**Where it's not yet fully proven:** no save/reopen, no feedback loop — the plan targets this honestly as a moderate score here (7.0–7.5), not a strength.

**On camera:** one sentence on recurring-use framing; in the README, show the expansion path as clearly-marked roadmap, not shipped.

---

## 6. Presentation — 5%

**What's live and verifiable today:** a fully specified, locked flow (`docs/13 Demo Contract.md`) and a working product to actually record against — this criterion could not be attempted at all before the workspace existed; it can be attempted now.

**Where it's not yet fully proven:** no video has been recorded yet.

**On camera:** follow the recording script (`docs/17 Recording Script.md`); target 4:20–4:40; open on the product, end on the working workspace with the exact closing line.

---

## 7. Weighted read of the current build

| Criterion | Weight | Design ceiling | **Current build, if judged today** | Gap driver |
|---|---:|---:|---|---|
| ClickHouse & Trigger.dev | 25% | 8.5–9.0 | **Strong** — both platforms run live; ClickHouse logic proven correct, pending real-data re-confirmation | Task 4 live-GDELT run still blocked |
| Problem Fit | 20% | 9.0 | **Strong** — visual workspace is real and live | none material |
| Technical Implementation | 20% | 7.5–8.0 | **Strong** — guardrails demonstrated, defects caught and fixed via live verification | artifact persistence deferred (documented, not hidden) |
| Innovation | 20% | 9.0 | **Strong (data + visual)** | real-data diversity re-check still pending |
| Scalability & Impact | 10% | 7.0–7.5 | **Moderate**, as planned | features honestly cut, not missing by accident |
| Presentation | 5% | 9.0–9.5 | **Not yet gradable** | no video recorded yet |

**Bottom line:** the single highest-leverage remaining risk is no longer "does the visual workspace exist" (it does, live-verified) — it is (1) recording the video, and (2) whether Task 4's real GDELT ingestion completes before the deadline. If it doesn't, the honest fallback is a fixture-backed take with the limitation stated plainly in the README and video, per `docs/17 Recording Script.md`'s integrity guardrails — not a silent overclaim.
