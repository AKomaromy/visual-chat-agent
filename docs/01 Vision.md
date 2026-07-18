# 01 — Vision

**Status:** Canonical, synthesized from Deep Research corpus (`vision.md`, `product.md` ×2, `competition.md`, `judging.md`, `architecture.md`, `roadmap.md`).
**Companion documents:** `02 Product.md`, `05 Architecture.md`, `11 Risks.md`

---

## 1. Executive decision

Build **Mirror**, a **personalized impact-intelligence workspace** — not a general-purpose visual answer engine, not a personalized news feed, and not another chatbot with charts attached.

> **Mirror continuously models what a person is trying to accomplish, then shows how changes in the world connect to those goals — as a coordinated visual workspace, not a report.**

A user imports a compact profile (goals, projects, expertise, organizations, locations). They ask a question such as *"What should I know today?"* and receive a coordinated workspace: a ranked **Impact Radar**, a **timeline** of momentum, a **relationship graph** connecting developments to their goals, a **map** when geography matters, and evidence behind every claim. Text supports the visual; it never replaces it.

### Why this scope, specifically

The hackathon rewards the *ratio of insight to words*, requires the response itself to be visual and explorable, and weights meaningful ClickHouse + Trigger.dev use at 25% of the score. A generic "ask anything, get a chart" product satisfies the letter of the brief but not its spirit, and it competes head-on with ChatGPT, Claude, Perplexity, and NotebookLM — a fight Mirror cannot win in a week. Narrowing to **personalized impact intelligence** avoids two specific failure modes:

1. **Chart-generator risk** — letting the model pick from dozens of chart types produces inconsistent, fragile, hard-to-test output.
2. **Generic-assistant risk** — a broad "ask anything" surface has no defensible edge over incumbent research assistants.

Mirror instead owns a narrow, ownable job: *personal relevance made visible.*

---

## 2. The problem

Professionals in fast-changing domains do not lack information — they lack an efficient way to determine what changed, what is genuinely new versus repeated coverage, what matters to their current work, how developments connect, where they're occurring, and what deserves action now.

Existing tools each solve one slice: research assistants write long reports; news apps personalize a feed; knowledge tools organize what the user already captured; BI tools visualize a predefined dataset. **None combines personal context + live external signals + coordinated visual explanation.** The result is a recurring cognitive tax: scan, filter, cross-reference, remember, infer. Mirror externalizes that work.

---

## 3. Target market

### Beachhead user

**Product, technology, and strategy leaders working in fast-changing domains** — software product leaders tracking AI/regulation/competitors, founders tracking markets and funding, consultants monitoring several client domains, policy leaders tracking institutional change.

These users share three traits that make them a good beachhead: their professional context is representable as a compact graph (goals, projects, expertise, organizations, locations); the cost of missing a development is real; they already pay for research, news, or analytics tools.

### Explicitly not the initial target

Casual news readers, general-chatbot seekers, teams needing enterprise-wide permissioned search on day one, users wanting unrestricted arbitrary-data visualization, and users unwilling to spend two minutes correcting their profile.

**Judging effect:** sharper Problem Fit (20%) and Scalability & Impact (10%), and a demo that stays legible in five minutes.

---

## 4. Jobs to be done

**Primary job:** *When the world changes quickly, help me identify the few developments that affect my goals and understand the connections — without reading a report.*

| Situation | User job | Desired outcome |
|---|---|---|
| Starting the day | "Show me what changed since yesterday." | A five-minute visual briefing with clear priorities |
| Investigating a topic | "What is happening with AI regulation?" | Map, timeline, entities, and policy clusters |
| Preparing a decision | "What could affect our product strategy?" | Developments connected to projects, competitors, risks |
| Exploring a signal | "Why does this matter to me?" | Transparent relevance factors and source evidence |
| Correcting personalization | "That's not important anymore." | Immediate update to future ranking |
| Sharing insight | "Show my team what I found." | A stable, shareable workspace snapshot |

---

## 5. Product promise

**Functional:** Mirror turns a natural-language question into a structured, explorable visual workspace grounded in current data and the user's editable context.

**Emotional:** the user should feel **oriented**, not merely informed.

**Category statement:** Mirror is a personalized impact-intelligence workspace for leaders who need to see how external change connects to their goals.

