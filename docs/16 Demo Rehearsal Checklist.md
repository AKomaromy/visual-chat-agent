# 16 — Demo Rehearsal Checklist

**Purpose:** everything to verify before, during, and after recording the demo video, so the take is clean, honest, and matches what's actually shipped. Run this the same session you record, against the real deployment — not local dev alone, unless local dev is what's being recorded (see §A).

**Relationship to `submission-prep/recording-checklist.md`:** that file is an earlier, Cowork-authored draft, produced before the visual workspace existed. Its structure and rigor are good and this checklist reuses that shape; this version is updated to reflect the build as it actually stands (Task 2 passed, workspace built, Task 4 still blocked) rather than treating those as still-open items.

**Rehearsal gate (do not record until this passes):** run the full two-profile flow **three times consecutively without failure**, including one browser refresh mid-stream. If it fails even once, stop and harden before recording.

---

## A. Pre-recording environment

- [ ] Decide and confirm **what's being recorded against**: the deployed Trigger.dev Cloud `prod` backend is live either way (chat.agent + getBriefing); the frontend itself has not been deployed to a public host (e.g. Vercel) as of this writing — confirm with Andrew whether to deploy it first or record against local `next dev` pointed at `prod`. **This is a decision for Andrew, not something to decide silently** — see the report accompanying this document.
- [ ] Latest Trigger.dev deploy is live and matches the commit being submitted (currently `prod` version `20260720.3`).
- [ ] Both profiles seeded exactly per `docs/13 Demo Contract.md` §2–3 (`seed-profile-cards`).
- [ ] **Decide live-vs-fixture data before recording, not during.** As of this writing, Task 4's real GDELT seed has not completed (`docs/11 Risks.md` R-05/R-37) — the only data available is the 20 hand-authored dev fixtures. If recording before Task 4 clears, this is a fixture-backed take and must be stated as such in the README/video, not presented silently as live data.
- [ ] If recording on fixtures: confirm `[DEV FIXTURE]`-prefixed titles and `fixture.mirror-dev.test` URLs are an **acknowledged, documented** choice for this take, not an oversight.
- [ ] If recording on real data: clear dev fixtures first (`tasks.trigger("load-dev-fixtures", { clear: true })`) so nothing mixes.
- [ ] App opens to the Profile A card list, cursor ready near the query box.
- [ ] Trigger.dev run view + one ClickHouse query window open in background tabs for the stack-proof beat.

## B. Browser & screen preparation

- [ ] Single browser window, single tab visible; background tabs muted, nothing sensitive visible if switched to accidentally.
- [ ] Notifications fully disabled (OS + browser).
- [ ] No personal bookmarks bar, no autofill dropdowns, no extension overlays.
- [ ] Browser zoom large enough to read on a laptop; cursor visible.
- [ ] Clean browser profile — no logged-in personal accounts showing an email/avatar.
- [ ] URL bar shows the deployment URL (or `localhost` if recording local — decide per §A), nothing embarrassing in history dropdown.

## C. Data & API verification (within the hour before recording)

- [ ] **Agent path works live** — ask the exact Demo Contract question and confirm a full workspace renders. (Already confirmed working as of 2026-07-20 — re-confirm same-day.)
- [ ] Seed data present and sufficient for Demo Contract §4 thresholds (≥150 articles, ≥30 per profile's topics, ≥5 source countries, published within ~14 days) — **or**, if still on fixtures, confirm the 20-fixture set still meets the spirit of these thresholds for a labelled demo (it was built to, per `docs/14 Engineering Handoff.md` §3).
- [ ] Manual differentiation check passed: Profile A and B's top signals genuinely differ (already confirmed on fixtures — zero top-7 overlap).
- [ ] Spot-check three ranked items against raw `articles` rows — no fabricated data.
- [ ] Every ranked/plotted item opens real evidence in the drawer.
- [ ] One nonsense question ("what's the weather") degrades to a "no material signals" state, not a crash — confirm it still works even if not filmed.
- [ ] Map plots on the correct continents.

## D. Backup / fallback plan

- [ ] Local screen-recording backup of the final take saved separately.
- [ ] Keep the exact seed dataset used for the take reproducible so the repo state matches the video.
- [ ] Second take recorded even if the first looks good.

## E. Audio checks

- [ ] Clean microphone, tested level, no clipping.
- [ ] No copyrighted background music.
- [ ] Room quiet; no keyboard clatter drowning narration.

## F. Visual checks

- [ ] Text in every view legible at target playback size.
- [ ] **No secrets on screen at any point** — no `.env` values, no API keys, no ClickHouse password in a query window, no tokens in a network tab. Confirm the browser network tab is closed or clean if shown.
- [ ] No `[DEV FIXTURE]` strings on screen, unless the take deliberately discloses fixture use per §A.
- [ ] Cursor movements deliberate, matching `docs/17 Recording Script.md` exactly.
- [ ] Workspace fills the frame at the open (visual-first, not chat-first).

## G. Post-recording verification (before uploading)

- [ ] Runtime under 5:00 (target 4:20–4:40).
- [ ] Opens directly on the product — no intro, logo, or founder bio.
- [ ] Contains a live query and a live result.
- [ ] Explains problem fit, ClickHouse usage, and Trigger.dev usage.
- [ ] Ends on the working product with the exact closing line (`docs/13 Demo Contract.md` §8), nothing after.
- [ ] Uploaded to YouTube or Loom; **link plays when signed out** (test in a private window).

## H. Maximum-risk failure points to rehearse (priority order)

1. **The wow moment** (top Radar signal swaps between profiles). Highest stakes, highest weight. If A and B don't visibly differ, stop and fix the data before recording.
2. **Coordinated selection** (click a Radar signal → Timeline/Map respond, Evidence Drawer opens). Rehearse the exact click target.
3. **Streaming completing without an empty view.** Verify seed thresholds first.
4. **Durable refresh** (optional beat) — only film if it reconnects every time in rehearsal.
5. **The three-consecutive-passes gate** — do not record until the full two-profile flow has passed three times in a row, including one mid-stream refresh.

---

## Sign-off before upload

- [ ] Two-profile flow passed 3× consecutively in rehearsal.
- [ ] Recorded state (seed data + deployed commit) is reproducible and matches the repo being submitted.
- [ ] Live-vs-fixture status of the take is truthfully reflected in the README and any submission copy.
- [ ] Backup take saved locally.
- [ ] Andrew has watched the final take end-to-end; signed-out link tested.
