# 06 — Data

**Status:** Canonical data specification, synthesized from the Deep Research corpus's `data.md`, updated for GDELT-primary ingestion (`05 Architecture.md` ADR-008/009) and the Mirror Model personalization schema (`02 Product.md` §7).
**Primary database:** ClickHouse Cloud. **Gated OLTP database:** Postgres managed by ClickHouse, replicated via ClickPipes CDC — **cut entirely** for the current build, see scope notice below.
**⚠ Scope notice:** this document describes the full multi-day/team-scale schema (raw/core/mart/ops/ref/cdc layers, vector index, entity-edge graph, Postgres). For the current ~15–20 hour implementation, `12 Scope Gate.md` and `10 Task Backlog.md` §4 define a three-table schema that supersedes this document wherever they conflict.
**Companion documents:** `05 Architecture.md`, `07 Tech Stack.md`, `10 Task Backlog.md`

---

## 1. Data design goals

1. **Fresh** — new public information becomes queryable within minutes.
2. **Visual** — every answer reduces to map, time, relationship, comparison, and evidence datasets matching the four view types in `02 Product.md` §6.
3. **Grounded** — every derived claim links back to source records and transformation versions.
4. **Personalized without distortion** — user context changes ranking and emphasis, never underlying facts.

The schema is optimized for the questions Mirror must answer: what happened in a recent window; what changed relative to another period; where is activity concentrated; which entities/topics are connected; which evidence is most relevant to this user and question; how fresh/diverse/reliable is the coverage.

---

## 2. Data principles

**ClickHouse:** design `ORDER BY` around the most common filters and grouping paths; put tenant and low-cardinality dimensions before time and high-cardinality identifiers; prefer immutable append-only facts; batch inserts; use the smallest practical types and `LowCardinality` for repeated strings; avoid `Nullable` unless "unknown" is materially distinct from empty/default; partition for lifecycle management, not as a substitute for a sort key; start with a small number of materialized views; add projections only after observed query telemetry proves a repeated alternate access path; keep LLM-facing access read-only and limited to curated tables.

**Provenance:** every derived record retains (directly or via a deterministic join) `tenant_id`, `article_id`, `source_id`, `source_url`, `source_published_at`, `ingested_at`, `pipeline_version`, `model_provider`, `model_name`, `model_version`, `prompt_version`, `confidence`, `trace_id`.

**Identity:** internal IDs are UUIDs or deterministic hashes; source URLs are never the sole identity; canonicalization and content fingerprinting are separate concerns; entity IDs are stable within a tenant and resolution version; place IDs use GeoNames IDs when available; H3 indexes are unsigned 64-bit values; embedding dimension and model version are explicit schema contracts.

---

## 3. Data layers

| Layer | Purpose | Mutability | LLM access |
|---|---|---|---|
| `raw` | Immutable source receipts and provider payload metadata | Append-only, versioned dedupe | No |
| `core` | Clean articles, chunks, entities, places, mentions, edges, artifacts | Append/versioned | Read-only via tools |
| `mart` | Pre-aggregated data for the four view types | Append via materialized views | Read-only via tools |
| `ops` | Ingestion runs, source health, DLQ, costs, evaluations, query telemetry | Append/versioned | No, except safe health summaries |
| `ref` | GeoNames, country, topic, source, taxonomy reference data | Controlled refresh | Read-only via tools where needed |
| `cdc` | Selected Postgres tables replicated by ClickPipes (profile, sources, workspaces) | CDC-managed | Not directly; transformed into core views |

For the hackathon these may be separate databases or table-name prefixes; separate databases are preferred because role grants become clearer.

---

## 4. Canonical event envelope

Every inbound source adapter — GDELT (primary) or RSS/Atom (P1) — produces the same envelope before insertion:

