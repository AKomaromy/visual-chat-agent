# 00 — Executive Brief

**Status:** Canonical. Revised under a hard scope gate: **~15–20 focused implementation hours remain**, for one developer working around a full-time job and family. See `12 Scope Gate.md` for the full rationale behind every cut in this revision — this brief states conclusions, that document states the reasoning.
**Contains only what's needed to begin implementation.** Full detail lives in `01`–`12`.

---

## 1. What we're building

**Mirror** is a personalized impact-intelligence workspace, not a general visual chatbot. A user pastes a compact AI-generated profile, Mirror turns it into an editable list of weighted interest/goal cards (the **Mirror Model** — cards, not a graph UI), asks a question like *"What should I know today?"*, and gets a coordinated visual workspace — never a report.

> **Tagline:** *See what changed. See why it matters to you.*
> **Demo hook:** two people asking the same question get different visual answers, because the world matters differently depending on what each is building.

**Target user (design center):** product/technology/strategy leaders in fast-changing domains. Full rationale: `01 Vision.md` (unchanged by this revision — positioning doesn't cost engineering hours).

---

## 2. The non-negotiable constraints

| Constraint | What it means for the build |
|---|---|
| ClickHouse is the **primary database** | All analytical, temporal, geographic, and personalization queries run in ClickHouse. Confirmed by the official handbook: Postgres is explicitly an *optional* addition — this build skips it entirely (`12 Scope Gate.md` §4). |
| Trigger.dev `chat.agent()` is **mandatory** | Every conversation is one durable `chat.agent()` run. No substitute chat endpoint — this alone can disqualify. |
| The response itself must be **visual, interactive, explorable** | Text is a verdict + labels, never the answer. |
| ~15–20 hours remain, not seven days | Every item below has already been through the scope gate. What's listed is what actually gets built — not an aspiration. |

25% of the judging score is "Use of ClickHouse & Trigger.dev." That criterion is fully protected by this reduced scope — nothing in the cut list touches it.

---

## 3. The required story (this is the whole product)

1. A user pastes a compact AI-generated profile.
2. Mirror converts it into an editable personalization model (cards, weighted).
3. The user asks a current-events question.
4. Trigger.dev `chat.agent()` orchestrates the response.
5. ClickHouse performs the real analytical, temporal, geographic, and personalization queries.
6. The response is visual and explorable — Impact Radar, Timeline, Map, Evidence Drawer.
7. A second profile asking the same question gets a visibly different answer.
8. Every claim has accessible supporting evidence.

That's it. There is no ninth thing. Full scope table: `08 MVP.md`.

---

## 4. What changed from the original plan

The prior version of this brief targeted a seven-day, many-hours-per-day build with Clerk auth, gated Postgres+CDC, four view types including a relationship graph, vector retrieval, a feedback-learning loop, and save/reopen workspaces. None of that fits 15–20 hours. Full rationale for every cut is in `12 Scope Gate.md`; the headline changes:

- **Auth:** Clerk is cut. A local, no-login profile switcher (Profile A / Profile B) tells the required story identically for a five-minute demo.
- **Second database:** Postgres + CDC is cut entirely, not gated. The handbook confirms it's optional; it only ever paid for itself via a separate €1,000 bonus category outside the core rubric.
- **Views:** four types (Radar/Timeline/Graph/Map) become **three** (Radar/Timeline/Map). The relationship graph is cut, not deferred as a near-term item — it duplicated a judging claim the other three views already prove.
- **Retrieval:** vector embeddings/HNSW are cut. Structured filtering against GDELT's own theme/entity tags, plus keyword and recency matching, is "real ClickHouse analytical querying" just as validly, at a fraction of the cost.
- **Ingestion:** scheduled/continuous GDELT polling becomes **one replayable Trigger.dev task** — the handbook-compatible alternative that also doubles as the resilient seed-data mechanism, removing a live-demo risk instead of adding one.
- **Personalization UI:** the graphical Mirror Model editor becomes **editable cards**. This is a permanent decision, not "cards for now."
- **Demo:** three response patterns become **one** (Daily Briefing), run twice — once per profile.
- **Feedback loop / save-reopen:** cut from required scope; both are cheap Stage-B stretch items if time remains.

---

## 5. Two-stage plan at a glance — full detail in `09 Sprint Plan.md`

| Stage | Contents | Rule |
|---|---|---|
| **A — Vertical slice** | Everything in §3. The entire required story, deployed and demoable, using the minimum viable version of every piece. | **No Stage B work starts until Stage A is fully deployable and demoable end-to-end.** |
| **B — Stretch** | Feedback loop, save/reopen, small polish pass, relationship graph, vector retrieval — in that value-per-hour order (`12 Scope Gate.md` §5). | Attempted only with hours genuinely left over. Not assumed to happen. |

**First five implementation tasks, in order** (full acceptance criteria in `09 Sprint Plan.md` §2):
1. Repo skeleton + ClickHouse + Trigger.dev connectivity proof.
2. ClickHouse schema: articles table (GDELT-shaped fields) + profile-cards table + a minimal artifact table.
3. GDELT replayable seed-ingestion task — the resilient demo dataset, built once.
4. `chat.agent()` skeleton end-to-end with a **fixture** tool response, proving the riskiest integration before any real query exists.
5. Replace the fixture with the real ClickHouse-backed tool — the first moment a live question returns real, evidence-backed data.

---

## 6. Judging alignment (revised targets)

A smaller product that reliably finishes outscores a bigger one that doesn't, in expectation. See `12 Scope Gate.md` §1 for the full argument; the practical consequence is that some targets below are honestly lower than the original plan's, and two (Technical Implementation, Scalability & Impact) are the direct, documented cost of cutting auth and the second database.

| Criterion | Weight | Target | Primary evidence |
|---|---:|---:|---|
| Use of ClickHouse & Trigger.dev | 25% | 8.5–9.0/10 | `chat.agent()` orchestrates a real, ClickHouse-backed response; ClickHouse runs real temporal/H3/personalization queries; ingestion is a durable, replayable Trigger.dev task — unchanged in kind from the original plan, just smaller in surface area |
| Problem Fit | 20% | 9.0/10 | The visual workspace *is* the answer; no text-first fallback; three-view grammar answers the question directly |
| Innovation | 20% | 9.0/10 | Editable personal-relevance cards; same question, two profiles, visibly different answer — the core claim survives the scope gate untouched |
| Technical Implementation | 20% | 7.5–8.0/10 | Typed manifest (no model-generated UI/SQL), deterministic scoring, graceful degradation — honestly lower than before because auth and tenant-isolation testing are out of scope this build |
| Scalability & Impact | 10% | 7.0–7.5/10 | Clear professional beachhead and a reusable query pattern; honestly lower than before because there's no OLTP/OLAP separation to point to |
| Presentation | 5% | 9.0–9.5/10 | One flawless flow, recorded against a seed dataset that never depends on a live API — arguably *higher* confidence than the original three-flow plan |

**Weighted target: ~8.3–8.6/10**, down from the prior plan's ~9.1 target on paper — but reached with materially higher confidence, which is the entire point of a scope gate under a 15–20 hour budget.

**Ready-to-use submission copy** (unchanged — positioning doesn't depend on scope):
- **Title:** Mirror
- **ClickHouse description:** *ClickHouse is Mirror's primary database — the event corpus, personalization signals, and evidence are all stored and queried there, using structured filtering, H3 geospatial aggregation, and temporal aggregation to produce a personalized visual answer.*
- **Trigger.dev description:** *Trigger.dev powers Mirror's durable `chat.agent()` conversation and its GDELT ingestion workflow, orchestrating the query and streaming the visual response as it completes.*

---

## 7. Top risks to watch — full register in `11 Risks.md`, reframed by the scope gate

| Risk | One-line mitigation |
|---|---|
| Stage A doesn't finish in 15–20 hours | Everything non-essential is already cut (§4); if Stage A itself is still too big, cut the second view type or the second profile's live-paste path (pre-seed both) before cutting anything in §3's required story |
| `chat.agent()` integration instability | Task 4 (§5) proves this with a fixture *before* any real query is built |
| GDELT/single-source outage during demo | Solved by construction — ingestion is a replayable task run once before recording, not a live dependency (`12 Scope Gate.md` §3) |
| Cutting too much erodes the required story | Every cut in `12 Scope Gate.md` was tested against the eight-step story in §3 above; nothing there was touched |
| Auth/tenancy cut looks unfinished to a judge | Documented honestly as a scoped-time trade in the README and `12 Scope Gate.md`, not hidden — consistent with `11 Risks.md`'s residual-risk philosophy |

---

## 8. Document map

| Doc | Answers |
|---|---|
| `01 Vision.md` | Why this product, why this positioning, competitive frame |
| `02 Product.md` | Full-scope product spec — read through the filter of `12 Scope Gate.md` |
| `03 UX.md` / `04 Visual Language.md` | Interaction and visual rules — apply only to the three shipped view types |
| `05 Architecture.md` / `06 Data.md` / `07 Tech Stack.md` | Full-scope technical design — read through the filter of `12 Scope Gate.md` |
| `08 MVP.md` | The precise, revised scope cut and its acceptance bar |
| `09 Sprint Plan.md` | The two-stage, hour-budgeted implementation plan |
| `10 Task Backlog.md` | The concrete, trimmed engineering backlog |
| `11 Risks.md` | Full-scope risk register — largely superseded by the smaller surface area in `12` |
| `12 Scope Gate.md` | **Start here.** The Must Ship / Stretch / Cut decision and rationale for every line item |

---

## 9. Source notes

Revised from the prior Executive Brief in response to a direct scope-gate instruction, cross-checked against the two official hackathon source documents (Participant Handbook and Accepted Participant Setup Guide) supplied as attachments. Confirmed unchanged: judging weights (25/20/20/20/10/5), the $5 Trigger.dev / $400 ClickHouse credit figures, and Postgres's optional (not required) status. Full change rationale: `12 Scope Gate.md`.
