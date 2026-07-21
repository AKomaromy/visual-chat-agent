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
| R-33 | Local sandbox background processes cannot reach new third-party hosts | 5 | 1 | 5 | Platform lead |
| R-34 | Trigger.dev's public REST management API rejects short-lived CLI user-actor tokens | 1 | 1 | 1 | Platform lead |
| R-35 | ClickHouse column-alias shadowing breaks `h3ToGeo` silently until run | 1 | 2 | 2 | Data lead |
| R-36 | CSS percentage-height children collapse silently inside a bottom-aligned flex row | 1 | 1 | 1 | Frontend lead |
| R-37 | `seed-gdelt`'s default `maxDuration` too short for its own backoff logic | 1 | 2 | 2 | Platform lead |
| R-38 | Fixed per-profile `chatId` permanently locks out a profile once its Session closes | 2 | 5 | 10 | Frontend lead |
| R-39 | Model's raw text response rendered as an uncontracted extra "view" | 2 | 4 | 8 | Frontend lead |

R-31 through R-39 were discovered during implementation, not in the original design review — see §10 for detail. R-33 through R-39 are one-off, already-resolved implementation defects rather than standing risks; kept here for the historical record, not as items requiring ongoing monitoring. R-38 and R-39 are rated higher-impact than R-33–R-37 because, unlike those, both would have directly broken or degraded the recorded demo itself if they'd gone unnoticed.

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

**Occurred, 2026-07-19, attempting Task 4's first live run on Trigger.dev Cloud.** `api.gdeltproject.org` was unreachable (`ConnectTimeoutError`) from the deployed `prod` environment on two consecutive attempts. Isolated as a genuine GDELT-side outage, not an environment problem: `https://www.gdeltproject.org` (the marketing site, different subdomain) and `https://www.google.com` both responded normally from the same network path at the same time, while `api.gdeltproject.org` specifically timed out on a direct foreground `curl` too — three independent paths (local foreground, Trigger.dev Cloud ×2) all failed identically at the same moment, and general internet connectivity was confirmed fine throughout. `seed-gdelt.ts` itself is not implicated — it reached the fetch call and failed exactly the way real code should when the target host is down. No code changes made in response; re-run `seed-gdelt` once GDELT's API is reachable again (`curl` the endpoint directly to check before re-triggering).

**Retried, 2026-07-20 (Session 6, single checkpoint per instruction — not repeated polling).** A direct `curl` to `api.gdeltproject.org` from this session's local sandbox now succeeds (HTTP 200; a rate-limit notice, not a timeout) — the earlier blanket outage is not total. Retriggering `seed-gdelt` against `prod` first hit an unrelated, genuinely fixable defect: the task's default 60s `maxDuration` (`trigger.config.ts`) was too short for its own built-in GDELT 429-backoff logic (up to 4 retries at 5s/10s/15s/20s per query, across 4 sequential queries) — fixed by setting a per-task `maxDuration: 300` override on `seed-gdelt` (`trigger/seed-gdelt.ts`), redeployed as `prod` version `20260720.3`. Retrying once more with the fix in place produced a clean, unambiguous signal: `ConnectTimeoutError` again, from Trigger.dev Cloud's network specifically, seconds after this session's own local sandbox reached the same host successfully. **Refined understanding:** this is not necessarily a blanket global GDELT outage (as first characterized) — it may be specific to Trigger.dev Cloud's egress path (region-specific blocking, rate-limiting by IP/ASN, or a narrower intermittent issue), since a different network path reaches GDELT fine at the same moment. Practical status is unchanged: Task 4 is still blocked, live ingestion still cannot complete from `prod`. Before the next retry, check `api.gdeltproject.org` reachability from **both** a local `curl` and (if feasible) a Trigger.dev Cloud test run — reachability from one path no longer implies reachability from the other.

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