| Field | Meaning |
|---|---|
| `source_id` | Configured feed/API source |
| `source_type` | `gdelt_doc`, `gdelt_gkg`, `rss`, `atom`, `demo_replay` |
| `external_id` | GDELT record ID or feed GUID, when present |
| `canonical_url` | Normalized article URL |
| `retrieved_url` | Actual fetched URL |
| `title`, `description`, `author` | Source-provided fields |
| `published_at`, `updated_at` | Source timestamps |
| `feed_categories` | Source-provided categories |
| `language_hint` | Feed/API language |
| `gdelt_themes` | GKG theme tags, when available (P0) |
| `gdelt_entities` | GKG-extracted persons/organizations, when available (P0) |
| `gdelt_locations` | GKG-resolved locations (name, country/admin code, lat/long, geo-type), when available (P0) |
| `gdelt_tone` | GKG tone/sentiment score, when available (P0) |
| `media` | Permitted thumbnail metadata |
| `raw_payload_hash` | Hash of the normalized raw source record |
| `content_fingerprint` | Hash used for cross-source duplicate detection |
| `retrieved_at` | Fetch completion time |
| `license_policy` | Metadata-only, excerpt-allowed, or approved-full-text |
| `trace_id` | Workflow trace correlation |

The envelope is deterministic — the same source item through the same canonicalization version yields the same fingerprint. The `gdelt_*` fields are populated directly from GKG and are what makes enrichment (§12) lightweight compared to a from-scratch extraction pipeline.

---

## 5. ClickHouse table catalogue

Conceptual definitions; implement as migrations without changing engines or sorting logic unless an ADR is added.

### 5.1 `raw.feed_items`

Immutable record of every unique source item received. `ReplacingMergeTree` keyed by `record_version`; sort `(source_id, toDate(published_at), content_fingerprint, ingested_at)`; no partition initially (monthly on `published_at` once volume justifies it); raw payload/excerpt retained 30 days. Deduplication is a deterministic `content_fingerprint`; newest `record_version` wins. Write pattern: batched inserts from fetch tasks. Handles GDELT's tendency to re-surface updated records for the same story.

### 5.2 `core.articles`

One current normalized article version per logical article. `ReplacingMergeTree` keyed by `article_version`; sort `(tenant_id, published_date, primary_h3_r5, source_id, article_id)`; retention 180 days by default.

**Identity/provenance:** `tenant_id`, `article_id`, `article_version`, `source_id`, `external_id`, `canonical_url`, `source_domain`, `published_at`, `published_date`, `ingested_at`, `enriched_at`, `trace_id`.
**Content:** `title`, `description`, `factual_abstract`, `language`, `feed_categories`, `normalized_topics`, `event_type`, `gdelt_theme_tags`.
**Geography:** `primary_place_id` (GeoNames join, nullable), `primary_latitude`, `primary_longitude`, `primary_point`, `primary_h3_r3/r5/r7/r9`, `country_code`, `admin1_code`, `location_confidence`, `location_source` (`gdelt` or `geocoder_fallback`).
**Ranking:** `source_quality_score`, `novelty_score`, `extraction_confidence`, `tone_score` (from GDELT, never presented as fact — see `06 Data.md` §12), `importance_score`, `duplicate_cluster_id`.
**Personalization support:** `relevance_embedding_ref` (pointer to `core.article_chunks`), `topic_ids`, `entity_ids` (arrays, for cheap filtering; the fact tables in §5.4–5.6 are the source of truth for analysis).
**Pipeline:** `pipeline_version`, `extraction_model`, `prompt_version`, `license_policy`, `is_tombstoned`.

**Why this sort key:** all user queries are tenant-scoped; recent-time filtering is universal; H3 resolution 5 supports regional overview and map pruning; source/article ID finish the key without leading with high cardinality. Entity-only queries use the mention table (§5.5), not this table.

### 5.3 `core.article_chunks`

Retrieval units and embeddings. `ReplacingMergeTree` keyed by `embedding_version`; sort `(tenant_id, published_date, article_id, chunk_index)`; HNSW cosine index over `embedding`, with an exact-cosine fallback over filtered candidates. Retention matches the parent article.

