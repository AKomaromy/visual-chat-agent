# 11 — Risks

**Status:** Canonical risk and contingency plan, synthesized from the Deep Research corpus's `risk-register.md` (30 risks) and `roadmap.md` §6 (13 risks — ~90% overlapping, merged in as elaboration rather than duplicated as new entries), updated for GDELT-primary ingestion.
**Scales:** Likelihood and Impact rated 1–5. Exposure = Likelihood × Impact. Risks with exposure ≥15 are reviewed at every daily checkpoint.
**⚠ Scope notice:** this register assumes the full multi-day/team-scale build. For the current ~15–20 hour implementation, most risks below (R-09 tenancy, R-11 Postgres/CDC, R-19 graph semantics, R-23/R-24 high-volume ingestion) don't apply because the underlying feature is cut — see `12 Scope Gate.md`. The risks that still fully apply: R-01 (`chat.agent()` instability), R-05/R-08/R-18 (source data quality — now sharper, see the design-review addendum in `12 Scope Gate.md` §8), R-06, R-14, R-27.

---

## 1. Risk posture

Mirror is a one-week production-quality prototype. The strategy: front-load platform and integration uncertainty; make every external dependency replaceable or degradable; preserve one complete vertical slice at all times; use real live data but keep a deterministic demo replay; prefer typed, bounded systems over general agent autonomy; stop feature work early enough to protect the submission.

The highest risks are not scale. They are: failing to show meaningful required-platform use, building a visually weak answer, losing time to emerging SDKs, producing unreliable evidence, and recording an unstable demo.

---

## 2. Summary heat map

| ID | Risk | L | I | Exposure | Owner |
|---|---|---:|---:|---:|---|
| R-01 | `chat.agent()` integration instability | 4 | 5 | 20 | Agent lead |
| R-02 | Visual response still feels like text with decoration | 3 | 5 | 15 | Product/visual lead |
| R-03 | ClickHouse use appears superficial | 2 | 5 | 10 | Data lead |
| R-04 | End-to-end vertical slice arrives too late | 4 | 5 | 20 | CTO |
| R-05 | GDELT/source outage during demo | 4 | 4 | 16 | Data lead |
| R-06 | LLM output is unsupported or malformed | 4 | 4 | 16 | Agent lead |
| R-07 | Vector index unavailable or underperforms | 3 | 4 | 12 | Data lead |
| R-08 | GDELT location data produces misleading maps | 3 | 5 | 15 | Data lead |
| R-09 | Cross-tenant data leakage | 2 | 5 | 10 | CTO |
| R-10 | Trigger.dev credit/concurrency exhaustion | 3 | 4 | 12 | CTO |
| R-11 | Postgres/CDC bonus work derails core | 3 | 4 | 12 | CTO |
| R-12 | ClickHouse schema/order keys cause slow queries | 3 | 4 | 12 | Data lead |
| R-13 | Streaming payload exceeds platform limits | 3 | 4 | 12 | Agent lead |
| R-14 | Prompt injection from source content | 3 | 5 | 15 | Agent lead |
| R-15 | Demo exceeds five minutes or starts with explanation | 3 | 4 | 12 | Team captain |
| R-16 | Public repository violates rules or licensing | 2 | 5 | 10 | Team captain |
| R-17 | Code freeze missed | 2 | 5 | 10 | Team captain |
| R-18 | GDELT syndication/dedupe failure creates false trends | 4 | 4 | 16 | Data lead |
| R-19 | Entity graph implies false relationships | 3 | 4 | 12 | Data/visual lead |
| R-20 | WebGL/map/graph fails on judge device | 3 | 3 | 9 | Frontend lead |
| R-21 | Observability captures sensitive content | 2 | 4 | 8 | CTO |
| R-22 | Model/provider outage or rate limit | 3 | 4 | 12 | Agent lead |
| R-23 | Small ClickHouse inserts create excessive parts | 3 | 3 | 9 | Data lead |
| R-24 | Versioned data returns duplicates | 3 | 3 | 9 | Data lead |
| R-25 | Personalization becomes creepy or distorts facts | 2 | 4 | 8 | Product lead |
| R-26 | Data licensing/copyright breach | 2 | 5 | 10 | Team captain |
| R-27 | Scope expands beyond one-week capacity | 5 | 4 | 20 | CTO |
| R-28 | Local/production deployment mismatch | 3 | 4 | 12 | Platform lead |
| R-29 | No-data or stale-data turns fail awkwardly | 3 | 3 | 9 | Agent/frontend lead |
| R-30 | Architecture is impressive but cannot be explained quickly | 3 | 4 | 12 | CTO |
| R-31 | Secrets pasted directly into the chat transcript | 4 | 3 | 12 | Platform lead |
| R-32 | Blind "latest" dependency pinning breaks against bleeding-edge releases | 3 | 2 | 6 | Platform lead |