**Recurred immediately, same day, with the replacement provider.** The new `OPENAI_API_KEY` returns `429 insufficient_quota` (`"You exceeded your current quota, please check your plan and billing details."`) on a direct test call — confirmed twice, once before and once after the user reported adding billing to the OpenAI account, with the identical result both times. Whatever billing action was taken has not yet propagated to this key, or was applied to a different org/project than the one that issued it, or OpenAI requires a separate usage-limit increase beyond just adding a payment method (a common gotcha on platform.openai.com — check **Settings → Limits**, not just **Settings → Billing**). This surfaced live inside `mirror-agent`: the run reached `WAITING` with a sanitized `"An error occurred."` on the wire and zero cost/duration recorded, consistent with the model call failing before any tokens were generated. Not fixable from this session — needs the user to resolve on the OpenAI dashboard directly.

**Resolved, 2026-07-20.** The OpenAI account's quota cleared on its own (no further code or config changes on this side). Confirmed live via `scripts/verify-task2-chat-live.ts` (both profiles, no errors, manifests differ) and via an actual browser session through the full chat.agent() → getBriefing → streamed-manifest → rendered-workspace pipeline, zero console errors. Task 2 is now fully passed, not just dispatch-verified.

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

**Confirmed, Session 7 security audit (2026-07-20):** `OPENAI_API_KEY`'s actual value was also pasted into chat — confirmed directly by the user, since this risk's own narrative up to that point hadn't documented it (a summary line elsewhere had asserted it without this narrative actually supporting the claim; that inconsistency is what prompted asking). All three of `CLICKHOUSE_PASSWORD`, `TRIGGER_SECRET_KEY`, and `OPENAI_API_KEY` are now confirmed chat-exposed and require rotation — see `docs/19 Security Rotation and Provider Resilience Runbook.md` for the guided rotation procedure.

**Mitigation:** rotate/regenerate any credential pasted into chat once it's no longer needed or before any public sharing of this project (ClickHouse: Settings → Reset password; Trigger.dev: API Keys → revoke and regenerate the dev secret key; the exposed Anthropic key is already moot since its org is disabled, but should not be reused if the appeal succeeds — generate a fresh one instead). Going forward: when asking a user for any new credential, state the file-paste pattern explicitly in the same message as the ask, not just rely on it being established convention from earlier in the project — three occurrences across one build suggests convention alone isn't sufficient reinforcement.

### R-32 — Blind "latest" dependency pinning breaks against bleeding-edge ecosystem releases

**Category:** Technical/tooling. **Likelihood:** medium (already occurred twice in one scaffold session). **Impact:** low (caught immediately by the typecheck/lint/build gate, cost under 15 minutes each time).

