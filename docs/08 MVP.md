# 08 — MVP

**Status:** Canonical scope-cut specification, revised under `12 Scope Gate.md` for a ~15–20 hour implementation budget. Supersedes the prior full-scope P0/P1/P2 lines.
**Companion documents:** `12 Scope Gate.md` (rationale for every line below), `09 Sprint Plan.md` (when it gets built), `10 Task Backlog.md` (how it gets built)

---

## 1. The thin vertical slice (this is now the whole build)

The one and only slice this build must prove:

> *"What should I know today?"* — asked once as Profile A, once as Profile B.

It must: replay a topically-diverse, seeded GDELT dataset into ClickHouse through one Trigger.dev task (via the DOC 2.0 API, tagged with lightweight ingestion-time keywords — see `12 Scope Gate.md` §7.1, not GDELT's own GKG entity/theme extraction); compute a deterministic, keyword-match-based relevance score against an editable profile-card model; run the question through `chat.agent()`; call one (or two) typed tools that query ClickHouse directly; stream a valid, simplified visual manifest; render Impact Radar + Timeline + Map + Evidence Drawer; support coordinated selection/filtering across the three views; and produce a visibly different Impact Radar and verdict for Profile B than for Profile A.

There is no second slice. Stage B (`12 Scope Gate.md` §5) adds polish to *this* slice; it does not add new capability paths. **Why this is the whole build:** at 15–20 hours, a second flow or a fourth view doesn't add judging-visible value — it adds a second thing that can break on camera.

---

## 2. Scope

### Must Ship (Stage A) — see `12 Scope Gate.md` §3 for full rationale per item

- Next.js application, **no Clerk / no login** — a local Profile A / Profile B switcher.
- ClickHouse as the sole data path.
- Trigger.dev `chat.agent()` conversation, with **1–2** typed tools (not seven).
- One replayable Trigger.dev ingestion task, loading a seeded GDELT dataset into ClickHouse — this task *is* the resilient demo-data mechanism, not a separate concern.
- Paste-profile onboarding (LLM extraction) → editable, weighted profile **cards** (no graph UI) for Profile A; Profile B is pre-seeded to save demo time and avoid a second live-extraction risk.
- Deterministic relevance scoring: keyword-tag match (tags derived from article titles at ingestion, not GDELT's own taxonomy — see `12 Scope Gate.md` §7.1) + recency + coarse geographic boost. No embeddings, no vector index.
- Three view types — Impact Radar, Timeline, Map (single H3 resolution) — plus the Verdict Strip and Evidence Drawer.
- A simplified visual manifest (three view types + verdict + evidence), validated before render, persisted in ClickHouse as one artifact record.
- Coordinated selection and filtering across the three views (select → highlight/filter the others).
- Public repository, permissive license, a README that documents ClickHouse's and Trigger.dev's roles and states the scope cuts honestly.
- One five-minute demo recording.

### Stretch (Stage B) — only after Must Ship is deployed and demoable; ranked by value/hour in `12 Scope Gate.md` §5

1. Relevance-feedback control that visibly changes a score factor and reruns the query.
2. Save/reopen the current workspace.
3. A small accessibility/polish pass (alt text, contrast, focus states).
4. Relationship graph as a fourth view.
5. Vector retrieval layered onto structured filtering.

### Cut (not attempted this hackathon) — full list and rationale in `12 Scope Gate.md` §4

Clerk auth and real multi-tenancy; Postgres managed by ClickHouse + ClickPipes CDC; the graphical Mirror Model editor (permanently replaced by cards, not deferred); scheduled/continuous GDELT polling, dead-letter queues, and reconciliation workflows; multiple response patterns (Change Lens, Topic Atlas, Pattern Finder); arbitrary visualization generation; mobile-native layout and a full accessibility pass; multiple ClickHouse marts/materialized views.

**Never cut, at any remaining-time pressure:** `chat.agent()` orchestrating the response; ClickHouse as the sole data path; the one replayable ingestion task; the profile-card personalization model; the three-view visual answer; coordinated filtering; evidence on every claim; the two-profile comparison. If Stage A itself is running over budget, cut the *second* profile's live-paste flow (pre-seed both profiles instead) before cutting anything else on this list.

---

## 3. Non-functional acceptance bar

A trimmed, realistic version of the original performance budget — tuned for a seeded, demo-sized dataset rather than a live high-volume pipeline.

| Metric | Target |
|---|---:|
| Chat acknowledgement / first stream state | < 1 s |
| First visual shell | < 3 s |
| Complete workspace, seeded data | < 8 s |
| Common ClickHouse query latency | < 500 ms (small seeded dataset — this should be comfortably achievable) |
| Manifest validation failure rate | 0 in the recorded demo |
| Unsupported factual claim | Zero |

These are optimization gates, not guarantees — the UI must communicate progress rather than appear frozen.

---

## 4. Golden demo flow

**One** flow, run twice, must pass **three times consecutively** before recording, including one browser refresh mid-stream:

1. Ask "What should I know today?" as Profile A. Observe the streamed Impact Radar, Timeline, Map, and Evidence Drawer. Select a signal; observe the other views respond.
2. Switch to Profile B (pre-seeded). Ask the same question. Observe a visibly different top-ranked signal and a visibly different verdict.

That's the entire recorded demo's technical content.

---

## 5. MVP acceptance test (revised)

A new user must complete the following without explanation:

1. Paste a provided profile.
2. Review the extracted cards; edit one weight.
3. Ask "What should I know today?"
4. See visible processing stages.
5. Receive a ranked visual workspace (Radar + Timeline + Map + verdict).
6. Select a signal.
7. Observe coordinated updates across the other two views.
8. Inspect source evidence for the selected signal.
9. Switch to Profile B.
10. Ask the same question and observe a visibly different top signal and verdict.

**Pass criteria:** no dead ends; no uncited signal; no component with misleading empty data; no manual database intervention; no exposed secret; the flow completes in under five minutes.

This supersedes the 13-step test in `02 Product.md` §13, which references the relevance-feedback loop and save/reopen — both cut from this build's required scope (Stage B stretch only). If either stretch item ships, steps from the original test may be added back; do not assume they will.

---

## 6. Definition of MVP done

- Must Ship scope (§2) is deployed and reachable.
- `chat.agent()` is the real conversational path; the ingestion task is a real, replayable Trigger.dev workflow; ClickHouse is the real data/query path — none of the three is simulated or hard-coded for the demo.
- A live question creates a visual manifest with evidence, computed from real ClickHouse queries.
- Map data comes from ClickHouse H3, sourced from GDELT-provided locations.
- Browser refresh/resume works for the active conversation.
- The two-profile comparison (§4) passes three times consecutively.
- README documents the ClickHouse and Trigger.dev roles and states the scope cuts from `12 Scope Gate.md` §4 honestly rather than silently.
- The tagged public commit matches what's deployed and demoed.

---

## 7. Source notes

Revised from the prior `08 MVP.md` per `12 Scope Gate.md`, then corrected following the pre-implementation engineering design review (`12 Scope Gate.md` §7) to replace the GDELT-GKG-taxonomy assumption with DOC-2.0-API-plus-keyword-tagging. The prior version's three-golden-flow, four-view, thirteen-step design is preserved in git history and in `02 Product.md`/`03 UX.md` as the full-scope reference; this document is the authoritative, smaller target for the current implementation budget.