R-31 and R-32 were discovered during implementation, not in the original design review — see §10 for detail.

R-05 and R-18 carry higher likelihood than the source register's RSS-oriented framing because GDELT is now the sole P0 source (`05 Architecture.md` ADR-008) — a single-source dependency and its syndication/noise characteristics matter more, not less, under this design. This is the direct cost of the risk-reduction traded for in ADR-008 and is accepted deliberately (§7).

---

## 3. Detailed risks

### R-01 — `chat.agent()` integration instability
**Category:** Required platform / emerging SDK. **Score at risk:** Use of ClickHouse & Trigger.dev 25%, Technical Implementation 20%, Presentation 5%.
`chat.agent()` is a recent Trigger.dev capability; SDK patch mismatches, transport changes, message drops, stream resumption, or session-token issues could block the mandatory conversational path. **Early warning:** a basic turn can't complete in staging on Day 1; refresh loses the conversation; SDK packages resolve to different versions; tool parts don't deserialize consistently; production differs from local dev. **Prevention:** build the real chat vertical skeleton before ingestion (`09 Sprint Plan.md` Day 1); pin one exact 4.5.x patch across all Trigger packages; use the official transport pattern; keep a thin adapter around session/transport calls; add a smoke test for send/tool-part/final-part/refresh/reconnect. **Contingency:** simplify to one chat agent and fewer tool-part types; store artifacts before streaming final references; remove branching/steering/HITL except required clarification; never replace `chat.agent()` with a custom route — that violates the handbook.

### R-02 — Visual response still feels like text with decoration
**Category:** Problem fit. **Score at risk:** Problem Fit 20%, Innovation 20%, Presentation 5%.
The system could technically render charts while the useful answer remains a paragraph, missing the theme. **Early warning:** users read the prose before understanding the answer; visuals are generic and independent; the agent returns more than ~100–120 words; evidence is listed but not linked to visual marks; the same chart layout appears for every question. **Prevention:** MVRP requires verdict, views, shared filters, and evidence (`05 Architecture.md` ADR-004); enforce the prose budget (`04 Visual Language.md` §8); route response patterns to suitable visual policies (`03 UX.md` §3); require coordinated interactions; test "time to insight" with people who haven't seen the project. **Contingency:** remove prose sections; replace weak views with the Evidence Drawer or a verdict-only state; reduce the number of visuals and strengthen coordination; narrow demo questions to those where the visuals reveal a clear pattern.

### R-03 — ClickHouse use appears superficial
**Category:** Required platform. **Score at risk:** Use of ClickHouse & Trigger.dev 25%.
Using ClickHouse only as a document store or logging sink won't meet "meaningful use." **Early warning:** the main answer could be produced from an in-memory array; vector/H3/marts/live query metrics aren't visible; a different database could replace ClickHouse with no product change; the demo doesn't show a query or result path. **Prevention:** make map cells, hybrid retrieval, timelines, entity trends, relevance scores, artifacts, and telemetry ClickHouse-backed; show H3, vector, and pre-aggregation in the demo (provenance mode, `02 Product.md` §6.7); use named query templates and query telemetry; keep Postgres strictly limited. **Contingency:** cut nonessential UI and deepen one ClickHouse query path; demonstrate period comparison and cross-filter queries live; remove any external search/vector service.

### R-04 — End-to-end vertical slice arrives too late
**Category:** Delivery. **Score at risk:** All criteria.
Teams often build ingestion, UI, and agent layers separately and discover integration failures near submission. **Early warning:** Day 1 ends without a deployed chat-to-artifact-to-render path; Day 2 starts with mocked transport; components are "almost done" but no production flow exists. **Prevention:** complete the fixture vertical slice on Day 1 (`08 MVP.md` §1); merge small slices continuously; maintain a deployable main branch; don't parallelize foundational contracts before agreement. **Contingency:** freeze all P1/P2 work; use the demo seed corpus; reduce to Impact Radar, Timeline, and Evidence Drawer; use one question family until stable.

