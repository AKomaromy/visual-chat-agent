# 12 — Scope Gate

**Status:** Canonical, supersedes conflicting scope statements in `02`–`07` and `11` for this build. Written under a hard constraint: **~15–20 focused implementation hours remain**, for one developer working around a full-time job and family — not the seven-day, many-hours-per-day capacity assumed in `08`–`10` prior to this revision.
**Objective:** a ruthless scope gate whose sole goal is to maximize judging score per hour while guaranteeing a reliable, polished five-minute demo. Ambition is not free — every hour spent on a feature that isn't visible or provable in the demo is an hour stolen from the reliability of the hours that are.
**Companion documents:** `00 Executive Brief.md`, `08 MVP.md`, `09 Sprint Plan.md`, `10 Task Backlog.md` (all revised alongside this document)

---

## 1. The expected-value argument for cutting this hard

A bigger plan with a real chance of an incomplete or broken demo scores worse in expectation than a smaller plan that reliably finishes, even though the smaller plan's ceiling is lower. Judges score what they see; a missing or malfunctioning core feature is punished across *four* criteria at once (Problem Fit, Technical Implementation, Presentation, and indirectly Use of ClickHouse & Trigger.dev), not just the one feature it belonged to.

Illustrative math (assumptions are illustrative, not measured): the prior full-scope plan had a real chance of an incomplete demo under a 15–20 hour budget — call it a meaningful risk of landing well below its ~9.1 target. A scope-gated plan with a much smaller surface area has a much higher chance of reaching its (lower) target cleanly. Even a materially lower target, reached reliably, beats a higher target reached unreliably. **This is the entire logic behind every cut below.**

---

## 2. The required story, unchanged

Every cut in this document is tested against one question: *does removing this still let Mirror tell its required eight-step story?*

1. A user pastes a compact AI-generated profile.
2. Mirror converts it into an editable personalization model.
3. The user asks a current-events question.
4. Trigger.dev `chat.agent()` orchestrates the response.
5. ClickHouse performs the real analytical, temporal, geographic, and personalization queries.
6. The response is visual and explorable, not text-first.
7. Two different profiles asking the same question receive visibly different visual answers.
8. Every claim has accessible supporting evidence.

Nothing below weakens any of these eight steps. Everything below removes scope that was never load-bearing for them.

---

## 3. Must Ship (Stage A — the vertical slice)