**Columns:** `tenant_id`, `article_id`, `chunk_id`, `chunk_index`, `published_at`, `published_date`, `source_id`, `language`, `chunk_text`, `token_count`, `entity_ids`, `topic_ids`, `h3_r5`, `embedding`, `embedding_dimensions`, `embedding_model`, `embedding_version`, `content_hash`, `trace_id`.

**Chunking policy:** prefer title + description + factual abstract for short items (GDELT/RSS items are typically short); split on paragraph boundaries only for licensed longer text; target ~300–700 tokens; preserve headline/source metadata in retrieval features; avoid aggressive overlap — news items are short and duplicate-heavy. **Embedding:** default `text-embedding-3-small`, 1,536 dimensions, isolated behind `EmbeddingProvider`; a model change writes a new embedding version rather than mutating in place.

### 5.4 `core.entities`

Resolved entity dimension. `ReplacingMergeTree` keyed by `entity_version`; sort `(tenant_id, entity_type, normalized_name, entity_id)`; no partition; persists while referenced. Resolution: deterministic aliases first, then GDELT-provided entity names, then model-assisted candidate merge only for ambiguous cases.

**Columns:** `tenant_id`, `entity_id`, `entity_type` (person, organization, product, technology, place, policy, event, topic), `display_name`, `normalized_name`, `aliases`, `description`, `country_code`, `external_ids`, `entity_version`, `resolution_confidence`, `first_seen_at`, `last_seen_at`, `is_merged_into`, `trace_id`. Conservative non-merging is preferred; `is_merged_into` redirects rather than destructive rewrites.

### 5.5 `core.entity_mentions`

Fact table connecting articles and entities. `MergeTree`; sort `(tenant_id, entity_type, entity_id, published_at, article_id)`; partition monthly on `published_at` at higher volume; append-only, one row per mention.

**Columns:** `tenant_id`, `article_id`, `entity_id`, `entity_type`, `mention_text`, `mention_count`, `salience`, `stance`, `confidence`, `published_at`, `source_id`, `h3_r5`, `trace_id`. Keep only salient mentions above a confidence threshold; retain arrays on `core.articles` for simple filtering but use this table for analysis.

### 5.6 `core.article_locations`

Many-to-many article/place mapping. `MergeTree`; sort `(tenant_id, h3_r5, published_at, place_id, article_id)`; partition monthly at scale.

**Columns:** `tenant_id`, `article_id`, `place_id`, `geoname_id` (nullable — populated only when a GeoNames join succeeds), `display_name`, `country_code`, `admin1_code`, `latitude`, `longitude`, `point`, `h3_r3/r5/r7/r9`, `role` (event_location, affected_location, actor_location, source_location), `salience`, `confidence`, `location_source` (`gdelt` primary, `geocoder_fallback` P1), `published_at`, `trace_id`. H3-led ordering makes regional map queries efficient; multiple resolutions avoid recomputing cells on render. Store location role and confidence; show cell-level aggregates, not exact pins, for uncertain locations.

### 5.7 `core.entity_edges_daily`

Time-bounded co-occurrence and typed relationship edges powering the Relationship Graph. `SummingMergeTree`; sort `(tenant_id, event_date, source_entity_id, target_entity_id, relation_type)`; partition monthly on `event_date`; retention 180 days; grain = tenant, day, ordered entity pair, relationship type.

**Columns:** `tenant_id`, `event_date`, `source_entity_id`, `target_entity_id`, `relation_type`, `cooccurrence_count`, `weighted_strength`, `supporting_article_count`, `positive_count`, `negative_count`, `max_confidence`, `sample_article_ids`.

**Edge policy:** canonically order undirected co-occurrence pairs; keep directed edges only for high-confidence extracted relationships; every edge is evidence-backed (`sample_article_ids` retained); graph query results are capped and ranked by weighted strength and novelty; the UI must visually distinguish co-occurrence from asserted semantic relationships (`04 Visual Language.md` §5, `11 Risks.md` R-19).

**Relation types:** `co_occurs_with`, `affects`, `announced_by`, `regulates`, `partners_with`, `competes_with`, `located_in`, `part_of`, `connected_to_goal`, `connected_to_project`, `other_high_confidence_relation`. The last three are the personalization-specific edge types connecting event/entity nodes to Mirror Model nodes (`02 Product.md` §6.4).