### R-05 — GDELT/source outage during demo
**Category:** External dependency / presentation. **Score at risk:** Problem Fit, Presentation.
GDELT (and, once added, RSS) may be slow, malformed, rate-limited, or unavailable during recording/judging — and because GDELT-primary means Mirror has one P0 source instead of many, this failure mode has no automatic redundancy until RSS ships as P1. **Early warning:** source health shows repeated failures; freshness lag exceeds the expected cadence; the demo query depends on a live fetch synchronous with the user turn. **Prevention:** ingest asynchronously; preserve last successful data and watermark; maintain a versioned public demo replay dataset (`WF-010 seed-demo`); record from already-ingested data while separately demonstrating live ingestion. **Contingency:** use seed/replay data with a visible timestamp; show degraded source health rather than blocking the answer; accelerate RSS (P1) if GDELT proves unreliable early in the week.

### R-06 — LLM output is unsupported or malformed
**Category:** Agent correctness. **Score at risk:** Technical Implementation, Problem Fit, Presentation.
The model may emit an invalid factual abstract, unsupported claims, an inappropriate visual choice, or a malformed MVRP. **Prevention:** strict Zod schemas; typed tools and a finite visual grammar; deterministic semantic policy checks (`05 Architecture.md` §7.3); one repair attempt for structured output; the 20-question evaluation set before production freeze. **Contingency:** fall back to deterministic renderer selection from tool output; show the Evidence Drawer + Timeline instead of failing; remove the evaluator-model loop in favor of deterministic checks only; reduce model temperature and tool count.

### R-07 — Vector index unavailable or underperforms
**Category:** ClickHouse capability. **Score at risk:** Required-platform depth, Innovation.
The ClickHouse Cloud version may not support the expected HNSW configuration, or filtered ANN recall may be weak. **Prevention:** verify on Day 1; build on a small seeded corpus first; store filterable metadata with chunks; retrieve a wider candidate set; keep the exact cosine fallback (`06 Data.md` §10). **Contingency:** use exact vector distance after time/topic filtering; reduce the corpus/window for the demo; document the fallback while retaining native ClickHouse vector computation.

### R-08 — GDELT location data produces misleading maps
**Category:** Data quality / trust. **Score at risk:** Problem Fit, Technical Implementation, Presentation.
GDELT's geocoding is not perfect — ambiguous place names, source-outlet locations mistaken for event locations, and country-level references can render as falsely precise points. **Early warning:** country-level stories appear as city points; many records show low confidence; map evidence doesn't mention the selected place. **Prevention:** store location role, confidence, and granularity per `06 Data.md` §5.6; only map records above the confidence threshold; use coarse H3 for coarse locations; never accept LLM-generated coordinates as authoritative; GeoNames join adds admin-level sanity-checking, not blind trust. **Contingency:** exclude low-confidence records from the map; fall back to country/admin aggregates; show the unresolved-location count and an evidence list.

### R-09 — Cross-tenant data leakage
**Category:** Security/privacy. **Score at risk:** Technical Implementation, Scalability & Impact.
A missing tenant predicate or artifact authorization check could expose another organization's profile or workspaces. **Prevention:** derive tenant from Clerk server-side; require tenant in every query template; separate artifact ownership checks; explicit cross-tenant integration tests (`10 Task Backlog.md` §5). **Contingency:** disable multi-tenant signups and run a single demo organization if isolation can't be proven; rotate keys and expire artifacts after any detected issue.

### R-10 — Trigger.dev credit or concurrency exhaustion
**Category:** Cost/operations. **Score at risk:** Platform use, Presentation.
The handbook's primary document lists a conservative $5 credit allocation, lower than a supplementary setup guide. **Prevention:** budget to $5 until the dashboard confirms otherwise; disable schedules outside production/staging; batch enrichment/embedding; set per-source and model concurrency; use lightweight worker sizes; add spend alerts and daily cost review. **Contingency:** reduce ingestion cadence; pause background enrichment and use seeded enriched data; request the handbook-described top-up if eligible; keep `chat.agent()` and one ingestion workflow active for meaningful-use evidence.