| Area | Decision | Rationale | Judging impact |
|---|---|---|---|
| **Database** | ClickHouse remains the sole primary database. No change. | Non-negotiable handbook requirement; also the cheapest thing to keep, since nothing else in this build needs a second database once Postgres is cut (§4). | Protects 25% Use-of-Stack; removes a whole disqualification vector for zero extra hours. |
| **Agent runtime** | `chat.agent()` remains the sole conversational path, but the tool surface collapses from 7 typed tools to **1–2**. One combined tool runs the ClickHouse queries needed for the Impact Radar, Timeline, Map, and Evidence Drawer in a single pass; a second tool is added only if the first proves awkward to keep under Trigger.dev's ~1 MiB stream-record limit. | The required story needs `chat.agent()` orchestrating *a* real ClickHouse-backed response — it does not need seven distinguishable tool names. Seven tools were designed to support four response patterns and a router; with one response pattern (§4), the router and most of the tool taxonomy have no job to do. | Preserves the full 25% Use-of-Stack story (durable agent, real orchestration, real queries) at roughly a quarter of the original tool-implementation cost. |
| **Ingestion** | GDELT ingestion is **one Trigger.dev task**, run as a manual/replayable trigger (the handbook-compatible alternative to a live schedule — see §5). It both seeds the demo dataset and demonstrates durable Trigger.dev orchestration of an ingestion workflow. | The required story's step 5 needs *real* ClickHouse data behind the queries; it does not need continuous polling, per-source concurrency, dead-letter queues, or reconciliation maintenance jobs. One replayable task is a legitimate, complete demonstration of "Trigger.dev orchestrates ingestion." | Same Use-of-Stack credit as a full scheduler, at a fraction of the engineering cost, and it *removes* a live-demo risk (a flaky external API mid-recording) rather than adding one. |
| **Personalization model** | Paste-profile onboarding → an LLM extraction pass → an **editable list of interest/goal/entity cards** with a weight per card. No graph rendering. | This is explicitly what the task instructions specify: preserve the personalization concept, drop the graph UI. Cards are materially cheaper to build (a list component, not a force-directed layout with drag/zoom/edge-rendering) and are just as inspectable/editable for the demo. | Required story steps 1–2 and 7 (the core Innovation claim) are fully served by cards; a graph adds visual flourish, not additional judging evidence, at this scope. |
| **Relevance scoring** | Deterministic, but collapsed from 7 weighted factors to **3–4**: topic/entity match (structured filter against GDELT-provided theme/entity tags), keyword match, recency, and a coarse geographic-relevance boost. No embeddings, no vector index. | Explicitly sanctioned by the task instructions ("vector retrieval if full-text and structured filtering are sufficient" — they are: GDELT already tags themes and entities, so structured filtering *is* semantic-enough matching for a demo). Every number still traces to a stored, queryable factor — the "no model-invented numbers" rule is unchanged. | Satisfies required-story step 5 (real ClickHouse personalization queries) and step 7 (visibly different rankings per profile) without the embedding pipeline, HNSW capability check, or exact-fallback logic — the single largest remaining engineering cost in the prior plan. |
| **Views** | Exactly **three** view types: Impact Radar, Timeline, Map (single H3 resolution, r5) — plus the persistent Evidence Drawer and Verdict Strip. Relationship Graph is cut from P0 entirely (§4). | The preserve list names these four elements explicitly; it does not name the relationship graph. Three coordinated views plus evidence already fully proves "visual, interactive, explorable" (step 6) and "every claim has evidence" (step 8). | Cuts the most expensive single renderer (Cytoscape graph + `entity_edges_daily` pipeline) with zero loss against the required story. |
| **Coordinated filtering** | Selection and filtering work across the three remaining views (highlight + filter, per `03 UX.md` §4). Brushing is a stretch item, not required. | The preserve list requires "coordinated filtering," not the full brush/pin/compare/ask-about-selection grammar. | Keeps the single most demo-visible interaction ("click a signal, watch the map and timeline respond") for a fraction of `03 UX.md`'s full interaction surface. |
| **Manifest/persistence** | MVRP simplified to three view types + verdict + evidence; artifacts persisted in ClickHouse (one table, not the full raw/core/mart/artifact/view-data layering). | Trigger.dev's payload-size limit still requires streaming references, not datasets — this pattern is kept. The elaborate versioning/expiry/replay machinery around it is not needed for a single-session demo. | Keeps the specific technical pattern that prevents a real failure mode (oversized chat stream) while dropping the polish around it. |
| **Demo flow** | **One** response pattern — Daily Briefing ("What should I know today?") — run twice, once per profile. No router needed; every question is handled the same way. | The task instructions cut "multiple unrelated demo flows" explicitly. One flow, executed flawlessly with a visible personalization delta, outscores three flows where one is shaky. | Concentrates all remaining hours on the exact moment that carries Problem Fit (20%) and Innovation (20%). |
| **Seed data** | The same replayable GDELT ingestion task (above) doubles as the resilient seed-data mechanism — run it once before recording and the demo never depends on live GDELT availability. | Explicitly required in the preserve list; achieved for zero incremental engineering cost because ingestion was already designed to be replayable. | Removes the single highest-likelihood live-demo failure mode (an external API hiccup on camera) at no cost. |

---

## 4. Cut (not attempted this hackathon)

