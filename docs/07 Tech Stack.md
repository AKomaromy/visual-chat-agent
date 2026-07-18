# 07 — Tech Stack

**Status:** Canonical stack and repository specification, synthesized from the Deep Research corpus's `tech-stack.md`, updated for GDELT-primary ingestion (`05 Architecture.md` ADR-008).
**Rule:** do not substitute a framework or library without recording an ADR in `05 Architecture.md` and updating `11 Risks.md`.
**⚠ Scope notice:** this document describes the full-scope stack (Clerk, Postgres/Drizzle/ClickPipes, MapLibre+deck.gl H3, Cytoscape, embeddings). For the current ~15–20 hour implementation, `12 Scope Gate.md` and `10 Task Backlog.md` are authoritative — most notably: no Clerk, no Postgres, no embeddings/vector index, no Cytoscape.

---

## 1. Stack at a glance

| Layer | Choice |
|---|---|
| Language | TypeScript, strict mode |
| Monorepo | pnpm workspaces + Turborepo |
| Web framework | Next.js App Router |
| UI foundation | React, Tailwind CSS, shadcn/ui primitives |
| Client state | Zustand (workspace interaction) + TanStack Query (server data) |
| Chat UI/runtime | Vercel AI SDK React + Trigger.dev `useTriggerChatTransport` |
| Durable agent/workflows | Trigger.dev Cloud, exact pinned 4.5.x patch |
| Primary database | ClickHouse Cloud |
| ClickHouse client | Official `@clickhouse/client` |
| OLTP (gated) | Postgres managed by ClickHouse |
| Postgres access | Drizzle ORM + migrations |
| CDC | ClickPipes Postgres CDC |
| Authentication | Clerk Next.js SDK + Organizations |
| Maps | MapLibre GL JS |
| Geospatial overlay | deck.gl `H3HexagonLayer` |
| Charts | Apache ECharts |
| Entity graph | Cytoscape.js |
| Visual protocol | Zod-based Mirror Visual Response Protocol (MVRP) |
| Primary ingestion | GDELT DOC 2.0 API (discovery) + GKG (entities/themes/locations/tone) |
| Supplementary ingestion (P1) | `fast-xml-parser` + explicit RSS/Atom adapters |
| Geocoding | GDELT-resolved locations primary; ClickHouse GeoNames for admin normalization; external geocoder adapter deferred to P1 |
| LLM orchestration | Vercel AI SDK inside `chat.agent()` |
| Embeddings | OpenAI `text-embedding-3-small` through a provider interface |
| Error monitoring | Sentry |
| Product/query telemetry | ClickHouse |
| Unit/integration tests | Vitest |
| Browser tests | Playwright |
| Database integration | Testcontainers ClickHouse/Postgres where practical |
| Deployment | Vercel + Trigger.dev Cloud + ClickHouse Cloud |
| Package policy | Exact versions for Trigger.dev and AI SDK; lockfile committed |

---

## 2. Technology decision records

Each record: Choice → Why → Key risk/mitigation → Judging impact. Full alternatives-considered detail lives in the Deep Research corpus; kept here only where it changes an implementation decision.

**TS-001 — TypeScript everywhere.** Strict-mode TypeScript for web, BFF, agent, tasks, migrations, tools, and shared contracts. *Why:* Trigger.dev and the recommended chat integrations are TypeScript-native; shared types cut drift across tool inputs, ClickHouse rows, manifests, API responses, and renderers. *Risk:* runtime data can still violate compile-time types → Zod validation at every external/persisted boundary. *Judging:* Technical Implementation via code quality and end-to-end contracts.

**TS-002 — pnpm workspaces + Turborepo.** Fast installs, one lockfile, uniform build/test/lint. *Risk:* unnecessary build complexity → keep package count small, no custom build plugins. *Judging:* Technical Implementation and repository-quality Presentation.