### R-11 — Postgres/CDC bonus work derails core
**Category:** Scope/platform. **Score at risk:** Core criteria and bonus.
Managed Postgres and ClickPipes are valuable but optional; provisioning, networking, schema mapping, or CDC debugging could consume a day. **Prevention:** strict four-to-five-table scope; the `ConfigRepository` abstraction; a hard 90-minute Day-1 go/no-go gate (`05 Architecture.md` ADR-006); ClickHouse remains independent for product data. **Contingency:** activate the fallback; remove the bonus claim; preserve architecture documentation as a future path without pretending it works.

### R-12 — ClickHouse schema or ordering keys cause slow queries
**Category:** Performance. **Score at risk:** Technical Implementation, Presentation.
Poor sorting keys, overly broad scans, or premature partitioning can make visual queries too slow. **Prevention:** design around tenant/time/H3/entity access paths; select only needed columns; record rows/bytes read; use the three targeted marts; test with realistic fixture volume. **Contingency:** narrow the time window/candidate set; add one measured projection or mart; precompute demo views only if the live query path stays visible elsewhere.

### R-13 — Streaming payload exceeds platform limits
**Category:** Trigger.dev/realtime. **Score at risk:** Technical Implementation, Presentation.
A tool may emit large GeoJSON, graph, or evidence arrays through chat, exceeding the ~1 MiB per-record cap. **Prevention:** persist large data and stream IDs only (`05 Architecture.md` ADR-011); enforce serialized-size checks; cap preview records; normalize artifact view tables. **Contingency:** replace a detailed payload with an aggregate preview; fetch view data after the final manifest; reduce graph/map result limits.

### R-14 — Prompt injection from source content
**Category:** Security/agent. **Score at risk:** Technical Implementation, trust.
A GDELT-linked page or RSS description may contain instructions intended to override the agent or exfiltrate context. **Prevention:** treat source content as untrusted evidence; clear delimiters and system policy; typed read-only tools; no arbitrary URL-fetch tool in chat; no source content in system messages; minimize private context in prompts. **Contingency:** disable the affected source; fall back to deterministic extraction; remove raw excerpts from composer input, providing only validated structured facts and evidence IDs.

### R-15 — Demo exceeds the limit or starts with explanation
**Category:** Submission/presentation. **Score at risk:** Presentation 5%, indirectly all criteria.
The handbook requires a maximum five-minute video opening directly on the product. **Prevention:** script to 4:30 (`09 Sprint Plan.md` §3); open with the live question; one main and one brief secondary flow; show platform consoles only after product value. **Contingency:** remove the secondary question; replace spoken architecture detail with one diagram; rerecord a tighter narrative rather than speeding up footage.

### R-16 — Public repository violates rules or licensing
**Category:** Eligibility/legal. **Score at risk:** Disqualification.
The repository may include pre-window code, proprietary code, incompatible dependencies, credentials, or unpublishable data. **Prevention:** a new repository with clear build-window history; MIT or Apache-2.0 license; dependency/license review; secret scanning; public attributable datasets only; commit seed metadata/excerpts only when permitted. **Contingency:** remove offending material and rebuild from lawful sources before freeze; replace the dataset with a synthetic/public fixture; never submit uncertain code or data.

### R-17 — Code freeze missed
**Category:** Submission. **Score at risk:** Disqualification.
The submission portal closes automatically with no extension. **Prevention:** draft the submission on Day 6; record a usable video before the final day; submit early; assign an explicit captain and backup checklist owner. **Contingency:** use the latest stable release candidate; stop all optional fixes 12 hours before the deadline.

### R-18 — GDELT syndication/dedupe failure creates false trends
**Category:** Data quality. **Score at risk:** Problem Fit, Technical Implementation.
GDELT surfaces the same underlying story across many outlets; without clustering, one headline can dominate the Impact Radar and Timeline, or replay can inflate counts. **Early warning:** one headline dominates multiple sources; counts spike after a window refresh; replay increases unique-event metrics; the duplicate rate is near zero despite obvious syndication. **Prevention:** separate exact fingerprints from near-duplicate clusters (`06 Data.md` §12); use event/cluster counts alongside article counts; cap source representation in evidence; test replay idempotency. **Contingency:** use distinct-cluster metrics in visuals; hide raw volume where quality is uncertain; rebuild the affected mart window from normalized facts.

