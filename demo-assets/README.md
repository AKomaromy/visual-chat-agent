# Demo Assets

Curated screenshots of Mirror's current best state, captured against the real deployed pipeline (Trigger.dev `chat.agent()` → ClickHouse-backed `getBriefing` → streamed manifest) rendered in the actual browser UI — not mockups. Captured with a headless Chromium pass (`chromium.launch` via Playwright) at a 1280×900 viewport. **Accurate description: live OpenAI, Trigger.dev, and ClickHouse execution over a controlled fixture news dataset** — Task 4's real GDELT seed is still blocked (see `docs/11 Risks.md` R-05), so the article content itself is not real/live news yet.

These are the canonical visual assets for judging, documentation, README, Devpost, and presentation. Replace with newer captures only after a meaningful visual change — don't recapture for insignificant edits. **Recaptured in the Session 7 hostile-judge hardening pass** — the prior set showed a narrower single-column layout, arrow-glyph "direction" labels, and a fixed non-editable question button, none of which reflect the current build.

| File | What it shows |
|---|---|
| `01-landing.png` | Idle landing view — profile switcher, editable question input (prefilled with the locked default question), Ask button, before any question is asked. |
| `02-profile-a-workspace.png` | Full workspace for Profile A (Maya Chen), locked default question: Verdict Strip, Impact Radar side-by-side with the Map, Timeline below — no selection yet. |
| `03-profile-a-evidence-drawer.png` | Profile A with the top Impact Radar signal selected — Timeline/Map highlight the same signal, Evidence Drawer open with source/date/location. Note the honest "New"/"Recent"/"Older" recency labels (not a rising/stable/declining momentum claim). |
| `04-profile-b-workspace.png` | Full workspace for Profile B (Jordan Reyes), same locked default question, no reload — the wow-moment partner to `02`. |
| `05-profile-b-evidence-drawer.png` | Profile B with its top signal selected and Evidence Drawer open. |
| `06-non-default-question.png` | Profile A asked a supported non-default question, **"What changed this week about AI regulation?"** — the editable input holds the typed question, a Reset button appears, the verdict and Timeline visibly narrow to the last 7 days, proving `chat.agent()`'s bounded interpretation materially changes the ClickHouse request rather than being a no-op. |

**The wow moment:** view `02`/`03` next to `04`/`05`. Same identical question, no reload — Profile A's top signal is a US AI-regulation story; Profile B's is an EU climate-policy story. Verdict, Radar order, and Map emphasis (US vs. EU) all shift together. `06` demonstrates the second, independent proof of materiality: the same profile, a different typed question, a visibly narrower answer.

**Honesty note:** every article title visible here is prefixed `[DEV FIXTURE]` and every source URL is `fixture.mirror-dev.test` — these are 20 hand-authored, clearly-marked development fixtures (`trigger/load-dev-fixtures.ts`), not real GDELT data. A local GDELT ingestion attempt this pass failed with a connectivity error (`docs/11 Risks.md` R-33 addendum) — fixtures remain the judged dataset. Recapture this whole set once Task 4's real ingestion completes, before using these in the actual submission, per `docs/16 Demo Rehearsal Checklist.md`.