**TS-003 — Next.js App Router on Vercel.** Server Components for fast initial shells; Client Components for WebGL/rich interaction; Route Handlers for authenticated artifact/session endpoints. *Risk:* long-running work leaking into serverless routes → all durable work goes to Trigger.dev; Node runtime for DB/API routes; deployment smoke tests on every candidate. *Judging:* Problem Fit/Presentation via a polished workspace; Technical Implementation via a clean BFF boundary.

**TS-004 — Trigger.dev 4.5.x, exact pinned patch.** `chat.agent()` became generally available in 4.5; provides durable execution, sessions, streaming, retries, queues, schedules, idempotency, observability. Do not float to `latest` after the vertical slice is stable. *Risk:* fast-moving API surface, version mismatch across SDK packages, credit exhaustion → pin all Trigger.dev packages together; keep a `trigger-adapter` package; budget to the handbook's conservative credit figure; add concurrency limits and spend alerts. *Judging:* directly maximizes the 25% required-platform criterion.

**TS-005 — Vercel AI SDK for model portability.** Streaming, tool calling, structured output, and provider abstraction inside `chat.agent()`; integrates directly with Trigger.dev's chat transport. *Risk:* abstraction churn, tool-call behavior varies by model → use only common capabilities; keep prompts/provider settings in one package; run the evaluation set against the selected model before freezing. *Judging:* Technical Implementation and a fluid visual presentation.

**TS-006 — ClickHouse Cloud + official JS client.** One engine for time-series analytics, H3, vector search, entity-edge aggregation, provenance, and telemetry; official client supports typed query/insert and streaming result formats. *Risk:* misdesigned ordering keys, tiny insert batches, Cloud version differences for HNSW → capability checks on Day 1; named query templates; batched writes; exact-vector and non-H3 fallbacks. *Judging:* highest single impact on the required-platform score and Scalability.

**TS-007 — Postgres managed by ClickHouse + Drizzle, gated.** Correct transactional semantics for mutable settings (Mirror Model profile edits, source config, workspace metadata) with a minimal TypeScript surface; Drizzle for schema/migrations; ClickPipes CDC for selected analytical copies. *Risk:* public-beta/provisioning friction, ORM/CDC configuration eating build time, bonus work distracting from core → 90-minute Day-1 go/no-go gate; four-to-five-table scope only; `ConfigRepository` fallback; no complex relationships or generated admin UI. *Judging:* Technical Implementation, Scalability & Impact, bonus-category eligibility.

**TS-008 — Clerk for authentication and tenancy.** Prebuilt sign-in and organization switching; `userId`/`orgId` derived server-side become application identity/tenant scope. *Risk:* organization setup complicating demo onboarding, auth IDs trusted from the client → seed one demo organization; include a judge demo login path; derive tenant server-side only. *Judging:* Technical Implementation and real-world deployability.

**TS-009 — MapLibre GL JS + deck.gl H3 layer.** Open-source WebGL map; deck.gl's native H3 layer avoids manual hex geometry. *Risk:* WebGL/device compatibility, bundle size, coordinate-order bugs → one lightweight public-compatible style; lazy-load the map bundle; cap cells and use level-of-detail; ranked geographic-list fallback; known-coordinate tests. *Judging:* Problem Fit, Innovation, Presentation, visible ClickHouse geospatial depth.

**TS-010 — Apache ECharts.** Tree-shaken imports for timelines, bars, lines, scatterplots, heatmaps, small multiples — the internal encoding vocabulary of the Timeline and Impact Radar view types (`04 Visual Language.md` §3). *Risk:* raw option objects are large/flexible, accessibility needs extra work → **the LLM never generates ECharts options**; maintain curated renderer templates per MVRP view; import only required chart components; pair every chart with accessible evidence/table data. *Judging:* Presentation and Problem Fit within controlled implementation scope.

**TS-011 — Cytoscape.js for the relationship graph.** Includes graph data structures, interaction, layouts, and algorithms — a better one-week fit than assembling Sigma.js + Graphology + layout packages. *Risk:* large graphs become unreadable/slow, co-occurrence can look causal → cap at ~250 nodes / 600 edges (default 40–80); deterministic layout seeds where possible; label edge semantics and show evidence on selection; aggregate low-value nodes into topic clusters. *Judging:* Innovation and Presentation.