### R-19 — Entity graph implies false relationships
**Category:** Visualization/data semantics. **Score at risk:** Innovation, trust, Problem Fit.
Users may interpret co-occurrence as partnership, causality, or endorsement. **Prevention:** separate co-occurrence from semantic relations (`06 Data.md` §5.7); label edge type clearly; require evidence IDs; normalize for popularity; cap and cluster the graph (`04 Visual Language.md` §5). **Contingency:** rename the view to "coverage connections"; show only co-occurrence with an explicit legend; remove directed relationships unless high-confidence fixtures pass.

### R-20 — WebGL visualization fails on a judge's device
**Category:** Frontend compatibility. **Score at risk:** Presentation.
MapLibre, deck.gl, or Cytoscape may fail on older hardware, restrictive browser settings, or constrained environments. **Prevention:** test Chrome/Safari/Firefox and a mid-range mobile device; lazy-load visual bundles; cap data; configure CSP and workers explicitly; accessible list/table fallbacks (`04 Visual Language.md` §13). **Contingency:** detect failure and render a ranked geography/entity list; keep the timeline/evidence functional without WebGL.

### R-21 — Observability captures sensitive content
**Category:** Privacy. **Score at risk:** Technical Implementation.
Sentry, Trigger.dev logs, or ClickHouse telemetry may store private profile content, source bodies, prompts, or tokens. **Prevention:** redaction hooks; metrics and IDs instead of raw content; hash user IDs; short error-content retention; no hidden-reasoning storage. **Contingency:** purge affected events where supported; rotate secrets if exposed; disable content capture and shorten retention.

### R-22 — Model/provider outage or rate limit
**Category:** External dependency. **Score at risk:** Problem Fit, Presentation.
The factual-abstract, embedding, or final-composition call may be unavailable. **Prevention:** batch and cache; separate raw ingestion from enrichment; keep provider interfaces swappable; pre-enrich the demo seed; configure one evaluated fallback only if time permits. **Contingency:** use deterministic visual composition from existing analytical facts; use lexical/entity retrieval when embeddings fail; pause enrichment schedules; record against seeded enriched data.

**Occurred, 2026-07-19 (more severe than the risk anticipated):** the Anthropic organization behind this project's `ANTHROPIC_API_KEY` was disabled at the account level (`"This organization has been disabled."`), confirmed live via a direct test call, unrelated to rate limits or a transient outage — an account/billing/compliance-review state, appealed but with no known resolution time. This is a harder failure than "outage or rate limit" contemplated: not retryable, not time-bounded. **Resolution exercised:** swapped `mirror-agent`'s model provider from `@ai-sdk/anthropic` to `@ai-sdk/openai` (`trigger/chat.ts`, `gpt-4o`) — validating the "keep provider interfaces swappable" prevention measure above; the AI SDK's provider abstraction made this a genuinely small, contained change (two files, no product/behavior change). `docs/14 Engineering Handoff.md` §5/§7 has the current provider and credential status.

### R-23 — Small ClickHouse inserts create excessive parts
**Category:** Data operations. **Score at risk:** Technical Implementation, Scalability.
Many tasks may insert single rows, increasing parts and merge pressure. **Prevention:** batch within tasks; fan-in related facts; asynchronous inserts only with measured settings; monitor rows per insert and part count. **Contingency:** reduce task concurrency; increase the batch window; route writes through a bounded batching task.

### R-24 — Versioned data returns duplicates
**Category:** ClickHouse semantics. **Score at risk:** Technical Implementation, trust.
`ReplacingMergeTree` deduplication is eventual; careless views can surface multiple versions. **Prevention:** curated current-version views; immutable fact design where possible; never depend on background merge timing; avoid `FINAL` in hot paths, use deterministic `argMax`/version selection instead. **Contingency:** rebuild the affected aggregate; narrow the demo to immutable seeded facts; add a current-version canonical table for the specific path.

### R-25 — Personalization becomes creepy or distorts facts
**Category:** Product/privacy. **Score at risk:** Problem Fit, Impact.
Detailed context could feel invasive or create a filter bubble, and judges may not understand how ranking changed. **Prevention:** context changes ranking/emphasis only, never facts (`02 Product.md` §7.2); show compact "why this matters to you" factors; keep facts/evidence shared and attributable; store only explicit context. **Contingency:** disable personalization in the public demo if needed; use a small selected-interest profile; keep contextual callouts visually separate from factual layers.