| Item | Rationale | Judging impact of cutting |
|---|---|---|
| **Clerk authentication / real multi-tenancy** | A local profile switcher (Profile A / Profile B, no login) tells the required story exactly as well as real auth does, since the demo is a single presenter switching between two seeded profiles, not two separate signed-in users. Building Clerk, server-side tenant derivation, and cross-tenant test coverage costs real hours for zero visible demo value. | Small, deliberate hit to Technical Implementation's "production soundness" sub-signal — documented honestly rather than hidden (see `11 Risks.md`'s residual-risk philosophy, which this build continues). Zero hit to Problem Fit, Innovation, or Use-of-Stack, none of which depend on auth. |
| **Postgres managed by ClickHouse + ClickPipes CDC** | The handbook confirms Postgres is an *optional addition*, not a requirement — ClickHouse alone satisfies "primary database." Building and gating a second database for a 15–20 hour budget is the single worst hours-to-judging-score trade available: it only pays off via the OLTP+OLAP bonus category, a separate €1,000 side-prize that is not part of the 25/20/20/20/10/5 core rubric that determines the Grand Prize and Runner-up. | Forfeits bonus-category eligibility only. Zero impact on any of the six weighted rubric criteria — this is the cleanest cut in the whole document. |
| **Relevance-feedback learning loop** (useful / not-useful / already-known wired to rerank) | Not part of the required eight-step story. The personalization proof the judges need — two profiles, one question, two different answers — is already fully delivered by the relevance-scoring model itself; a live feedback loop is a second, independent proof of the same underlying claim. | Minor Innovation/Scalability upside forgone; no downside, since the primary Innovation proof (step 7) doesn't depend on it. |
| **Save/reopen workspace** | Not part of the required story. A single live session is all a five-minute demo needs. | No measurable judging impact for this build; would matter for a "real product" pitch, not a five-minute rubric-scored demo. |
| **Full graphical Mirror Model editor** | Explicitly redirected by the task instructions to cards. Not a deferred stretch item — this is a permanent design decision for the hackathon, not "cards now, graph later." | None — cards satisfy the same judging criteria (inspectable, editable personalization) that the graph was meant to satisfy. |
| **Relationship graph view** | See §3 — cut from P0. Not pursued as stretch either, because the Cytoscape + `entity_edges_daily` pipeline is 3–4 hours of work that duplicates a judging claim (Innovation, coordinated views) already fully proven by the three remaining views. | None against the required story. Some ceiling forgone on Innovation/Presentation if time is unusually abundant — acceptable given the time budget. |
| **Vector retrieval / embeddings / HNSW** | See §3 — explicitly sanctioned as droppable by the task instructions when structured filtering suffices, and it does. | None against the required story (step 5 only requires "real analytical... queries," which structured ClickHouse filtering satisfies). Some ceiling forgone on "ClickHouse platform breadth" — acceptable; H3 geospatial and personalization-weighted ranking already demonstrate real analytical depth. |
| **Scheduled (continuous) live GDELT polling, dead-letter queues, reconciliation workflows** | Replaced by the single replayable ingestion task (§3). Building continuous-polling infrastructure (cron cadence tuning, per-window concurrency, a dead-letter table, a reconciliation sweep) is exactly the kind of production-hardening that a 15–20 hour budget cannot afford and that a five-minute demo cannot showcase — nobody watches a cron job run in real time. | None against the required story, which only needs ingestion to be "scheduled or replayable" — replayable is the explicitly sanctioned, and safer, choice. |
| **Multiple response patterns** (Change Lens, Topic Atlas, Pattern Finder) | Cut per the task instructions' "multiple unrelated demo flows" direction. | None — one flawless flow outscores three shaky ones on Presentation and Technical Implementation. |
| **Arbitrary visualization generation** | Was never in scope under the typed-MVRP design; reconfirmed as out of scope. | N/A. |
| **Mobile-native layout, WCAG-AA-complete accessibility pass, animation polish** | Not visible or compelling in a desktop-recorded five-minute demo. Baseline keyboard reachability and non-color state encoding are kept (near-zero cost); the full accessibility and responsive checklists in `03`/`04` are not pursued. | Negligible — Presentation is scored on the demo video, which will be recorded on desktop. |
| **Multiple ClickHouse marts / materialized views** | The three-mart design in `06 Data.md` §8 assumed continuous ingestion volume that no longer exists at this scope; a single seeded dataset doesn't need pre-aggregation to stay fast. Direct queries over a small seeded table are simpler and just as demonstrably "real ClickHouse analytics." | None — query-time aggregation over a demo-sized dataset is still genuine ClickHouse analytical work, just without the materialized-view layer. |

---

## 5. Stretch (Stage B — only after Stage A is fully deployable and demoable)

Ordered by judging value per hour. **None of these are assumed to happen** — Stage A is sized to consume essentially the full 15–20 hour budget. This list exists so that any time genuinely left over is spent on the highest-value item first, not the most interesting one.