**TS-012 — Tailwind CSS + shadcn/ui primitives.** Rapid visual polish; component source is owned by the project; strong primitives for dialogs, sheets, tabs, tooltips, command menus. *Risk:* generic "shadcn app" appearance → define Mirror-specific tokens/spacing/typography/panel language per `04 Visual Language.md`; keep the visual canvas dominant. *Judging:* Presentation without consuming core engineering time.

**TS-013 — Zustand + TanStack Query.** Zustand owns ephemeral coordinated-view/interaction state (`03 UX.md` §5); TanStack Query owns authorized artifact data, caching, retry, invalidation. *Risk:* duplicate sources of truth → Zustand stores only interaction/filter state; TanStack Query owns fetched data; reset state on artifact/protocol change. *Judging:* interaction quality and Presentation.

**TS-014 — Zod as the runtime contract layer.** Defines source envelopes, enrichment output, tool inputs/outputs, MVRP manifests, stream parts, and API payloads; type inference avoids duplicate interface definitions; invalid model output is rejected before rendering or storage. *Risk:* large schemas add bundle/runtime cost → keep server-only schemas out of client bundles; version persisted schemas; split domain schemas by package. *Judging:* strong, broad Technical Implementation contribution — this is the single mechanism that prevents most classes of late demo failure.

**TS-015 — GDELT client + `fast-xml-parser` for P1 RSS/Atom.** GDELT DOC 2.0 API and GKG are consumed via typed HTTP adapters (§ ingestion below); RSS/Atom, once added as a P1 diversity source, is parsed with `fast-xml-parser` behind narrow, explicit format adapters rather than one permissive "magic" parser. *Risk:* XML edge cases, unsafe entity expansion, oversized documents → disable dangerous XML features, cap response bytes/parse time, fixture-test against actual selected feeds, fail individual sources without failing the schedule. *Judging:* Technical Implementation and freshness reliability.

**TS-016 — GDELT-resolved locations primary; GeoNames for normalization; external geocoder deferred.** See `05 Architecture.md` ADR-009 and `06 Data.md` §5.6/§11. GeoNames `cities5000` + alternate names + country/admin data live in ClickHouse for join-time normalization and H3 support; an external geocoder adapter (Google/Mapbox/Nominatim) is defined behind an interface but is P1, activated only for unresolved or low-confidence places once GDELT-primary is stable. *Judging:* ClickHouse geospatial depth, Technical Implementation, Presentation — achieved with materially less build risk than a from-scratch geocoding pipeline.

**TS-017 — Sentry + Trigger.dev dashboard + ClickHouse telemetry.** Each tool handles one signal well; ClickHouse usage stays visible beyond the content corpus; avoids adding a separate LLM-observability stack. *Risk:* correlation IDs lost, sensitive content leaking into errors → one `traceId` propagated everywhere; redaction hooks; no prompts/article bodies captured by default. *Judging:* Technical Implementation and Scalability & Impact.

**TS-018 — Vitest, Playwright, Testcontainers.** Vitest for unit/contract tests; Playwright for the golden demo flows; Testcontainers for ClickHouse/Postgres integration where setup time allows. *Risk:* Testcontainers slow/unavailable in CI, WebGL tests flaky → separate the fast contract suite from the container suite; deterministic seeded data; assert data/state, not pixel-perfect WebGL output; keep exactly the golden Playwright flows defined in `08 MVP.md`. *Judging:* Technical Implementation and presentation reliability.

---

## 3. Repository structure

