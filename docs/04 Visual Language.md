# 04 — Visual Language

**Status:** Engineering-ready design specification, synthesized from the Deep Research corpus's `visual-language.md`, reconciled with the four-view grammar in `02 Product.md` and the product-character direction in the original `product.md` PRD.
**Companion documents:** `03 UX.md` (interaction behavior), `02 Product.md` (workspace layout)

This document defines the visual grammar, encoding rules, and quality bar *within* each of Mirror's four view types. It does not define new view types — see `02 Product.md` §6 and `03 UX.md` §3 for the closed set.

---

## 1. Design thesis

Mirror does not decorate an answer — it **constructs an answer-space** where the most important conclusion is visible immediately, evidence is inspectable, and follow-up questions are answered through interaction, not more prose. Every response has four perceptual depths (Glance / Inspect / Explore / Verify — see `03 UX.md` §2), and the visual system exists to serve them.

**Product character:** a command center, not a news feed; a map room, not a chatbot; an analyst's model, not a slide generator. Avoid: excessive gradients, decorative chart animation, unreadable force-directed graphs, tiny map labels, dashboard tiles with no interaction, long AI-written explanations, fake precision.

---

## 2. The first-screen contract

Within the first viewport, every response contains: one compact verdict, one dominant visualization, zero to three supporting views, visible scope/freshness, one obvious next action. **Never more than four analytical objects above the fold** — human working memory reliably holds only three to five meaningful chunks, and multi-view coordination itself imposes cognitive cost.

### Response frame anatomy

| Region | Role | Text budget |
|---|---|---:|
| Scope bar | Time range, geography, topic, freshness | 3–6 short chips |
| Verdict strip | Direction, significance, or recommended action | 8–18 words |
| Primary view | Answers the dominant analytic task | Title + labels only |
| Supporting views | Complementary dimensions (who, where, why, confidence) | Concise labels/annotations |
| Action rail | Compare, filter, pin, ask-about-selection, reset | Icons + short labels |
| Evidence drawer | Sources, timestamps, assumptions, uncertainty | Unrestricted, on demand |

A verdict is a compressed claim with visible support, not a summary paragraph. Preferred forms: **Change** ("Regulatory activity accelerated, led by the EU and U.S."), **Status** ("No critical shift; two weak signals deserve monitoring"), **Pattern** ("Three anomalies share the same upstream source"), **Uncertainty** ("Evidence points upward, but confidence is moderate"). Hovering/focusing the verdict highlights the marks that support it.

---

## 3. Encoding hierarchy

Default preference order for precise comparison — a soft constraint, not an absolute law:

1. position on a common scale
2. position on aligned scales
3. length
4. angle or slope
5. area
6. color lightness/saturation
7. shape or texture

### Canonical task → encoding table

| Task | Preferred encoding | Avoid by default |
|---|---|---|
| Compare values | Sorted dot plot / bar chart | Unaligned stacked bars, bubbles |
| Rank entities | Sorted bars / lollipop | Unordered cards |
| Show change | Delta bars, slopegraph, indexed lines | Two disconnected snapshots |
| Show trend | Line chart with baseline + annotations | Area chart where overlap obscures values |
| Show distribution | Histogram / strip / box-violin with raw points | Mean-only bar |
| Show composition | 100% bars, stacked bars, treemap (hierarchy) | Pie/donut with many slices |
| Show relationships | Node-link, matrix, or hybrid by density | Force graph as visual wallpaper |
| Show sequence | Event timeline, interval/Gantt view | Unordered event cards |
| Show uncertainty | Interval, quantile dotplot, confidence encoding | Vague confidence adjectives alone |

These sub-forms live **inside** the Timeline and Chart-bearing surfaces of the four view types (§4 of `02 Product.md`); Mirror does not add new top-level view types to reach them.

---

## 4. Map rules

A map appears **only when location is part of the explanation or decision** — never merely because records contain coordinates. Valid triggers: geographic concentration/disparity, proximity/access, movement/diffusion, jurisdictional differences, spatial clustering, or a decision whose answer changes by location. This is the same acceptance rule as `02 Product.md` §6.5 (≥60% reliable geography, event location not publisher location, uncertain geography excluded from aggregation).