### 5.8 `core.visual_artifacts`

Durable, replayable visual response manifests. `ReplacingMergeTree` keyed by `artifact_version`; sort `(tenant_id, conversation_id, created_at, artifact_id)`; retention 30 days unless saved.

**Columns:** `tenant_id`, `user_id_hash`, `conversation_id`, `turn_id`, `artifact_id`, `artifact_version`, `protocol_version`, `question`, `response_pattern` (Daily Briefing / Topic Atlas / Change Lens / Pattern Finder — `03 UX.md` §3), `verdict`, `manifest_json`, `view_ids`, `evidence_article_ids`, `query_fingerprints`, `source_watermark`, `created_at`, `expires_at`, `validation_status`, `trace_id`.

### 5.9 `core.artifact_view_data`

View-specific datasets too large for the chat stream. `MergeTree`; sort `(tenant_id, artifact_id, view_id, row_order)`; no partition initially.

**Columns:** `tenant_id`, `artifact_id`, `view_id`, `view_type` (`impactRadar` / `timeline` / `relationshipGraph` / `map`), `row_order`, `dimension_time`, `dimension_h3`, `dimension_entity_id`, `dimension_category`, `value_primary`, `value_secondary`, `label`, `metadata_json`, `evidence_article_ids`, `created_at`, `expires_at`. One generic artifact table serves all four view types via typed shared dimensions plus a `metadata_json` escape hatch for view-specific extras.

### 5.10 `core.relevance_scores`

**New table** consolidating the personal-relevance factors from `02 Product.md` §7.2 so every displayed score traces to stored, queryable components (never a model-invented number). `MergeTree`; sort `(tenant_id, user_id_hash, article_id, computed_at)`.

**Columns:** `tenant_id`, `user_id_hash`, `article_id`, `conversation_id`, `total_relevance`, `semantic_match_score`, `entity_topic_match_score`, `goal_project_impact_score`, `novelty_score`, `momentum_score`, `geographic_relevance_score`, `source_diversity_score`, `contributing_profile_item_ids`, `computed_at`, `trace_id`.

---

## 6. Operational tables

`ops.ingestion_runs` (`run_id`, `trigger_run_id`, `source_id`, `started_at`, `finished_at`, `status`, `attempt`, `http_status`, `items_seen`, `items_new`, `items_deduplicated`, `bytes_fetched`, `error_class`, `error_message_redacted`, `trace_id`; sort `(source_id, started_at, run_id)`).

`ops.source_health` (`source_id`, `checked_at`, `last_success_at`, `last_item_published_at`, `consecutive_failures`, `average_latency_ms`, `status`, `etag`, `cursor`, `backoff_until`; `ReplacingMergeTree` ordered by `(source_id)`).

`ops.dead_letters` (`failed_stage`, `record_id`, `source_id`, `failure_fingerprint`, `first_failed_at`, `last_failed_at`, `attempts`, `payload_reference`, `error_class`, `status`, `trace_id`) — stores replay pointers, not unlimited raw payloads.

`ops.agent_turns` (tenant/conversation/turn IDs, response pattern, selected tools, model, token counts, latency stages, evidence count, view types used, schema validation result, prose word count, cost estimate, trace ID; sort `(tenant_id, created_date, conversation_id, turn_id)`).

`ops.query_events` (`query_fingerprint`, `tool_name`, `clickhouse_query_id`, `started_at`, `duration_ms`, `rows_read`, `bytes_read`, `result_rows`, `cache_status`, `success`, `error_class`, `trace_id`).

`ops.product_events` — question submitted, first visual rendered, view selected, filter changed, evidence opened, workspace saved, stale warning shown, error fallback shown, **plus relevance feedback events** (useful / not useful / already known, and the profile-edge weight adjustment each produces — `02 Product.md` §7.2). Stored in ClickHouse deliberately, to deepen real-time analytics use and let the team measure the product itself.