```text
mirror/
├── apps/
│   └── web/
│       ├── app/
│       │   ├── (public)/
│       │   ├── (app)/
│       │   │   ├── onboard/
│       │   │   ├── brief/
│       │   │   ├── c/[chatId]/
│       │   │   ├── w/[workspaceId]/
│       │   │   └── sources/
│       │   └── api/
│       │       ├── chat/
│       │       ├── artifacts/
│       │       ├── profile/
│       │       ├── feedback/
│       │       ├── workspaces/
│       │       ├── sources/
│       │       └── refresh/
│       ├── components/
│       │   ├── chat/
│       │   ├── workspace/
│       │   ├── visualizations/    # impactRadar, timeline, relationshipGraph, map
│       │   ├── evidence/
│       │   └── ui/
│       ├── hooks/
│       ├── stores/
│       └── styles/
├── trigger/
│   ├── agents/
│   │   └── mirror-agent/
│   ├── ingestion/          # gdelt/, rss/ (P1)
│   ├── enrichment/
│   ├── geocoding/
│   ├── embeddings/
│   ├── aggregates/
│   ├── maintenance/
│   └── shared/
├── packages/
│   ├── visual-protocol/    # MVRP schemas
│   ├── domain/
│   ├── clickhouse/
│   │   ├── migrations/
│   │   ├── repositories/
│   │   └── queries/
│   ├── postgres/
│   │   ├── schema/
│   │   ├── migrations/
│   │   └── repositories/
│   ├── auth/
│   ├── agent-tools/
│   ├── source-adapters/    # gdelt.ts primary, rss.ts P1
│   ├── enrichment/
│   ├── embeddings/
│   ├── geocoding/
│   ├── relevance/          # Mirror Model scoring
│   ├── telemetry/
│   ├── config/
│   └── test-fixtures/
├── tests/
│   ├── contracts/
│   ├── integration/
│   ├── evaluations/
│   └── e2e/
├── docs/
├── scripts/
│   ├── seed-demo-data/
│   ├── load-geonames/
│   ├── verify-capabilities/
│   └── smoke-test/
├── .github/workflows/
├── trigger.config.ts
├── turbo.json
├── pnpm-workspace.yaml
├── package.json
├── LICENSE
└── README.md
```

This tree is a target organization, not implementation code.

---

## 4. Package boundaries

- **`packages/visual-protocol`** — owns manifest schemas, view schemas, filter/selection schemas, protocol versions, validator/evaluator rules, sample fixtures. Must not import databases, React, or provider SDKs.
- **`packages/clickhouse`** — owns client creation, migrations, row codecs, query templates, insert batching, query limits, capability checks. Must not import React, Trigger.dev task definitions, or provider-specific model SDKs.
- **`packages/agent-tools`** — owns tool schemas, tool-to-query orchestration, artifact writes, evidence response contracts. Must not expose generic SQL execution or raw database clients to the model.
- **`packages/source-adapters`** — owns fetch constraints, GDELT/RSS/Atom normalization, content canonicalization, fingerprints, license policies.
- **`packages/relevance`** — owns the deterministic Mirror Model scoring function (`02 Product.md` §7.2) and its `core.relevance_scores` write path. Must not call model providers directly for the final score.
- **`trigger/*`** — owns schedules, queues, retries, idempotency, task fan-out, agent runtime, workflow telemetry.
- **`apps/web`** — owns the authentication shell, BFF routes, chat transport, renderers, interaction state, accessibility fallbacks.

---

## 5. Version and dependency policy

**Exact pin required:** `@trigger.dev/*`, Vercel AI SDK packages, ClickHouse client, MapLibre/deck.gl interoperability pair, Clerk Next.js SDK, embedding provider SDK.

**Compatible range acceptable:** Tailwind patch versions, shadcn-owned component source, test utilities with stable APIs.

**Freeze rule:** after the end-to-end vertical slice passes in staging — no major/minor dependency upgrades; patch upgrades only for a blocking defect; every upgrade reruns contract, integration, and golden demo tests.

**Supply-chain rules:** commit the lockfile; run a dependency audit; avoid packages with unclear licenses; generate an SBOM if time permits; no proprietary internal libraries.

---

## 6. Deliberately rejected technologies

