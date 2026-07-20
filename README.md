# Mirror

**See what changed. See why it matters to you.**

Mirror is a personalized impact-intelligence chat agent. Instead of answering a question about the changing world with a paragraph, it answers with an interactive visual workspace: a one-line verdict, a ranked Impact Radar of the developments that matter most to *you*, a Timeline of their momentum, a Map of where they're happening, and an Evidence Drawer with a source behind every claim.

The same question, asked by two different people, produces two visibly different answers — because relevance is computed against each person's explicit goals and interests, not a generic feed.

Built for the ClickHouse & Trigger.dev Virtual Summer Hackathon 2026.

---

## What it does

1. A user has an editable, weighted profile — goals, interests, organizations, locations — shown as cards, not a hidden system prompt.
2. They ask: **"What should I know today?"**
3. Mirror returns a coordinated visual workspace, not text: **Verdict Strip → Impact Radar → Timeline → Map → Evidence Drawer**.
4. Selecting any Radar signal, Timeline bar, or Map point highlights the same items across every other view and opens the Evidence Drawer with the underlying source.
5. Switching the active profile and re-asking the identical question produces a visibly different top signal, verdict, and evidence set — the same world, ranked differently for a different person.

## How ClickHouse is used

ClickHouse is Mirror's **only** database and its analytical engine. It stores the event corpus, the editable profile cards, and does all of the real analytical work in SQL — nothing is computed or invented client-side or by the model:

- **Personalized relevance ranking** — tag-weight matching against a profile's cards, blended with a recency decay and a geographic boost, entirely in a parameterized SQL query (`lib/briefing.ts`).
- **Time-bucketed momentum** — `GROUP BY toDate(published_at)` behind the Timeline.
- **H3 geospatial aggregation** — `geoToH3`/`h3ToGeo` behind the Map, resolving each event to a hex cell and back to plottable coordinates.
- Every ranked or plotted item carries a resolvable evidence ID back to a stored `articles` row — the Evidence Drawer renders the stored title, source, date, and location directly from that row.

## How Trigger.dev is used

Trigger.dev runs Mirror's conversation and its data pipeline:

- **`chat.agent()`** (`trigger/chat.ts`, task id `mirror-agent`) runs the user conversation as a durable agent. It calls one typed tool, `getBriefing`, which runs the ClickHouse queries above and returns a schema-validated visual manifest — the model plans and narrates, it never invents UI, numbers, or SQL.
- **A separate, replayable ingestion task** (`trigger/seed-gdelt.ts`) loads real-world event data from the GDELT DOC 2.0 API into ClickHouse, so the demo never depends on a live third-party call at showtime.

## Current, honest status

This section is updated to reflect what has actually been verified, not what's planned. See [`docs/14 Engineering Handoff.md`](docs/14%20Engineering%20Handoff.md) for full detail and [`docs/11 Risks.md`](docs/11%20Risks.md) for every defect found along the way.

| Capability | Status |
|---|---|
| ClickHouse ↔ Trigger.dev connectivity | ✅ Live-verified |
| ClickHouse schema (articles / profile cards / artifacts) | ✅ Live-verified |
| `chat.agent()` end-to-end conversation | ✅ **Live-verified** (2026-07-20) — both profiles run clean through the real agent → ClickHouse → streamed-manifest pipeline |
| Visual workspace (Verdict Strip, Impact Radar, Timeline, Map, Evidence Drawer) | ✅ **Built and live-verified** in a real browser, rendering exclusively from the real manifest, with coordinated cross-view selection |
| Personalized ranking / timeline / H3 map SQL | 🟡 **Fixture-verified** — proven correct against 20 hand-authored, clearly-marked development fixtures (not real GDELT data yet) |
| Two profiles → visibly different answers | 🟡 **Fixture-verified** — zero top-signal overlap between profiles on fixture data; not yet re-confirmed on real GDELT titles |
| Real GDELT ingestion into ClickHouse | ⛔ **Blocked** — GDELT's API is intermittently unreachable specifically from Trigger.dev Cloud's network (see Risks R-05); a permanent rerun script (`scripts/verify-task4-seed-gdelt-live.ts`) is ready and will be run the moment it clears |

**What this means concretely:** every view, query, and interaction described above is real and has been exercised against a live system — just currently against a small, honestly-labelled set of development fixtures (`[DEV FIXTURE]`-prefixed titles, fake `fixture.mirror-dev.test` URLs) rather than a full real-world GDELT corpus. The fixtures exist solely so the ranking/timeline/map logic could be built and proven correct while GDELT ingestion was blocked; they are excluded from Task 4's own completion check and will be cleared once a real seed lands.

## What's deliberately not in this build

Scope was cut early and documented, not discovered late:

- No authentication or multi-tenancy — single-presenter demo.
- ClickHouse only — no secondary OLTP database.
- Structured tag/keyword filtering instead of vector search or a relationship graph.
- No save/reopen or cross-session feedback loop.

See [`docs/12 Scope Gate.md`](docs/12%20Scope%20Gate.md) for the full reasoning behind each cut.

## Architecture

Single Next.js 16 (App Router) app — not a monorepo, deliberately, given the scope. See [`docs/14 Engineering Handoff.md §4`](docs/14%20Engineering%20Handoff.md) for the current file tree and full architecture notes.

```
app/
├── components/
│   ├── chat.tsx                # profile switcher, question, loading/error/empty states
│   └── workspace/               # Verdict Strip, Impact Radar, Timeline, Map, Evidence Drawer
lib/
├── briefing.ts                  # the real ClickHouse-backed getBriefing implementation
├── visual-response.ts           # the typed visual-manifest schema (Zod)
└── tags.ts                      # shared tag vocabulary for ingestion + ranking
trigger/
├── chat.ts                      # mirror-agent chat.agent()
├── seed-gdelt.ts                # GDELT ingestion task
├── seed-profile-cards.ts        # permanent seed for the two locked demo profiles
└── load-dev-fixtures.ts         # temporary, removable dev-only article fixtures
```

## Running it locally

Requires a ClickHouse Cloud service, a Trigger.dev project, and an OpenAI API key.

```bash
npm install
cp .env.example .env.local   # fill in CLICKHOUSE_*, TRIGGER_SECRET_KEY, OPENAI_API_KEY
npx trigger.dev@4.5.4 dev    # in one terminal — runs the Trigger.dev worker locally
npm run dev                  # in another — runs the Next.js app
```

Pin the Trigger.dev CLI to `4.5.4` to match this project's pinned SDK version — `@latest` may resolve to a newer minor and refuse to run against a mismatched SDK.

## License

MIT — see [`LICENSE`](LICENSE).