| Spatial task | Preferred form | Required companion |
|---|---|---|
| Compare regions | Normalized choropleth or proportional symbols | Sorted regional ranking |
| Locate incidents | Clustered points, hexbin, or density surface (H3-backed) | Time histogram |
| Explore movement | Origin-destination arcs, aggressively filtered | Ranked route table or timeline |
| Compare spatial change | Synchronized small-multiple maps or swipe difference | Delta ranking |

Rules: normalize rates when population/opportunity varies; show missing/unreliable geography explicitly; neutral, reduced-contrast basemap; labels only where they aid orientation; preserve selection across map/chart/timeline; always offer a "ranked view" beside a choropleth; aggregate at the current zoom level rather than plotting raw points (ClickHouse H3 aggregation — see `06 Data.md` §9 — is what makes this fast).

---

## 5. Graph rules

Use the relationship graph only when the relationship structure **is** the answer — paths, dependencies, communities, or explicit ties. Never render a graph merely because entity relationships exist in the data.

| Condition | Representation |
|---|---|
| Small, sparse, path-focused | Node-link |
| Dense, >~20 nodes for adjacency tasks | Adjacency matrix or provide one as an alternate view |
| Global network with dense local communities | Hybrid node-link + matrix |
| Hierarchy | Indented tree / icicle / treemap |

The 20-node threshold is a conservative default, not a universal constant — adjust for density, task, and screen size. Controls: default to one- or two-hop neighborhoods; cluster/aggregate before rendering; label selected and high-importance nodes only; always provide a list/matrix alternative; make edge meaning explicit in a legend; **never use physics motion after the layout stabilizes.** Co-occurrence edges must be visually and label-distinct from asserted semantic relationships (see `06 Data.md` §12.3 and `11 Risks.md` R-19).

---

## 6. Timeline rules

Timelines answer "what happened," "what changed," or "what's recurring."

| Question | Timeline form |
|---|---|
| What happened? | Ranked event lane with importance encoding |
| What changed? | Event strip aligned to a metric trend (delta chart) |
| What's recurring? | Calendar heatmap or cadence plot |

**Never require the user to remember a previous visual state.** Use at least one explicit change cue: ghosted prior value, delta label, slope/connecting line, before/after small multiples, an identity-preserving animated transition, or explicit "new / removed / changed" markers.

---

## 7. Multiple-view composition

Multiple views are justified only when complementary. A composed response may contain an **Answer** view (directly answers the task), a **Context** view (scale/baseline/distribution), an **Explanation** view (who/where/what contributes), and a **Verification** view (uncertainty/source quality/raw evidence). Do not include two views encoding the same fact differently unless the comparison itself teaches something.

All views in one response share: time scope, entity selection, filter state, color semantics, data freshness, comparison baseline. A selection in one view must produce exactly one of **highlight**, **filter**, or **recompute** elsewhere, and the interaction must signal which occurred (see `03 UX.md` §4–5 for the full behavioral contract).

---

## 8. Text system

Target **fewer than 80 visible words above the fold**, excluding axis labels and entity names.

| Element | Limit | Rule |
|---|---:|---|
| Response title | 3–9 words | Name the analytic task, not the chart |
| Verdict | 8–18 words | One claim, one direction, one implication |
| Annotation | 3–12 words | Label a specific mark or interval |
| Tooltip | Up to 40 words, 3–7 fields | Values first, explanation second |
| Empty/error message | Up to 35 words | State what happened and the next action |
| Evidence drawer | No fixed limit | Structured, searchable, collapsed by default |

Writing style: declarative titles ("EU policy activity doubled," not "Policy activity over time"); put the comparison in the label ("+18% vs. last week"); avoid "interesting," "significant," "important" without a stated basis; distinguish observed fact, model inference, and editorial interpretation; never narrate what the user can already see.

---

## 9. Color, contrast, and semantic consistency

Color has fixed meaning within a response: **accent** (current focus/selection), **positive/negative** (only when direction has domain-valid meaning), **new/removed/changed** (distinct hue + symbol/line style, never hue alone), **uncertain** (reduced saturation/texture/interval + a label), **context** (neutral gray), **source categories** (stable categorical palette across views). **Color is never the sole carrier of meaning.**

### Theme

A restrained dark "observatory" canvas is the hackathon demo default — it reads as a command center, not a news feed, and matches the product-character direction (dark neutral background, high-contrast typography, one warm accent for personal impact, one cool accent for external events, subdued evidence/secondary entities, restrained motion that communicates streaming and connection). The token system must remain theme-independent underneath: every state also works in a light theme, data marks stay brighter than interface chrome, and basemaps stay subdued in both themes.