| Technology | Reason rejected |
|---|---|
| Elasticsearch/OpenSearch | Duplicates ClickHouse search/analytics and weakens required-platform depth |
| Pinecone/Weaviate | An external vector database makes ClickHouse use less meaningful |
| Neo4j | The entity graph is representable as ClickHouse edge facts at this scale |
| Kafka | Polling + Trigger.dev queues are sufficient; Kafka adds setup without demo value |
| Kubernetes | Managed platforms already provide scaling and deployment |
| Custom WebSocket server | Trigger.dev realtime/chat transport already provides durable streaming |
| General text-to-SQL | Security, latency, and reliability risk; typed tools are more defensible |
| Arbitrary model-generated UI code | Unsafe, untestable, contrary to production-quality expectations |
| Full web crawler | Legal, operational, and scope risk |
| Multiple agent frameworks | One orchestration runtime keeps the architecture coherent |
| RSS/NewsAPI as the primary ingestion path | Requires a from-scratch entity/location extraction pipeline in a 7-day window — see `05 Architecture.md` ADR-008 |

---

## 7. Stack scorecard

| Stack choice | Score rationale |
|---|---|
| Trigger.dev `chat.agent()` + schedules + queues + streams | Makes required-platform use deep and visible |
| ClickHouse H3 + vector + marts + telemetry | Shows breadth and correctness, not a token database insertion |
| GDELT-primary ingestion | Structured entities/locations/themes at source, without a bespoke extraction pipeline |
| MapLibre/deck.gl/ECharts/Cytoscape | Produces maps, timelines, and graphs that directly answer the theme |
| Typed MVRP | Novel, safe generative-UI architecture |
| Managed Postgres + ClickPipes (gated) | Production-grade mutable state and bonus eligibility |
| Next.js + Clerk + Vercel | Fast delivery with credible auth and deployment |
| Sentry + Trigger traces + ClickHouse telemetry | Demonstrates engineering soundness and operating model |
| Focused tests (golden flows) | Protects the live demo and production-readiness claims |

---

## 8. Reference documentation

- Trigger.dev AI chat: https://trigger.dev/docs/ai-chat
- Trigger.dev v4.5.0: https://trigger.dev/changelog/v4-5-0
- Trigger.dev streams: https://trigger.dev/docs/tasks/streams
- Trigger.dev Realtime: https://trigger.dev/docs/realtime/overview
- Trigger.dev idempotency: https://trigger.dev/docs/idempotency
- Trigger.dev human-in-the-loop: https://trigger.dev/docs/ai-chat/patterns/human-in-the-loop
- Trigger.dev large payloads: https://trigger.dev/docs/ai-chat/patterns/large-payloads
- ClickHouse docs: https://clickhouse.com/docs
- ClickHouse best practices: https://clickhouse.com/blog/10-best-practice-tips
- ClickHouse vector search: https://clickhouse.com/docs/engines/table-engines/mergetree-family/annindexes
- ClickHouse geospatial: https://clickhouse.com/blog/real-world-data-no-limits-geospatial
- ClickHouse Postgres CDC: https://clickhouse.com/cloud/clickpipes/postgres-cdc-connector
- Postgres managed by ClickHouse: https://clickhouse.com/cloud/postgres
- Next.js App Router: https://nextjs.org/docs/app
- Clerk Next.js: https://clerk.com/docs/reference/nextjs/overview
- MapLibre GL JS: https://maplibre.org/maplibre-gl-js/docs/
- deck.gl H3 layer: https://deck.gl/docs/api-reference/geo-layers/h3-hexagon-layer
- Apache ECharts: https://echarts.apache.org/
- Cytoscape.js: https://js.cytoscape.org/
- GDELT project: https://www.gdeltproject.org/
- GDELT DOC 2.0 API: https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- GeoNames: https://download.geonames.org/export/dump/

---

## 9. Source notes

Synthesized from the Deep Research corpus's `tech-stack.md`, with §1/§2/§6/§7 updated to reflect GDELT-primary ingestion (`05 Architecture.md` ADR-008/009) and §3/§4 extended with the Mirror Model personalization package (`packages/relevance`, `app/onboard`, `/api/profile`, `/api/feedback`).