**Positioning statement:** For product, technology, and strategy leaders who cannot read everything, Mirror is a visual intelligence agent that maps current developments to their goals, projects, and expertise. Unlike answer engines that return reports, or news apps that optimize a feed, Mirror produces an interactive impact model that explains relevance, relationships, momentum, and geography.

**Tagline:** *See what changed. See why it matters to you.*

---

## 6. Product principles

1. **The visual is the answer.** The first screen must communicate the result before the user reads a paragraph. *(Problem Fit, Presentation)*
2. **Constrain the visual grammar.** Exactly four coordinated view families — Impact Radar, Timeline, Relationship Graph, Map — plus a persistent Evidence Drawer and Verdict Strip. The agent selects and parameterizes; it never invents chart code. *(Technical Implementation, without losing Innovation — see `04 Visual Language.md`)*
3. **Personalization must be inspectable.** The user can see and edit what Mirror believes about their goals, projects, expertise, organizations, and locations. *(Trust, Scalability & Impact)*
4. **Every signal needs evidence.** Source links, timestamp, confidence, corroboration count, and the factors behind its relevance score. *(Problem Fit, Technical Implementation)*
5. **Progressive disclosure.** Verdict and structure first; sources, methodology, and detail on demand. *(Insight-to-word ratio)*
6. **Real-time must be visible.** Show when data refreshed, how much was analyzed, and which stage is running. *(Makes ClickHouse/Trigger.dev legible to judges)*
7. **The model proposes; the system verifies.** The model classifies intent and plans the visual composition. Data values, counts, rankings, and time-series points come only from deterministic ClickHouse queries and stored evidence — never from model invention. *(Engineering soundness)*

---

## 7. Assumptions challenged

This is where the Deep Research corpus disagreed with itself most; the resolutions below are binding.