### Uncertainty

Uncertainty changes the *encoding*, not just an added badge: intervals around estimates, quantile dotplots for decision scenarios, value-suppressing palettes for uncertain maps, evidence-count/source-agreement indicators, explicit "unknown" categories.

---

## 10. Typography and layout

- One display size for the verdict/key number; one heading size for view titles; one body size for annotations/controls; one compact size for labels/metadata. Tabular numerals for values. Sentence case, not all caps.
- 12-column desktop grid, single-column mobile flow. Primary view gets 45–65% of analytical area. Supporting views align to the primary view's reading order. Whitespace separates analytic roles — no decorative borders around every tile. Legends stay near the marks they explain. Positions stay stable while data updates.
- **Responsive reduction** (in order): preserve verdict + primary view → turn supporting views into swipeable/stacked sections → collapse advanced controls → replace dense labels with focus-on-demand → provide a structured text alternative below the visual response.

---

## 11. Motion

Motion exists to preserve object identity, explain transformation, or direct attention — never as ambient decoration.

**Allowed:** staged transition between filter states; morph between related chart forms when data objects persist; reveal new/removed marks during change comparison; progressive arrival of independently computed views; a short pulse on the marks supporting the verdict.

**Prohibited:** continuously moving force layouts; looping decorative particles; automatic carousel changes; animation that blocks interaction; simultaneous movement across every view. Users must be able to reduce motion.

---

## 12. Interaction states (visual requirements)

Every visual component must render distinctly for: **loading** (skeleton preserving final geometry), **ready**, **hover/focus**, **selected** (persistent cross-view), **filtered**, **stale** (older than expected), **partial** (some sources/jobs incomplete), **error** (failed without collapsing the whole response), **empty** (valid query, no records), **offline/static** (last known result + freshness warning). Full behavioral rules for these states are in `03 UX.md` §15.

---

## 13. Accessibility requirements

WCAG 2.2 AA is the baseline. Keyboard access to every interaction; visible focus preserved; no hover-only dependency; non-color encodings for state/category; a structured summary and data table for every visualization; filter/selection changes announced to assistive technology; 200% text zoom and reflow supported; reduced-motion behavior; touch targets ≥24×24 CSS pixels (larger for primary actions).

---

## 14. Visual anti-patterns

| Anti-pattern | Why it fails | Required alternative |
|---|---|---|
| Wall of cards | Reproduces the wall of text spatially | One hero view + complementary views |
| Decorative map | Location isn't part of the task | Ranking or distribution chart |
| Force-directed hairball | Relationships unreadable | Filtered neighborhood, matrix, or hybrid |
| KPI confetti | Large numbers without context | Delta, baseline, trend, confidence |
| Hidden assumptions | User can't repair the answer | Visible scope chips and assumption controls |
| Every control visible | High cognitive/visual load | Contextual and progressive controls |
| Text-heavy tooltip as the answer | Insight stays hidden | Direct annotation and linked marks |
| Multiple redundant views | More tiles, no more insight | Complementary-role test (§7) |
| Unexplained "AI confidence" | False precision | Evidence, source agreement, uncertainty form |
| Abrupt visual replacement | Causes change blindness | Object-preserving transition or explicit before/after |

---

## 15. Engineering acceptance criteria

A response passes visual-language review when: the central answer is visible without scrolling; the primary view maps directly to the main analytic task; every supporting view answers a distinct subquestion; no more than four analytical objects appear above the fold; active scope and freshness are visible; all views share selection, filters, color semantics, and baseline; every ambiguous assumption is inspectable and repairable; uncertainty is encoded when it can change a decision; every interaction is reversible; keyboard and structured alternatives are available; the response remains useful when one supporting job fails; visible text stays within budget unless the user explicitly requests detail.

---

## 16. Source notes

Synthesized and trimmed from the Deep Research corpus's `visual-language.md`, cross-referenced with the "Design direction" section of the source `product.md` PRD for the concrete dark/accent theme direction. Chart-form breadth (choropleth, hexbin, slopegraph, matrix, etc.) is preserved as internal encoding vocabulary within the four closed view types defined in `02 Product.md`, not as additional top-level types — this is the reconciliation between the source research's broader task-driven vocabulary and the product's fixed visual grammar.
