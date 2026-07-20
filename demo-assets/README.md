# Demo Assets

Curated screenshots of Mirror's current best state, captured against the real deployed pipeline (Trigger.dev `chat.agent()` → ClickHouse-backed `getBriefing` → streamed manifest) rendered in the actual browser UI — not mockups. Captured with a headless Chromium pass (`chromium.launch` via Playwright) at a 1280×900 viewport, against the controlled dev fixtures (Task 4's real GDELT seed is still blocked — see `docs/11 Risks.md` R-05).

These are the canonical visual assets for judging, documentation, README, Devpost, and presentation. Replace with newer captures only after a meaningful visual change — don't recapture for insignificant edits.

| File | What it shows |
|---|---|
| `01-landing.png` | Idle landing view — profile switcher, Ask button, before any question is asked. |
| `02-profile-a-workspace.png` | Full workspace for Profile A (Maya Chen): Verdict Strip, Impact Radar, Timeline, Map — no selection yet. |
| `03-profile-a-evidence-drawer.png` | Profile A with the top Impact Radar signal selected — Timeline/Map highlight the same signal, Evidence Drawer open with source/date/location. |
| `04-profile-b-workspace.png` | Full workspace for Profile B (Jordan Reyes), same question, no reload — the wow-moment partner to `02`. |
| `05-profile-b-evidence-drawer.png` | Profile B with its top signal selected and Evidence Drawer open. |

**The wow moment:** view `02`/`03` next to `04`/`05`. Same identical question, no reload — Profile A's top signal is a US AI-regulation story; Profile B's is an EU climate-policy story. Verdict, Radar order, and Map emphasis (US vs. EU) all shift together.

**Honesty note:** every article title visible here is prefixed `[DEV FIXTURE]` and every source URL is `fixture.mirror-dev.test` — these are 20 hand-authored, clearly-marked development fixtures (`trigger/load-dev-fixtures.ts`), not real GDELT data. Recapture this whole set once Task 4's real ingestion completes, before using these in the actual submission, per `docs/16 Demo Rehearsal Checklist.md`.
