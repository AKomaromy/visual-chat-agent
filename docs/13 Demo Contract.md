# 13 — Demo Contract

**This is not a specification. It is a commitment.** Every engineering decision between now and recording either serves this document or it doesn't belong in Stage A. If a task doesn't move one of the eight answers below closer to true, it doesn't happen this week.

---

### 1. Exactly what question will be asked

> **"What should I know today?"**

Typed or clicked identically both times — once as Profile A, once as Profile B. No other question is asked on camera. No variation in wording between the two runs.

---

### 2. Exactly what Profile A is

**Maya Chen — VP of Product, AI infrastructure startup.** Pasted profile extracts to these cards:

| Card | Type | Weight |
|---|---|---:|
| Ship the AI compliance feature before Q4 | Goal | 3 |
| AI regulation | Interest | 3 |
| Enterprise AI adoption | Interest | 2 |
| Competitors in the LLM tooling space | Organization | 2 |
| United States | Location | 2 |

---

### 3. Exactly what Profile B is

**Jordan Reyes — Climate policy analyst.** Pre-seeded, not live-pasted on camera:

| Card | Type | Weight |
|---|---|---:|
| Track EU carbon policy changes this quarter | Goal | 3 |
| Climate policy | Interest | 3 |
| Energy markets | Interest | 2 |
| EU regulatory bodies | Organization | 2 |
| European Union | Location | 2 |

These two profiles share no topic vocabulary by design — that's what makes the wow moment (§7) work.

---

### 4. Exactly what data must exist

The seed load (`09 Sprint Plan.md` Task 4) must produce, before any UI work starts:

- ≥4 GDELT DOC 2.0 queries, covering at minimum: **AI regulation**, **climate/energy policy**, **markets**, **geopolitics**.
- ≥150 total articles.
- ≥30 articles tagged toward Profile A's topics (AI, regulation, enterprise tech).
- ≥30 articles tagged toward Profile B's topics (climate, energy, EU policy).
- ≥5 distinct source countries with valid coordinates, so the Map has something to plot.
- Published within the last 14 days, so the Timeline isn't a flat line.

If the manual diversity check (`09 Sprint Plan.md` Task 4) doesn't hit these numbers, the seed queries get adjusted before anything else is built — not after.

---

### 5. Exactly what visualizations must appear

For each profile's run, in this order: **Verdict Strip** (one line) → **Impact Radar** (5–7 ranked signals) → **Timeline** (bucketed counts) → **Map** (H3-aggregated points) → **Evidence Drawer** (opens on selection). No other view type renders. No component renders empty — if a view has nothing to show, it doesn't appear rather than showing a blank frame.

---

### 6. Exactly what interaction the presenter performs

1. With Profile A active, submit the question (§1).
2. Wait for the Radar, Timeline, and Map to finish streaming in.
3. Click the top-ranked Radar signal.
4. Observe the Timeline and Map respond to that selection.
5. Open the Evidence Drawer for that signal; point at the source and timestamp.
6. Switch the profile switcher to Profile B. **No re-paste. No page reload.**
7. Submit the identical question (§1) again.
8. Let it stream in fully before speaking.

No other click happens on camera. No scrolling to find a feature. No settings panel.

---

### 7. Exactly what "wow moment" happens

**The top-ranked Impact Radar signal changes from an AI-regulation story (Profile A) to a climate-policy story (Profile B) — same literal question, same underlying data, nothing retyped.** This is the entire demo's thesis in one visual beat. If this moment is weak or ambiguous in rehearsal, everything else stops until it isn't — per `12 Scope Gate.md` §7.2, this is checked with a manual query *before* Session 4's UI work, not discovered here.

---

### 8. Exactly what sentence closes the demo

> **"Same world, same question — a different answer, because it's a different person asking."**

Spoken once, over the Profile B workspace, after step 8 above. Nothing follows it — no slide, no logo, no credits.

---

## What this locks

Everything above is fixed. The two profiles, the one question, the data thresholds, the click sequence, the closing line — none of it changes without deliberately reopening this document. Every remaining implementation hour serves getting §1–8 to happen reliably, three times in a row, on the real deployment.

---

## Planning is complete

From here forward: **implementation changes that reduce technical risk are in scope without asking. Anything that changes the product — the question, the profiles, the views, the flow — requires stopping and confirming first**, because it means reopening this contract, not just writing code.