`ops.evaluations` — prompt/test case ID, expected response pattern, expected required views, evidence precision, citation coverage, unsupported claim count, prose word count, latency, pass/fail, evaluator version.

---

## 7. Reference tables

**`ref.sources`** — analytical copy of source configuration (source ID, tenant ID, name/domain/type, GDELT topic filter or feed URL hash, language, country, quality tier, poll interval, license policy, enabled state, timestamps), populated from CDC or a fallback loader.

**`ref.geonames_places`** — GeoNames `cities5000`, used for admin/country normalization and H3 support (not primary resolution — see ADR-009). Sort `(normalized_name, country_code, admin1_code, population_rank, geoname_id)`. Fields: GeoNames ID, name/ASCII name/alternate names, normalized names, lat/long/point, feature class/code, country/admin codes, population, timezone, H3 r3/r5/r7/r9.

**`ref.geonames_aliases`** — one row per alias for fast deterministic matching. Sort `(normalized_alias, country_code, admin1_code, geoname_id)`.

**`ref.topic_taxonomy`** — small curated taxonomy: AI, technology, business, science, regulation/policy, geopolitics, climate, health, markets, local/community. The model may assign subtopics, but top-level visual grouping uses this stable taxonomy.

**`ref.country_admin`** — country names, ISO codes, centroids, simplified boundaries, region groupings.

---

## 8. Materialized views and marts

Exactly three materialized-view families for the hackathon.

**`mart.h3_topic_hourly`** — grain: tenant, hour, H3 r5, top-level topic. Measures: article count, distinct source count, distinct entity count, average tone, average importance, maximum freshness, sample article IDs. Source: `core.article_locations` joined to stable dimensions already present at insert time. Use: world map, regional heat, topic filter, period comparison. Highest-frequency visual query — moving aggregation to insert time makes the map feel immediate. *Risk:* late corrections don't automatically retract prior aggregate rows; mitigated by treating facts as append/versioned and reading current valid versions.

**`mart.entity_topic_hourly`** — grain: tenant, hour, entity, top-level topic. Measures: mention count, distinct article count, distinct source count, weighted salience, average tone, sample article IDs. Use: trending entities, sparklines, compare periods, graph node sizing.

**`mart.source_coverage_daily`** — grain: tenant, day, source. Measures: article count, unique domains, countries represented, topics represented, average latency, enrichment success rate, duplicate rate. Use: source diversity, provenance inspector, operational health, judge-facing transparency.

---

## 9. H3 strategy

| Resolution | Product purpose |
|---:|---|
| 3 | Global overview and broad regional comparison |
| 5 | Default map and sorting/filter key |
| 7 | City/metro exploration |
| 9 | Detailed local view when source precision supports it |

Rules: `geoToH3` input order needs care — ClickHouse's H3 coordinate convention differs from many general geo libraries; store H3 values at ingestion, never recompute per query; use parent-cell conversion for zoom aggregation; use H3 boundaries only at rendering/export boundaries; never imply r9 precision when GDELT only resolved a country/region; every location record carries a granularity/confidence field; H3 is an index and aggregation grid, not a claim that events occupy the full cell.

---

## 10. Vector and hybrid retrieval

**Pipeline:** (1) parse mandatory filters (tenant, time window, geography, source, language, topic/entity) from the user turn; (2) embed the user query with the same embedding version as the index; (3) retrieve a wide ANN candidate set from `core.article_chunks`; (4) join article metadata; (5) deterministically rerank on semantic similarity, recency, source quality, source diversity, novelty/duplicate-cluster penalty, explicit user-context overlap (`core.relevance_scores`), geography relevance, and entity/topic match; (6) select evidence with a per-source cap; (7) return evidence IDs and scores to the agent.

**Ranking emphasis (configuration, not schema):** semantic relevance — high; recency — high for "today/this week," low for background questions; explicit entity/topic match — high; user-context match — medium; source quality — medium; source diversity — hard constraint; duplicate penalty — hard constraint; geographic proximity — question-dependent.