`npm view <pkg> version` for `typescript` and `eslint` both resolved to a just-released new major (TypeScript 7's native-compiler rewrite; ESLint 10) that broke against `eslint-config-next`'s current compatibility layer and other tooling in the stack. Both were fixed by deliberately pinning to the latest **stable prior** major (TypeScript 5.9.3, ESLint 9.x) instead of blindly taking whatever `latest` resolves to.

**Mitigation:** for any new dependency added in a future session, check whether it's a foundational tooling package (compiler, linter, bundler) that other pinned packages (`eslint-config-next`, `@trigger.dev/*`) need to interoperate with — if so, prefer the newest version those other packages were clearly built against, not simply the newest version that exists on the registry. Run typecheck/lint/build immediately after any new install to catch this class of break early, as was done here.

### R-33 — Local sandbox background processes cannot reach new third-party hosts

**Category:** Development-environment/tooling. **Likelihood:** certain, inside this specific sandboxed session type. **Impact:** low once identified (unblocked by deploying to Trigger.dev Cloud instead of relying on the local `trigger.dev dev` worker for live verification).

Discovered while attempting Task 4's first live run: the local `trigger.dev dev` worker (a required background process) reliably timed out connecting to `api.gdeltproject.org`, while the identical request from a foreground command succeeded instantly and a background `node fetch` to the same host reproduced the same timeout with no Trigger.dev involvement at all. ClickHouse Cloud was unaffected (an already-established host). Full root cause in `docs/14 Engineering Handoff.md` §7.

**Mitigation:** for local-sandbox development sessions, verify Trigger.dev tasks that call new third-party hosts (GDELT, Anthropic, etc.) by deploying to Trigger.dev Cloud rather than relying on the local `trigger.dev dev` worker — Cloud workers run on Trigger.dev's own infrastructure with normal internet access. This is not a product or architecture risk; it does not apply to a normal developer machine or to the deployed product.

**Re-confirmed, Session 7 hardening pass:** `seed-gdelt.ts`'s ingestion logic was extracted into a standalone `runSeedGdelt()` function so it could be exercised directly (`npx tsx`) against the same ClickHouse Cloud destination, bypassing Trigger.dev's dispatch layer entirely, as a true "does the local network path reach GDELT" test rather than a Trigger.dev-specific one. The direct attempt failed with `ConnectTimeoutError` (`api.gdeltproject.org:443`, 10s timeout). An immediate follow-up reachability check (`curl` and a bare `fetch`, both outside any ingestion attempt) reached the same host successfully, returning `HTTP 429` — confirming the connectivity is genuinely intermittent from this environment, not a hard, permanent block, and not specific to Trigger.dev's runtime. Per the explicit "attempt exactly one controlled local ingestion, do not repeatedly retry" instruction for this pass, the real ingestion was not re-attempted despite the successful reachability ping. Fixtures were left in place (the no-op guard in `runSeedGdelt` never reached the insert step, since the fetch failed on the very first of four topic queries) and the judged build still runs on `[DEV FIXTURE]`-prefixed development data, not live GDELT.

### R-34 — Trigger.dev's public REST management API rejects short-lived CLI user-actor tokens

**Category:** Development-environment/tooling. **Likelihood:** confirmed once. **Impact:** low (a documented, reliable fallback exists — the dashboard).

Attempted to script `envvars.upload()` (the SDK's env-var-sync management call) using a `tr_uat_...` token minted from the already-authenticated CLI session (`trigger.dev mint-token`), to push ClickHouse credentials to the deployed Cloud environment without a manual dashboard step. The call failed with `401 Invalid or Missing API key` against both the `staging` and `prod` environments — the CLI's own `env list`/`env pull` read commands work through a different, internal authenticated channel than the public SDK's REST client, which appears to require a personal access token or an environment-scoped secret key, not a short-lived user-actor token.

**Mitigation:** environment variables for Trigger.dev Cloud environments must be added through the dashboard (Project → Environment Variables → New environment variable → mark Secret) until a project-scoped write credential is deliberately provisioned for this purpose. This is a one-time, per-environment manual step, not a recurring one — see `docs/14 Engineering Handoff.md` §7 for the exact variables needed.

### R-35 — ClickHouse column-alias shadowing breaks `h3ToGeo` silently until run

**Category:** Technical/ClickHouse correctness. **Likelihood:** confirmed once, caught immediately. **Impact:** low (caught by live browser verification before this reached the Cloud deployment users would see).

`lib/briefing.ts`'s Map query originally did `toString(h3_r5) AS h3_r5` — reusing the source column's own name as the alias for a *different-typed* derived value in the same `SELECT` list. The subsequent `h3ToGeo(h3_r5)` call in that same list then resolved to the new String alias instead of the real `UInt64` column, failing with `Illegal type String of argument 1 of function h3ToGeo. Must be UInt64`. Passed `tsc`/`eslint`/`next build` cleanly — this is a runtime SQL semantics issue with no static check that would catch it went undetected until an actual live query ran against real ClickHouse, during the visual-workspace headless-browser verification pass.

**Mitigation:** never re-alias a derived column back to its own source column's name within the same `SELECT` list, especially when the derived value has a different type than the source. Rename to something else (`h3` instead of `h3_r5`, in this fix) and, more generally, always exercise a new or changed ClickHouse query live — against real infrastructure, not just typecheck/build — before considering it done; this project's whole session-by-session pattern of live-verifying every query (Tasks 1, 3, 4, 5) is exactly the practice that caught this one too.

### R-36 — CSS percentage-height children collapse silently inside a bottom-aligned flex row

**Category:** Technical/frontend correctness. **Likelihood:** confirmed once, caught immediately. **Impact:** low (cosmetic — caught by screenshot inspection during live browser verification, not left in the deployed workspace).

The Timeline view's bar chart (`app/components/workspace/Timeline.tsx`) originally sized each bar with a CSS percentage height (e.g. `height: 66%`) inside a flex row using `items-end` (bottom-align children of differing height). `items-end` overrides the flex default of stretching children to fill the cross-axis, so each bar's flex-item parent sized to its own content height instead of the row's fixed height — leaving the percentage-height bar with no reference frame to compute against, so it silently rendered at ~0px. Invisible in a screenshot until specifically looked for; `tsc`/`eslint`/`next build` have no way to catch a purely visual CSS layout bug.

**Mitigation:** don't mix `items-end` alignment with percentage-height descendants — either stretch the row (default `items-stretch`) and bottom-align content *within* each fixed-height child, or compute an explicit pixel height in JS (what the fix does) so there's no ambiguous reference frame. More generally: a chart or visual component isn't verified by type/lint/build passing — it has to actually be looked at rendered, which is why this session used a headless browser and real screenshots rather than trusting static checks alone for anything visual.

### R-37 — `seed-gdelt`'s default `maxDuration` (60s) too short for its own built-in GDELT backoff logic

**Category:** Technical/Trigger.dev configuration. **Likelihood:** confirmed once, caught immediately. **Impact:** low (caught on the first Session-6 retry, before it could mask a genuine GDELT-availability read).

`trigger.config.ts`'s project-wide default `maxDuration: 60` applies to every task unless overridden. `seed-gdelt` runs 4 sequential GDELT queries, each with up to 4 built-in 429-backoff retries (5s/10s/15s/20s) plus a deliberate 2s politeness delay between queries — a query that gets rate-limited even once can alone consume most of a 60s budget, and the task was stopped mid-run with `MAX_DURATION_EXCEEDED` on a Session-6 retry attempt, right after GDELT itself had become reachable again. This masked the real signal: the run wasn't failing because GDELT was down, it was failing because our own duration budget didn't account for backoff logic we ourselves wrote.

**Mitigation:** added a per-task override, `maxDuration: 300`, on `seed-gdelt` specifically (`trigger/seed-gdelt.ts`) rather than raising the global default (which would also loosen budgets on unrelated tasks like `mirror-agent`). Redeployed as `prod` version `20260720.3`. General lesson: when a task has its own retry/backoff logic, its `maxDuration` must be sized to tolerate that logic's worst case, not just the happy-path network latency — otherwise a duration timeout can be misread as an external outage.

### R-38 — Fixed per-profile `chatId` permanently locks out a profile once its Session closes

**Category:** Technical/Trigger.dev Sessions correctness. **Likelihood:** confirmed, actually occurred (not hypothetical). **Impact:** would have been high if undetected — the locked-out profile was Profile A, the very first thing asked in the recorded demo script.

`app/components/chat.tsx` originally derived `chatId` as a fixed constant, `${profileId}-chat`. Trigger.dev Sessions are terminal — once closed, that exact `externalId` can never start a new session (`409 Session is closed; use a different externalId`). A prior session's dev-testing had left `profile-a-chat` permanently closed. Verifying the deployed demo flow for both profiles this session (Session 6) reproduced this live: Profile A failed with a real `500` in the browser, using the actual product UI, not a contrived test — meaning **the demo as scripted could not have been recorded** until this was found and fixed.

**Mitigation:** `getOrCreateChatId()` now mints a fresh `${profileId}-chat-<uuid>` the first time a profile is used in a browser tab, persisted in `sessionStorage` so a same-tab reload still resumes the same session (preserving the optional durable-refresh proof), without ever reusing a `chatId` that might already be dead from an earlier tab/session. General lesson: a fixed, permanent external ID for a resource that can be closed forever is a single point of failure — mint fresh identifiers scoped to the actual lifetime that needs continuity (here: one browser tab), not longer.

### R-39 — Model's raw text response rendered as an uncontracted extra "view", contradicting the Demo Contract

**Category:** Product/Demo Contract compliance. **Likelihood:** confirmed, present since the chat.tsx rewrite that built the visual workspace. **Impact:** would have directly hurt Problem Fit and Innovation on camera — the exact failure mode `docs/00 §1` and this register's own R-02 warn about ("the useful answer remains a paragraph").

`app/components/chat.tsx` rendered every model-generated text part below the `Workspace`, in addition to it. Caught visually during Session 6's live browser verification (a full markdown-style briefing paragraph, with headers and "Read more" links, appeared under the Evidence Drawer) — not by any static check, since this is a product/UX correctness issue, not a type or lint error. This directly violated `docs/13 Demo Contract.md` §5's "No other view type renders."

**Mitigation:** removed the raw text-part rendering block and its now-unused `textParts` derivation from `app/components/chat.tsx` entirely. The Verdict Strip (deterministic, ClickHouse-derived) remains the only text summary shown; the model's own free-form narration is never displayed. General lesson: a visual component list can be code-complete and pass every static check while still silently violating a locked product contract — this is exactly the kind of thing that's only caught by actually looking at a live-rendered screen, which is why this project treats live browser verification as mandatory for anything touching the workspace.

**Root cause addressed, Session 7 hardening pass:** the frontend fix above only stopped the narration from being *displayed* — the model (`trigger/chat.ts`) was still generating it every turn, spending tokens/time/cost on prose that was already being discarded, and leaving the underlying agent behavior inconsistent with this project's own hard requirement that the LLM stay "limited to request interpretation, typed tool invocation, and manifest streaming." Fixed at the source: `onChatStart`'s system prompt now explicitly instructs the model not to write any prose, summary, or narration after calling `getBriefing`. Lower-risk than changing the `streamText` step-loop mechanics (`stopWhen`) directly, since the working live-verified dispatch/streaming path wasn't touched.

### R-40 — Timeline/Map displayed counts could exceed the evidence actually available for them

**Category:** Product/data-consistency. **Likelihood:** confirmed, present since Task 5's original `getBriefingManifest`. **Impact:** would have surfaced on camera as a dead end — clicking a Timeline bar or Map point whose count came from articles outside the Impact Radar's top 7 opened an Evidence Drawer with nothing in it, or fewer items than the mark's own displayed count claimed.

`lib/briefing.ts` originally ran three independent queries: a `LIMIT 7` ranked-signal query feeding the Radar (and the only source of `evidence` entries), plus separate, uncapped Timeline (`GROUP BY toDate`) and Map (`GROUP BY h3_r5`) queries counting *all* matching articles regardless of rank. A Timeline bucket or Map cell's `count` could therefore include articles ranked below the top 7, but `evidenceIds` had nowhere to resolve them — the Evidence Drawer had an explicit "no evidence loaded for this selection" fallback specifically to paper over this gap.

**Mitigation:** collapsed all three views onto one query (`matchingRows`, capped at a generous 500-row safety bound instead of the 7-row display cap) so the Radar's top-7 slice, the full `evidence` array, and every Timeline/Map `evidenceIds` list are now all derived from the exact same population. A displayed count can no longer exceed the evidence available for it, so the "no evidence loaded" fallback became unreachable and was deleted along with its prop plumbing (`Workspace.tsx`, `EvidenceDrawer.tsx`). Verified live: every Radar item, every Timeline bar, and every Map point (for both profiles, and for a non-default question) opens a non-empty, matching Evidence Drawer.

### R-41 — Article recency was labeled and rendered as "momentum" (rising/stable/declining)

**Category:** Product/honesty of claims. **Likelihood:** confirmed, present since the visual-workspace build. **Impact:** would have misrepresented the product's actual analytical depth on camera and in the README — a genuine momentum/trend calculation needs a time-series comparison (e.g. this week's volume vs. last week's for the same cluster); this build only ever computed how old a single article is.

`impactRadarItemSchema`'s `direction: "rising" | "stable" | "declining"` (`lib/visual-response.ts`) and its rendering (`ImpactRadar.tsx`, arrow glyphs) were a deterministic function of `published_at` age alone (`≤3d` / `≤10d` / older) — not a measurement of coverage volume changing over time in either direction. Labeling that "rising" or "declining" claims a trend the data was never actually able to support.

**Mitigation:** renamed the field to `recency: "new" | "recent" | "older"` and replaced the arrow-glyph rendering with plain text labels ("New"/"Recent"/"Older") — same three age buckets, honestly named for what they actually measure. No new trend-analysis system was built; README and this register's language were updated to describe "time-bucketed article counts," not momentum.

### R-42 — `chat.agent()`'s only tool call was identical for every question, regardless of what was actually asked

**Category:** Product/required-platform materiality. **Likelihood:** confirmed, present since Task 5. **Impact:** would have significantly hurt the "required-platform use" and Innovation criteria — an agent whose LLM step is provably interchangeable with a hardcoded function call isn't meaningfully "using" the model.

`trigger/chat.ts`'s `getBriefing` tool previously took only `profileId`. The chat input was a single fixed button for the locked Demo Contract question with no way to ask anything else, so removing the model and calling `getBriefingManifest(profileId)` directly would have produced byte-identical behavior to the full chat.agent() path for every supported interaction.

**Mitigation:** `getBriefing` gained two bounded, optional parameters — `timeHorizonDays` (1-30) and `topicFocus` (a short phrase mapped through the existing tag vocabulary, `lib/tags.ts`) — that the model extracts from the user's actual typed question and that visibly narrow `lib/briefing.ts`'s SQL (and are echoed back in the verdict text, e.g. *"Top signal about AI regulation from the last 7 days..."*). The chat input (`app/components/chat.tsx`) became an editable field prefilled with the locked question, with a one-click Reset back to it. ClickHouse still computes every ranking, score, evidence item, geography value, and the verdict; the model's only job is this bounded interpretation. See R-43 for a live-testing defect this introduced and its fix.

### R-43 — gpt-4o fabricated values for optional tool parameters it was explicitly told to leave unset

**Category:** Technical/model behavior. **Likelihood:** confirmed, reproduced on every one of ~15 live test calls across three rounds of prompt wording. **Impact:** would have broken the single most important reliability guarantee of this pass — that the locked default question always returns the full, unscoped briefing — silently and intermittently, in a way that would look like a ClickHouse or fixture-data problem rather than a model one.

Live-testing R-42's new parameters (by calling the deployed local worker directly and logging the raw model output) found that `gpt-4o` reliably invented a `timeHorizonDays` and/or `topicFocus` value for the locked default question, **"What should I know today?"** — which names neither — even after three successive rounds of increasingly explicit `.describe()`/system-prompt wording (up to and including "if nothing qualifies, omit the field... this is a strict requirement"). The zod-derived JSON schema sent to the model correctly leaves both fields out of `required`, so this was not an API-level forcing issue; two distinct failure modes were observed and both were traced to the field descriptions' own worked examples: the model set `timeHorizonDays: 1` because an early description literally mapped `'today' -> 1` (the exact word in the locked question), and separately copied topic strings like `"AI regulation"` straight out of a later description's own example phrase, unrelated to the actual question. Removing the concrete example values entirely did not fully stop it — the model still supplied *some* invented value (a garbled string, a plausible-sounding number) for a generic question in every further trial, just no longer traceable to a specific example.

**Mitigation:** prompt-only fixes could not make this reliable, so a deterministic grounding check was added in `trigger/chat.ts`'s tool `execute` (which receives the real conversation `messages`, independent of what the model chose to report): `timeHorizonDays` is kept only if the user's literal question text matches an explicit relative-time phrase (`this week`, `yesterday`, a specific count of hours/days, etc — deliberately excluding bare "today"/"now"); `topicFocus` is kept only if `deriveTags()` of the model's proposed topic shares at least one tag with `deriveTags()` of the question's own text (the same shared vocabulary already used for profile-card matching, so no new system was introduced). Anything the model invents that doesn't ground back to the question's own words is silently dropped rather than passed to ClickHouse. Verified live, 6 consecutive default-question calls and 3 consecutive non-default-question calls: the default question's grounded request is reliably `{profileId}` alone regardless of what garbage the model attaches, and the non-default question ("What changed this week about AI regulation?") reliably grounds to `{profileId, timeHorizonDays: 7, topicFocus: "AI regulation"}`.

### R-44 — A live-verification script's own bug produced false "error" results for an entire round of browser testing

**Category:** Development-environment/tooling (test methodology, not a product defect). **Likelihood:** confirmed once, caught by manually inspecting a screenshot instead of trusting the script's own summary. **Impact:** none in the shipped product — but cost significant diagnostic time by initially misattributing real, working behavior as a failure.

A Playwright verification script (`.tmp-verify-full.mjs`) detected a failed turn by checking for any `[role="alert"]` element on the page. Next.js mounts its own accessibility route announcer (`#__next-route-announcer__`) with `role="alert"` permanently, on every page, with empty text — so the check fired immediately on every run regardless of whether the app had actually errored, before the real query had even finished, making every test outcome read as `"error"` with the loading-skeleton text still showing.

**Mitigation:** the check now requires a `role="alert"` element with non-empty `innerText`, distinguishing the app's real error banners (`chat.tsx`'s connection-lost and briefing-failed states) from Next.js's own always-present, empty announcer element. General lesson consistent with R-35/R-36/R-39: a verification script is itself code that can have bugs, and a surprising "everything is broken" result across every single test case is itself a signal to inspect a raw screenshot before trusting the harness — which is what actually surfaced this.

---

## 11. Source notes

Synthesized from the Deep Research corpus's `risk-register.md` (canonical 30-risk register) merged with `roadmap.md` §6 (which covered the same risk surface from a product/roadmap angle with materially the same items — no new risk IDs were created from it, only elaboration). R-05, R-08, and R-18 were rewritten for GDELT-primary ingestion per `05 Architecture.md` ADR-008/009; likelihood ratings for R-05 and R-18 were raised relative to the source register to reflect the single-source P0 dependency this creates, and that trade-off is recorded explicitly in §1 and §8. R-31 and R-32 added during Stage A implementation; R-33 and R-34 added during the Trigger.dev Cloud deployment session; R-35 and R-36 added during the visual-workspace build session, both caught by this project's practice of live-verifying every query and every rendered view rather than trusting static checks alone; R-37, R-38, and R-39 added during the Session-6 submission-readiness pass — R-37 when a GDELT reachability retry surfaced an in-repo `maxDuration` defect; R-38 and R-39 when verifying the actual deployed demo flow for both profiles through the real browser UI surfaced a session-lockout bug and a Demo Contract view-order violation, both fixed before they could reach a recording; R-40 through R-44 added during the Session-7 hostile-judge hardening pass — R-40 and R-41 from an independent code-level review of the already-shipped visual workspace (an evidence/count consistency gap and a mislabeled recency-as-momentum indicator); R-42 and R-43 from making `chat.agent()`'s tool call materially depend on the user's actual question, which in turn surfaced a real gpt-4o tool-calling reliability defect (fabricating values for optional parameters) not caught until live testing; R-44 from discovering the live-verification script used to confirm all of the above had its own false-positive bug (see `docs/14 Engineering Handoff.md` for current build status).