### R-26 — Data licensing or copyright breach
**Category:** Legal/eligibility. **Score at risk:** Disqualification/reputation.
Storing or publishing full article content, images, or GDELT/RSS data beyond permitted terms could violate third-party rights. **Prevention:** metadata-and-excerpt-first policy; per-source license policy; attribution in UI and README; GeoNames CC BY attribution; no general crawler. **Contingency:** remove full content and media; re-embed from permitted excerpts; replace the source with a public-domain/permissive fixture.

### R-27 — Scope expands beyond one-week capacity
**Category:** Delivery. **Score at risk:** All criteria.
The concept naturally invites more sources, visuals, import methods, and features. **Prevention:** the P0/P1/P2 scope in `08 MVP.md`; the stop conditions in `09 Sprint Plan.md` §6; one decision owner; daily deploy and demo rehearsal; a new feature must replace, not merely add to, existing work after Day 4. **Contingency:** cut to one response pattern and three views; remove Postgres/CDC, the relationship graph, and saved workspaces in that order (full cut order in §5 below); preserve core Trigger.dev/ClickHouse/visual-answer capability.

### R-28 — Local/production deployment mismatch
**Category:** Platform. **Score at risk:** Technical Implementation, Presentation.
Server/client runtime differences, environment variables, CSP, region latency, or Trigger.dev deployment versions may break production. **Prevention:** Node runtime for server routes; deploy from Day 1; environment schema validation; staging mirrors production; record commit and deployed task versions; smoke test after every deploy. **Contingency:** roll back Vercel/Trigger.dev versions; disable the newest optional feature; use the known artifact and seeded corpus.

### R-29 — No-data or stale-data turns fail awkwardly
**Category:** UX/resilience. **Score at risk:** Problem Fit, Presentation.
A narrow query may have insufficient data, causing empty visuals or fabricated explanations. **Prevention:** minimum-data policies; `noData`/`partial`/`stale` manifest states (`03 UX.md` §15); suggest one bounded expansion of time/geography/topic; never infer a trend from zero/very low counts. **Contingency:** render an evidence/no-data card with one recommended filter change; use a broader view only with a user-visible notice; ask a clarification via the `askUser` tool.

### R-30 — Architecture cannot be explained within the demo
**Category:** Presentation. **Score at risk:** Platform use, Technical Implementation, Presentation.
A sophisticated design may be invisible or require a long walkthrough. **Prevention:** one architecture diagram; one sentence per platform ("Trigger.dev runs the durable agent and pipelines," "ClickHouse turns live GDELT events into vector, temporal, spatial, graph, and personalized-visual query results"); show the exact Trigger.dev run and ClickHouse query behind the answer. **Contingency:** remove optional architecture from the spoken demo; move detail to the README/docs; focus on the one live answer path.

---

## 4. Daily risk gates

| Checkpoint | Must close or reduce |
|---|---|
| End of Day 1 | R-01 chat integration; R-04 vertical slice; R-11 Postgres/CDC go/no-go; R-28 production mismatch |
| End of Day 2 | R-05 source failure; R-16 repository/license; R-18 dedupe; R-23 insert parts |
| End of Day 3 | R-07 vector; R-08 geocoding/mapping; R-12 query performance; R-22 model/provider |
| End of Day 4 | R-02 visual problem fit; R-06 malformed output; R-13 stream payload; R-14 prompt injection; R-29 no-data states |
| End of Day 5 | R-09 tenant leakage; R-19 graph semantics; R-20 WebGL; R-21 observability privacy; R-25 personalization |
| End of Day 6 | R-15 demo duration; R-17 deadline; R-27 scope; R-30 architecture explanation |

---

## 5. Scope-cut order

When schedule risk rises, cut in this order:

1. Conversation branching and regeneration.
2. Source administration UI.
3. Export/share.
4. External geocoder fallback (P1).
5. Saved workspaces.
6. Postgres/CDC bonus path.
7. Directed semantic graph edges — retain co-occurrence only.
8. Relationship graph entirely.
9. Profile import breadth — retain a small seeded profile.
10. Period-comparison extras.

**Never cut:** `chat.agent()`; Trigger.dev ingestion/orchestration; the ClickHouse primary data path; map/H3 use; vector retrieval or its exact ClickHouse fallback; the timeline/change view; evidence and provenance; visual manifest validation; public deployment and demo. (Identical to the "never cut" list in `08 MVP.md` §2 — repeated here because it is the anchor every other cut decision hangs off.)