**Fallback:** if HNSW is unavailable or errors — filter by tenant/time, cap candidates using topic/entity/keyword features, compute exact cosine distance, log `retrieval_mode = exact_fallback`, and continue the turn. This fallback is mandatory for demo reliability.

**Lexical retrieval:** deterministic signals from normalized title tokens, factual abstract tokens, exact entity/topic IDs, source categories, and case-insensitive term matching on a bounded candidate set. Mirror does not depend on an experimental ClickHouse text index for the hackathon.

---

## 11. Entity and relationship extraction (lightened by GDELT-primary)

### 11.1 What GDELT already provides (P0, no custom extraction needed)

Entities (persons, organizations), themes/topics, resolved locations with lat/long and geo-type, and a tone score — all parsed directly from GKG into the canonical envelope (§4). This is the direct payoff of ADR-008/009 in `05 Architecture.md`: the elaborate "structured extraction contract" a from-scratch pipeline would need is replaced with a normalization step.

### 11.2 What still requires enrichment (P0)

- **Factual abstract** (optional, short, for the verdict/tooltip layer) — light LLM pass over title + description.
- **Personal relevance factors** — deterministic scoring against the Mirror Model (`02 Product.md` §7.2, `core.relevance_scores`).
- **Novelty and duplicate clustering** — deterministic, not model-based (§13).
- **Entity resolution** — deterministic alias/exact matching first; an LLM is used only to choose among a *bounded* candidate list for ambiguous GDELT entity names, never to invent entities from raw text.

### 11.3 Resolution pipeline

1. Normalize punctuation, casing, whitespace, common suffixes on GDELT-provided entity/location names.
2. Apply known aliases.
3. Join place candidates against GeoNames for admin/country context (not primary resolution).
4. Find same-type entity candidates in the current tenant via deterministic exact/alias matching.
5. Use an LLM only to choose among a bounded candidate list when matching is ambiguous.
6. Create a new entity when confidence is insufficient.
7. Never destructively merge during the user request path.

### 11.4 Graph semantics

Edges are one of the types listed in §5.7. The UI must visually distinguish co-occurrence from asserted semantic relationships (`11 Risks.md` R-19).

---

## 12. Deduplication and clustering

**Exact duplicates:** deterministic hash over normalized canonical URL, source GUID/external ID, title, publication time bucket, and description/excerpt.

**Near duplicates:** `duplicate_cluster_id` from normalized headline similarity, shared entities, close publication times, embedding similarity, and matching source/canonical URL paths. GDELT in particular re-surfaces the same underlying story across many outlets — this clustering step is what prevents a single event from dominating the Impact Radar and Timeline (`11 Risks.md` R-18).

**Ranking behavior:** keep all sources for provenance/diversity analysis; select one representative article per cluster for default evidence; permit the user to expand "other coverage"; count both article volume and distinct event/cluster volume to avoid misleading spikes.

---

## 13. OLTP schema (Postgres, gated — see `05 Architecture.md` ADR-006)

### 13.1 `organizations`
Organization ID, Clerk organization ID, display name, timestamps.

### 13.2 `profile_items` (Mirror Model — replaces a generic `user_contexts` blob)
`user_id`, `profile_item_id`, `item_type` (goal, project, expertise, entity, location, preference — `02 Product.md` §7.1), `label`, `description`, `importance`, `confidence`, `source_type` (manual, pasted profile, GitHub, inferred), `source_reference`, `embedding`, `is_pinned`, `status` (active/archived/rejected), timestamps.

### 13.3 `profile_edges`
`user_id`, `from_item_id`, `to_item_id`, `edge_type` (supports, affects, related-to, part-of), `weight`, `provenance` (manual/inferred), `confidence`.

### 13.4 `sources`
Source ID, organization ID, name, GDELT topic filter or feed URL, source type, poll interval, enabled, license policy, timestamps.

### 13.5 `saved_workspaces`
Workspace ID, organization ID, user ID, artifact ID, title, pinned state, timestamps.

### 13.6 CDC scope

