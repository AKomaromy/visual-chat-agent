# Mirror

**See what changed. See why it matters to you.**

Mirror is a personalized impact-intelligence chat agent. Instead of answering a question about the changing world with a paragraph, it answers with an interactive visual workspace: a one-line verdict, a ranked Impact Radar of the developments that matter most to *you*, a Timeline of when the relevant coverage happened, a Map of where it's happening, and an Evidence Drawer with a source behind every claim.

The same question, asked by two different people, produces two visibly different answers — because relevance is computed against each person's explicit goals and interests, not a generic feed.

Built for the ClickHouse & Trigger.dev Virtual Summer Hackathon 2026.

---

## What it does

1. A user has an editable, weighted profile — goals, interests, organizations, locations — shown as cards, not a hidden system prompt.
2. They ask a question. The locked default, **"What should I know today?"**, is always one click away as a reliable baseline, but the input is editable — a question that names its own time window (e.g. "this week") and/or topic gets bounded-interpreted into a narrower ClickHouse request (see "How Trigger.dev is used").
3. Mirror returns a coordinated visual workspace, not text: **Verdict Strip → Impact Radar → Timeline → Map → Evidence Drawer**.
4. Selecting any Radar signal, Timeline bar, or Map point highlights the same items across every other view and opens the Evidence Drawer with the underlying source.
5. Switching the active profile and re-asking the identical question produces a visibly different top signal, verdict, and evidence set — the same world, ranked differently for a different person.

## How ClickHouse is used

ClickHouse is Mirror's **only** database and its analytical engine. It stores the event corpus, the editable profile cards, and does all of the real analytical work in SQL — nothing is computed or invented client-side or by the model:

- **Personalized relevance ranking** — tag-weight matching against a profile's cards, blended with a recency decay and a geographic boost, entirely in a parameterized SQL query (`lib/briefing.ts`).
- **Time-bucketed article counts** — `GROUP BY toDate(published_at)` behind the Timeline (a count of coverage per day, not a trend/momentum calculation).
- **H3 geospatial aggregation** — `geoToH3`/`h3ToGeo` behind the Map, resolving each event to a hex cell and back to plottable coordinates.
- Every ranked or plotted item carries a resolvable evidence ID back to a stored `articles` row — the Evidence Drawer renders the stored title, source, date, and location directly from that row.

## How Trigger.dev is used

Trigger.dev runs Mirror's conversation and its data pipeline:

- **`chat.agent()`** (`trigger/chat.ts`, task id `mirror-agent`) runs the user conversation as a durable agent. Its one job is bounded interpretation: it reads the user's literal question and extracts a small typed request — an optional time window (1-30 days) and/or topic focus — that narrows the one `getBriefing` tool call it always makes. The model never authors a ranking, score, evidence item, geography, or the verdict, and it never adds prose after calling the tool; every visible value comes from the schema-validated visual manifest ClickHouse's query returns. A deterministic grounding check discards any time window or topic the model's output doesn't actually trace back to words in the user's own question, so the locked default question reliably gets the unrestricted, unscoped result even though language models don't always follow "leave this optional field unset" instructions on their own.
- **A separate, replayable ingestion task** (`trigger/seed-gdelt.ts`) loads real-world event data from the GDELT DOC 2.0 API into ClickHouse, so the demo never depends on a live third-party call at showtime.

## Current, honest status

**In one sentence:** live OpenAI, Trigger.dev, and ClickHouse execution over a controlled fixture news dataset. Every conversation turn, ClickHouse query, and rendered view below is real and exercised against live infrastructure — the *news content* itself is not yet real-world GDELT data, so it should not be described as "real data" or "live news" until Task 4's ingestion actually lands (see the table's last row).

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

**What this means concretely:** every view, query, and interaction described above is real and has been exercised against a live system — just currently against a small, honestly-labelled set of development fixtures (`[DEV FIXTURE]`-prefixed titles, fake `fixture.mirror-dev.test` URLs) rather than a full real-world GDELT corpus. The fixtures exist solely so the ranking/timeline/map logic could be built and proven correct while GDELT ingestion was blocked; they are excluded from Task 4's own completion check and will be cleared once a real seed lands. Until then, the accurate description of the judged experience is **live OpenAI, Trigger.dev, and ClickHouse execution over a controlled fixture news dataset** — not "real data" or "live news."

## What's deliberately not in this build

Scope was cut early and documented, not discovered late:

- No authentication or multi-tenancy — single-presenter demo.
- ClickHouse only — no secondary OLTP database.
- Structured tag/keyword filtering instead of vector search or a relationship graph.
- No save/reopen or cross-session feedback loop.

See [`docs/12 Scope Gate.md`](docs/12%20Scope%20Gate.md) for the full reasoning behind each cut.

## Screenshots

Curated, captured against the real running app — see [`demo-assets/`](demo-assets/) for the full set and what each one shows.

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
cp .env.example .env.local     # fill in CLICKHOUSE_*, TRIGGER_SECRET_KEY, OPENAI_API_KEY
npx trigger.dev@4.5.4 login    # authenticate the CLI with your own Trigger.dev account
npx trigger.dev@4.5.4 dev      # in one terminal — runs the Trigger.dev worker locally
npm run dev                    # in another — runs the Next.js app
```

Two things a fresh clone needs beyond `.env.local`:
- **`trigger.config.ts`'s `TRIGGER_PROJECT_REF`** is this project's own Trigger.dev project ref — replace it with your own project's ref (from `npx trigger.dev@4.5.4 login` + creating a project on [cloud.trigger.dev](https://cloud.trigger.dev)) before running.
- **Seed the two demo profiles and the schema once**, via the Trigger.dev dashboard's "Test" tab or the SDK, in this order: `init-schema` → `seed-profile-cards` → `load-dev-fixtures` (the real `seed-gdelt` ingestion is currently blocked by an external GDELT issue — see "Current, honest status" above — so the dev fixtures are the working dataset until that clears).

Pin the Trigger.dev CLI to `4.5.4` to match this project's pinned SDK version — `@latest` may resolve to a newer minor and refuse to run against a mismatched SDK.

## License

MIT — see [`LICENSE`](LICENSE).