| Rank | Item | Est. hours | Why this rank |
|---:|---|---:|---|
| 1 | Relevance-feedback loop (a "not useful" button that visibly changes a factor weight and reruns the score) | 1–2h | Cheapest reinforcement of the Innovation story; directly extends work already built in §3. |
| 2 | Save/reopen the current workspace | ~1h | Cheap given the manifest/artifact pattern already exists; small Scalability & Impact signal ("this is a reusable product, not a one-shot query"). |
| 3 | Small accessibility/polish pass (alt text, contrast check, focus states on the three views) | 1–2h | Cheap, protects Presentation without new architecture. |
| 4 | Relationship graph as a fourth view | 2–3h | Real Innovation/Presentation upside, but duplicates a claim already proven; only worth it if Stage A finishes with hours to spare. |
| 5 | Vector retrieval layered onto structured filtering | 3–4h | Real "ClickHouse platform depth" upside, but highest cost-to-marginal-judging-value ratio of anything on this list; do this last, if at all. |

**Explicitly not on the stretch list** (i.e., do not reach for these even with extra time): Clerk auth, Postgres/CDC, the graphical Mirror Model editor, multiple response patterns, mobile-native layout. These remain in §4 regardless of remaining hours — the hours-to-judging-score ratio is poor even in the best case, and pursuing them risks destabilizing a working Stage A slice this close to the deadline.

---

## 6. What this means for the other documents

- `00 Executive Brief.md`, `08 MVP.md`, `09 Sprint Plan.md`, `10 Task Backlog.md` are rewritten alongside this document to reflect §3–5 directly.
- `01`–`07` and `11` are **not** rewritten in this pass. Where they describe the fuller seven-day scope (Clerk, Postgres/CDC, vector retrieval, relationship graph, four response patterns, multi-day workflow catalogues), treat this document as the authoritative filter: anything in `01`–`07`/`11` that conflicts with §3–5 above is superseded for the current build and remains valid only as the post-hackathon roadmap already flagged in `09 Sprint Plan.md` §7.
- The product name, tagline, positioning, and competitive framing in `01 Vision.md` are unchanged — none of that depends on engineering scope.

---

## 7. Engineering design review addendum

A pre-implementation design review was performed after this scope gate was written, with the product direction held fixed — its job was to find hidden technical risk and wasted motion in the plan itself, not to change what gets built. Two findings materially change *how* the Must-Ship items in §3 get implemented; the rest are cheap, targeted corrections. All are reflected in `09 Sprint Plan.md` and `10 Task Backlog.md`; this section is the record of why.

### 7.1 GDELT's structured fields are not a free lunch (highest-priority finding)

§3's ingestion and relevance-scoring rows assume GDELT hands over ready-made entities, themes, and precise locations "for free." That's only true of GDELT's **GKG** feed — 15-minute-interval files in a dense, semicolon/pipe-delimited format (locations encoded as `Type#Name#Country#ADM1#ADM2#Lat#Long#FeatureID`, themes as delimited code lists) that takes real, non-obvious parsing work to get right. GDELT's other feed, the **DOC 2.0 API**, is a simple, well-documented JSON search endpoint but returns only title/url/date/domain/language/source-country — no entities, no themes, no precise coordinates.

The original plan quietly assumed GKG-level richness delivered through a DOC-API-level integration effort. That gap, discovered mid-implementation, could burn most of the remaining budget on an undocumented wire format.

**Resolution:** use the **DOC 2.0 API only**. Derive "themes/entities" as a lightweight keyword tag — match a small, self-chosen keyword list against each article's title at ingestion time — instead of trusting GDELT's own taxonomy. Use `sourcecountry` for geography (country-level, not city-level). This is strictly less code than a GKG parser, and it has a second benefit caught in §7.2 below: it puts the *same* vocabulary on both sides of the relevance-matching query, which a GKG-taxonomy approach would not.

### 7.2 The personalization-matching risk is bigger than it looks

The single most important 40 seconds of the demo is "same question, two profiles, visibly different answer." That moment silently depends on two things nothing in the original plan verified: (a) the extracted profile cards use *words* that actually appear in the seed data, and (b) the seed data is thematically diverse enough that two different profiles *can* rank differently. If the seed pull used one narrow GDELT query, or if profile-card labels don't share vocabulary with article titles/tags, Profile A and Profile B could silently produce near-identical top signals — and that failure wouldn't show up until demo rehearsal, when it's expensive to fix.