Replicate only: organizations; `profile_items`/`profile_edges` (structured fields needed for analytical ranking — never raw imported profile text); source configuration; saved-workspace events; relevance-feedback events. **Do not replicate:** authentication tokens, emails, provider secrets, private imported source text. CDC tables land in `cdc.*`; curated views expose only safe columns to the analytical layer.

**Go/no-go rule (unchanged from the source research):** if managed Postgres + CDC is not proven within 90 minutes on Day 1, activate the `ConfigRepository` fallback and preserve the rest of the schema unchanged.

---

## 14. Ingestion and write optimization

**Batch policy:** fetch tasks may process a source independently; database writes aggregate into batches (target hundreds of rows or ~1 MiB per insert where practical); never insert one entity mention at a time from the application request path; embeddings are generated and written in batches.

**Part health:** track active part count, average rows per part, merge backlog, insert frequency, rejected/slow inserts; reduce concurrency before scaling compute if small parts accumulate.

**Update policy:** corrections create a new version; user-visible queries read current versions through curated views; avoid `FINAL` on high-frequency paths; deletions use tombstones and lifecycle jobs, not synchronous mutations in chat turns.

---

## 15. Query catalogue

Named, tested query templates, each requiring tenant scope, a bounded time range, a capped result-row count, query limits, a stable output schema, and an attached query fingerprint + trace ID.

| ID | Purpose |
|---|---|
| Q1 | Recent briefing candidates — filters tenant/time/context topics, returns ranked evidence candidates |
| Q2 | H3 distribution — cells, article/event counts, source diversity, tone, evidence samples |
| Q3 | Period-over-period geographic change — current vs. prior window by H3, with minimum-volume guards |
| Q4 | Topic timeline — hourly/daily topic volume, event-cluster volume, source diversity, anomalies |
| Q5 | Entity trend — mention/salience trends and evidence |
| Q6 | Entity graph — bounded nodes/edges for a time/topic/geography window |
| Q7 | Hybrid evidence search — vector candidate retrieval plus deterministic reranking |
| Q8 | Source/provenance breakdown — source mix, duplicate clusters, language/country coverage, freshness |
| Q9 | Personal relevance scoring — `core.relevance_scores` computation over a candidate set |
| Q10 | Artifact manifest — validated manifest metadata for an authorized artifact |
| Q11 | Artifact view data — one normalized view dataset with optional shared filters |
| Q12 | Source health — latest success, lag, failures, item counts |
| Q13 | Product latency funnel — question-to-first-stream-to-first-visual-to-complete-workspace metrics |

---

## 16. Query optimization workflow

1. Start with correct `ORDER BY` and data types. 2. Use `EXPLAIN indexes = 1` for key demo queries. 3. Record rows/bytes read in `ops.query_events`. 4. Reduce selected columns. 5. Move repeated aggregation into an approved mart. 6. Add a skip index only for a measured, selective predicate. 7. Add a projection only when one high-frequency query cannot use the base order. 8. Re-test insert cost/storage after every optimization. 9. Keep a baseline query fixture for regression. No optimization is accepted solely because it sounds advanced.

---

## 17. Data quality gates

A record enters `core.articles` only when: title and source are present; publication time is valid or explicitly unknown; URL passes validation; a content fingerprint exists; extraction output validates; license policy is known; tenant/source mapping exists.

A location enters map marts only when: coordinates are valid WGS84; role is present; confidence exceeds the map threshold; H3 values match coordinates; granularity is recorded.

A visual claim is emitted only when: the underlying query produced evidence IDs; minimum sample/volume rules pass; current and comparison periods are complete enough; a source watermark is attached.

---

## 18. Retention and deletion

| Data class | Default retention |
|---|---:|
| Raw feed payload/excerpt | 30 days |
| Normalized public article metadata | 180 days |
| Embeddings and derived public features | 180 days |
| Source health and aggregate metrics | 365 days |
| Agent turns and query telemetry | 30 days |
| Error payload details | 7 days |
| Unsaved artifacts | 30 days |
| Saved artifacts/workspaces | Until deletion or policy expiry |
| Mirror Model profile items | Until user deletion |