---

## 6. Incident severity during the hackathon

| Severity | Definition | Response |
|---|---|---|
| S0 | Disqualification/deadline/security exposure risk | Stop all work; CTO/team captain owns resolution |
| S1 | Core live demo or required-platform path broken | Stop P1/P2; restore the latest stable release |
| S2 | One visual/source/optional workflow broken | Disable or degrade the feature; continue core |
| S3 | Cosmetic, minor performance, documentation issue | Queue behind demo stability |

---

## 7. Risk acceptance criteria

A risk may be marked accepted only when: the core submission remains compliant; the demo has a deterministic fallback; the limitation is documented honestly; it doesn't expose private data or unauthorized content; it doesn't weaken the meaningful ClickHouse/Trigger.dev story; the team understands the user-visible behavior.

**Acceptable limitations:** a single-source (GDELT) P0 corpus, with RSS as a documented P1 gap, not a hidden one; entity/location data limited to GDELT's confidence and precision; relationship graph limited to recent high-confidence co-occurrences; external geocoder disabled; exact vector fallback for a small corpus; a single seeded user profile in the demo.

**Unacceptable limitations:** fake ClickHouse results; mocked Trigger.dev usage in production; static screenshots as the response; unsupported claims without evidence; public cross-tenant access; a late/private repository; code outside the build-window rules.

---

## 8. Residual risk narrative for submission

The public README should acknowledge: the corpus is GDELT-sourced and curated, not a complete representation of world news; GDELT's own entity/location extraction has known precision limits, which Mirror surfaces via confidence scoring rather than hiding; co-occurrence is not causation or a confirmed relationship; source freshness depends on GDELT's own update cadence; personalization affects ranking, not facts; the hackathon build uses a bounded, four-type visual grammar; production expansion would add RSS source diversity, deeper licensing governance, deletion verification, regional deployment, and larger-scale entity resolution. This honesty strengthens rather than weakens the Technical Implementation score — it shows the team understands the system's boundaries.

---

## 9. Risk register ownership

**CTO:** required-stack compliance, scope, cost, tenancy, architecture, final risk acceptance. **Team captain:** eligibility, repository, licensing, demo, submission deadline. **Agent lead:** `chat.agent()`, model behavior, prompts, tools, streams, injection defenses. **Data lead:** ClickHouse schema, GDELT ingestion, vector, H3, location normalization, dedupe, provenance. **Frontend/visual lead:** MVRP rendering, coordination, accessibility, WebGL fallbacks. **Platform lead:** environments, deployment, secrets, monitoring, rollback. For a solo team, these remain hats and checklist ownership areas rather than separate people.

---

## 10. Implementation-phase risks (discovered during Stage A build, not in the original register)

Two genuinely new risks surfaced once real implementation started, distinct from anything in §3's original 30. Both are process risks, not architecture risks — neither changes any product decision, but both are worth a future session (or future teammate) knowing about.

### R-31 — Secrets pasted directly into the chat/session transcript

**Category:** Operational security. **Likelihood:** high (already occurred three times). **Impact:** medium.

Despite an explicitly established protocol (paste credentials directly into `.env.local`, never into the chat), the ClickHouse database password and the Trigger.dev dev secret key were both pasted in plaintext into the conversation during Task 1 setup. The values were applied to `.env.local` (correctly gitignored, never committed) and never echoed back or logged, but the chat transcript itself may be retained by the session/platform, so both values should be treated as exposed.

**Recurred, 2026-07-19:** a live `ANTHROPIC_API_KEY` was pasted directly into chat (along with a `curl` command containing it), unprompted, despite the handoff doc explicitly citing this exact credential as "the template" for doing it correctly the first time. It was moved to `.env.local` immediately and never echoed back, but per this risk's own standing rule, must be treated as exposed. In this specific case the key turned out to be non-functional anyway (its Anthropic organization was disabled — R-22), so the practical exposure window was short and the project has since moved off that key entirely (provider swapped to OpenAI). Still counts as a recurrence of the underlying behavior, not a new/different risk.