**Resolution, two parts:**
- Seed from **3–5 distinct GDELT DOC-API queries** on deliberately different topics (e.g., AI regulation, climate policy, markets, geopolitics), not one query — this guarantees the dataset has something to differentiate.
- Do a **five-minute manual SQL check** immediately after seeding (before any tool/UI code is written around it): run the intended relevance filter by hand for a rough Profile-A keyword set and a rough Profile-B keyword set, and eyeball that the top results actually differ. This is a validation step, not a feature — it exists to catch the risk in ten minutes instead of during Session 6 rehearsal.

### 7.3 Delete per-row ingestion idempotency — it's solving a problem this design doesn't have

The prior task backlog specified per-row content-fingerprint deduplication for the seed task, carried over from the full-scope design's continuous-polling pipeline. This build's ingestion is a **one-time replay**, not a recurring poll — there is no scenario where partial/incremental re-ingestion needs row-level dedup. Replace it with the simplest thing that works: the seed task checks whether the target table already has rows and no-ops if so; re-seeding from scratch is a manual truncate. This removes real implementation code for zero loss of correctness at this scope.

### 7.4 Two cheap, high-value guardrails to add to acceptance criteria

- **H3 coordinate order.** `06 Data.md` §9 already documents that ClickHouse's H3 functions take coordinates in a specific order that differs from common convention — a classic source of "the map shows the wrong continent" bugs. Add one concrete check to the seed-ingestion task's acceptance criteria: insert a row with a known real-world city's coordinates and confirm the computed `h3_r5` cell actually contains that city, before building the Map renderer on top of it.
- **Evidence Drawer must not depend on a live outbound fetch.** GDELT article URLs will occasionally 404 or paywall by the time of recording. The Evidence Drawer already stores title/domain/date locally — treat that stored metadata as the primary evidence display, with the outbound URL as a secondary, optional "view source" link, so a single dead link during the demo can't break the "every claim has evidence" requirement.

### 7.5 Delete manifest protocol versioning

`10 Task Backlog.md` §3 already trimmed manifest validation substantially; one piece of unnecessary complexity remains implicit rather than explicit: there is no scenario in a single ~15–20 hour build where two different manifest versions coexist, so no version-compatibility fallback logic needs to exist. Validate the one current shape; skip building for a migration that will never happen.

### 7.6 Task-order improvement: prove the least-certain integration first

The original five-task order proved `chat.agent()` (Task 4, an "emerging SDK" per `11 Risks.md` R-01) *after* building the ClickHouse schema and seed pipeline (Tasks 2–3) — but Task 4's fixture-based skeleton has no dependency on either. Since it's the single highest-uncertainty integration in the plan, it should be proven immediately after basic connectivity, not third. `09 Sprint Plan.md` §2–3 has been reordered accordingly: connectivity → `chat.agent()` fixture skeleton → schema → seed ingestion (+ the §7.2 diversity check) → real query wiring. Total work is unchanged; only the sequence moved, so that the least-certain piece is de-risked with the most runway left to react if it goes wrong.

### 7.7 Documentation-drift risk

`05`, `06`, `07`, and `11` still describe the full multi-day/team-scale design and were not rewritten when this scope gate was introduced. Left as-is, a developer (or an AI coding assistant) opening one of those documents directly — without first reading this one — could implement Postgres, a vector index, or the seven-tool agent surface, silently consuming the entire remaining budget on cut scope. A one-line scope-drift banner pointing back to this document and `10 Task Backlog.md` has been added to the top of each of those four files. This is the cheapest risk-reduction in this whole review.

---

## 8. Source notes

Written in response to a direct scope-gate request against the existing 12-document corpus, cross-checked against the two official hackathon source documents (Participant Handbook and Accepted Participant Setup Guide) to confirm: judging weights (25/20/20/20/10/5, unchanged from `01 Vision.md`/`05 Architecture.md`), Postgres-optional status (confirms §4's Postgres cut costs nothing against the core rubric), and the $5 Trigger.dev / $400 ClickHouse credit figures already assumed in `05 Architecture.md` §2 and `11 Risks.md` R-10.