Deletion must: mark the OLTP record deleted; block future retrieval immediately; remove/tombstone analytical copies; expire artifacts that expose the removed context; record a deletion audit event; verify completion via a reconciliation task.

---

## 19. Data security

Separate credentials and roles by workload; restrict the agent to curated read-only views; enforce tenant predicates in repository functions; store no raw provider API keys or auth tokens in ClickHouse; redact errors before `ops` insertion; do not expose raw model prompts or hidden reasoning; avoid direct identifiers in product telemetry; treat all source content as untrusted; validate and cap all arrays/strings/JSON fields before insertion; encrypt in transit; managed encryption at rest; backups follow ClickHouse/Postgres managed-service capabilities.

---

## 20. Data test matrix

**Schema:** migrations apply from empty state; expected engines/keys/TTLs/indexes exist; embedding dimensions match the index; H3 columns use the expected type; low-cardinality fields are correctly encoded.

**Ingestion:** duplicate GDELT/feed entries don't trigger duplicate enrichment; edited items create a new version; a malformed source fails only that source, not the coordinator; retry preserves idempotency; cursor/watermark behavior works.

**Geospatial:** known coordinates map to expected H3 cells; H3 parent conversion is consistent; longitude/latitude order is correct; ambiguous names remain unresolved when context is insufficient.

**Retrieval:** tenant isolation; time filter enforcement; ANN and exact fallback both return relevant fixtures; duplicate-cluster diversity; source diversity; evidence IDs survive reranking.

**Aggregate:** hourly mart matches raw facts for fixture windows; late duplicate versions don't inflate demo metrics; period comparison handles zero baselines; graph edge counts match mention fixtures.

**Artifact:** manifest schema version validates; unauthorized tenant cannot fetch an artifact; expired artifact is unavailable; every visual row links to evidence where required.

---

## 21. Data decisions and judging score

| Data decision | Primary score contribution |
|---|---|
| ClickHouse as one analytical, vector, geo, graph-edge, provenance, and telemetry engine | Use of ClickHouse & Trigger.dev 25%; Scalability 10% |
| GDELT-primary ingestion (structured entities/locations/themes at source) | Cuts build risk without weakening platform depth |
| H3 at multiple resolutions with map marts | Platform depth, Innovation, Presentation |
| HNSW plus exact fallback | Platform depth, Technical Implementation |
| Evidence IDs through every derived layer | Problem Fit, Technical Implementation |
| `core.relevance_scores` — every personalization number traces to stored factors | Innovation, Problem Fit, trust |
| Postgres + ClickPipes CDC for limited mutable state (gated) | Technical Implementation, bonus OLTP + OLAP |
| Typed artifact persistence | Problem Fit, Presentation, Scalability |
| Batch/idempotent ingestion | Technical Implementation |
| Data-quality and minimum-volume gates | Trustworthiness and production readiness |

---

## 22. Definition of data complete

- GDELT ingestion can be replayed idempotently.
- Raw, core, and mart counts reconcile for a known fixture.
- Article evidence appears on a map through H3, sourced from GDELT locations.
- Semantic search runs in ClickHouse with HNSW or exact fallback.
- Entity trends and a bounded graph generate from the same corpus.
- Every artifact records source watermark, evidence IDs, query fingerprints, and protocol version.
- Every personalization score in `core.relevance_scores` traces to its contributing profile items.
- An unauthorized-tenant test fails at every data access boundary.
- Key demo queries stay within agreed latency and scan budgets (`08 MVP.md`).
- Source health exposes stale or failing inputs.
- The demo can run from seed data when external APIs are unavailable.

---

## 23. Source notes

Synthesized from the Deep Research corpus's `data.md`, with §4, §5.2, §5.6, §11 rewritten for GDELT-primary ingestion, §5.10 and §13.2–13.3 added for the Mirror Model personalization schema (from the source `product.md` PRD §10), and §5.8 updated to reference the four-view registry from `05 Architecture.md` ADR-004.