**Mitigation:** rotate/regenerate any credential pasted into chat once it's no longer needed or before any public sharing of this project (ClickHouse: Settings → Reset password; Trigger.dev: API Keys → revoke and regenerate the dev secret key; the exposed Anthropic key is already moot since its org is disabled, but should not be reused if the appeal succeeds — generate a fresh one instead). Going forward: when asking a user for any new credential, state the file-paste pattern explicitly in the same message as the ask, not just rely on it being established convention from earlier in the project — three occurrences across one build suggests convention alone isn't sufficient reinforcement.

### R-32 — Blind "latest" dependency pinning breaks against bleeding-edge ecosystem releases

**Category:** Technical/tooling. **Likelihood:** medium (already occurred twice in one scaffold session). **Impact:** low (caught immediately by the typecheck/lint/build gate, cost under 15 minutes each time).

`npm view <pkg> version` for `typescript` and `eslint` both resolved to a just-released new major (TypeScript 7's native-compiler rewrite; ESLint 10) that broke against `eslint-config-next`'s current compatibility layer and other tooling in the stack. Both were fixed by deliberately pinning to the latest **stable prior** major (TypeScript 5.9.3, ESLint 9.x) instead of blindly taking whatever `latest` resolves to.

**Mitigation:** for any new dependency added in a future session, check whether it's a foundational tooling package (compiler, linter, bundler) that other pinned packages (`eslint-config-next`, `@trigger.dev/*`) need to interoperate with — if so, prefer the newest version those other packages were clearly built against, not simply the newest version that exists on the registry. Run typecheck/lint/build immediately after any new install to catch this class of break early, as was done here.

### R-33 — Local sandbox background processes cannot reach new third-party hosts

**Category:** Development-environment/tooling. **Likelihood:** certain, inside this specific sandboxed session type. **Impact:** low once identified (unblocked by deploying to Trigger.dev Cloud instead of relying on the local `trigger.dev dev` worker for live verification).

Discovered while attempting Task 4's first live run: the local `trigger.dev dev` worker (a required background process) reliably timed out connecting to `api.gdeltproject.org`, while the identical request from a foreground command succeeded instantly and a background `node fetch` to the same host reproduced the same timeout with no Trigger.dev involvement at all. ClickHouse Cloud was unaffected (an already-established host). Full root cause in `docs/14 Engineering Handoff.md` §7.

**Mitigation:** for local-sandbox development sessions, verify Trigger.dev tasks that call new third-party hosts (GDELT, Anthropic, etc.) by deploying to Trigger.dev Cloud rather than relying on the local `trigger.dev dev` worker — Cloud workers run on Trigger.dev's own infrastructure with normal internet access. This is not a product or architecture risk; it does not apply to a normal developer machine or to the deployed product.

### R-34 — Trigger.dev's public REST management API rejects short-lived CLI user-actor tokens

**Category:** Development-environment/tooling. **Likelihood:** confirmed once. **Impact:** low (a documented, reliable fallback exists — the dashboard).

Attempted to script `envvars.upload()` (the SDK's env-var-sync management call) using a `tr_uat_...` token minted from the already-authenticated CLI session (`trigger.dev mint-token`), to push ClickHouse credentials to the deployed Cloud environment without a manual dashboard step. The call failed with `401 Invalid or Missing API key` against both the `staging` and `prod` environments — the CLI's own `env list`/`env pull` read commands work through a different, internal authenticated channel than the public SDK's REST client, which appears to require a personal access token or an environment-scoped secret key, not a short-lived user-actor token.

**Mitigation:** environment variables for Trigger.dev Cloud environments must be added through the dashboard (Project → Environment Variables → New environment variable → mark Secret) until a project-scoped write credential is deliberately provisioned for this purpose. This is a one-time, per-environment manual step, not a recurring one — see `docs/14 Engineering Handoff.md` §7 for the exact variables needed.

---

## 11. Source notes

Synthesized from the Deep Research corpus's `risk-register.md` (canonical 30-risk register) merged with `roadmap.md` §6 (which covered the same risk surface from a product/roadmap angle with materially the same items — no new risk IDs were created from it, only elaboration). R-05, R-08, and R-18 were rewritten for GDELT-primary ingestion per `05 Architecture.md` ADR-008/009; likelihood ratings for R-05 and R-18 were raised relative to the source register to reflect the single-source P0 dependency this creates, and that trade-off is recorded explicitly in §1 and §8. R-31 and R-32 added during Stage A implementation; R-33 and R-34 added during the Trigger.dev Cloud deployment session (see `docs/14 Engineering Handoff.md` for current build status).