| Original assumption | Challenge | Resolution | Why |
|---|---|---|---|
| More chart types = stronger product | Variety multiplies failure modes and breaks visual consistency | Fixed 4-view grammar (Radar / Timeline / Graph / Map) + Evidence Drawer | Technical Implementation, Presentation |
| GDELT should be a secondary discovery feed behind curated RSS (one research track's original position) | Building a bespoke RSS-adapter fleet *and* an LLM entity/location/topic extraction pipeline in one week is the single largest technical-risk item in the whole corpus | **GDELT is the primary P0 ingestion source.** It already ships entities, themes, resolved locations, and tone — eliminating the highest-risk custom NLP extraction work. Curated RSS becomes a P1 diversity/attribution layer, not a prerequisite. | Cuts Day 2–3 build risk sharply without weakening ClickHouse depth; see `05 Architecture.md` §ADR-008 |
| "Ask anything" is the ideal interface | Broad scope produces shallow answers and no differentiation | Two intents only: daily briefing and topic investigation, each mapped to one of four response patterns | Problem Fit, Presentation |
| Personalization should be invisible | Hidden inference feels unreliable or invasive | Render an editable **Mirror Model** graph the user can inspect and correct | Scalability & Impact, trust |
| The LLM should generate the dashboard | Generated UI is unsafe and untestable | LLM emits a typed, validated workspace manifest (MVRP) consumed by fixed renderers | Technical Implementation |
| News summaries are the product | Summaries are commoditized | Connections, momentum, and personal impact are the product | Innovation |
| A consumer audience maximizes impact | Consumer news is crowded and retention-heavy | Start with professional decision-makers | Scalability & Impact |
| Seven visual view types are needed for breadth (other research track's position) | More types raise validation surface and demo complexity without raising insight density | Four types is enough; internal encoding richness (chart sub-forms, map sub-forms) lives inside each type, not as new top-level types | Technical Implementation, Presentation |
| "Mirror" must be the permanent brand | The name is memorable but crowded/hard to trademark long-term | Keep it for the hackathon; revisit naming after validation | Presentation without rework |

---

## 8. Why Mirror beats the obvious alternatives

- **"Ask my logs anything"** (an example straight from the handbook) is technically strong but crowded and reduces perceived originality.
- **General chat-to-dashboard** fits the theme but is hard to make trustworthy in seven days; ThoughtSpot, Tableau, Hex, and Observable already own natural-language analytics over supplied data.
- **"AI regulation map only"** would demo well but is a feature, not a category.

**Mirror's personalized impact map** combines real-time analytical depth, a visual-first response, a concrete repeatable job, a novel personalization layer, and a credible path to a broader product. No materially stronger concept was found in the research corpus — the winning move is narrowing and repositioning the existing concept, not replacing it.

---

## 9. Competitive frame (condensed)

Mirror sits at the intersection of AI research/answer engines, personal knowledge systems, personalized news/market intelligence, and conversational analytics. Each category solves one slice:

| Product | Current external info | Personal context | Visual-first answer | Live monitoring | Explainable relevance |
|---|---:|---:|---:|---:|---:|
| ChatGPT Deep Research / Claude Research | Strong | Medium | Weak–medium | Medium | Weak–medium |
| Perplexity | Strong | Weak–medium | Medium | Strong | Weak |
| NotebookLM | Medium | Medium | Strong | Weak | Strong |
| Glean | Strong | Strong | Weak | Strong | Strong |
| Particle / Feedly AI | Strong | Weak–medium | Weak–medium | Strong | Weak |
| **Mirror (target)** | **Strong** | **Strong** | **Strong** | **Strong** | **Strong** |

**Defensible differentiation:**
1. **Personal impact graph** — a continuously updated graph of goals, projects, expertise, entities, locations, events, evidence, and feedback. Creates compounding personalization and switching cost.
2. **Relevance that can be inspected and edited** — most personalization is invisible inference; Mirror makes it a user-controlled asset.
3. **Coordinated visual grammar** — one workspace whose views share selection, filters, and evidence, not a one-off infographic.
4. **Change detection, not summarization** — new event vs. repeated article vs. acceleration vs. geographic spread vs. new connection vs. direct personal impact.
5. **Visible agent/data provenance** — the user and judge can inspect exactly how the answer was produced.

**Demo hook:** *Two people can ask the same question and receive different maps, because the world matters differently depending on what each person is building.*

---

## 10. Positioning

**Category:** Personalized impact intelligence (rejected alternatives: "visual answer engine" — too broad/copyable; "personalized news" — understates analytical value; "personal knowledge graph" — implies note-taking; "AI dashboard" — implies business metrics).

**One-line:** *Mirror maps what is changing in the world to what you are trying to accomplish.*

**Home-page headline:** *See what changed. See why it matters to you.*

**Supporting line:** *Import your context, ask a question, and explore the answer as a live map of events, entities, time, and personal impact.*

### Market wedge

**The five-minute daily strategic briefing for product and technology leaders** — recurring, easy to demo, broad enough for a meaningful dataset, narrow enough for a clear promise.

**Expansion sequence (post-hackathon, informational only):** daily briefing → topic/competitor investigations → saved monitors and alerts → team context graphs → internal + external intelligence fusion → vertical editions (policy, finance, healthcare, supply chain). None of this is in scope for the build; see `08 MVP.md` for what actually ships.

---

## 11. Success definition

### Hackathon success
- First meaningful visual within 10 seconds on the demo dataset; full workspace within 30 seconds.
- Every displayed fact links to evidence.
- Filters and cross-highlighting respond in under one second once data is loaded.
- ClickHouse and Trigger.dev are visibly central, not decorative.
- The demo completes reliably, end to end, in under five minutes.
- No default-state text block exceeds 80 words.

### Product validation success (post-hackathon signal, not a build target)
- ≥60% of test users rate 4 of the top 5 signals relevant.
- ≥50% interact with more than one coordinated view.
- ≥30% save or share a workspace.
- Users can correct their profile and observe changed ranking on the next query.
- Median time to first useful insight under two minutes from signup.

---

## 12. Naming

Keep **Mirror** for the hackathon: *"The same world looks different depending on who is looking. Mirror reflects the developments that matter to you."* Do not spend build time renaming. Post-validation naming candidates (informational only): Signal Mirror, Impact Atlas, Context Radar, Parallax Intelligence.

---

## 13. Source notes

Synthesized from the Deep Research corpus's `vision.md`, `product.md` (PRD), `competition.md`, `judging.md`, `roadmap.md`, and `architecture.md`. Where these sources disagreed (ingestion source priority, view-type count, depth of personalization), §7 above records the binding resolution and its rationale.
