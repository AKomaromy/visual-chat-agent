import { task, logger } from "@trigger.dev/sdk";
import { randomUUID } from "node:crypto";
import { getClickHouseClient } from "../lib/clickhouse";

/**
 * Permanent seed data for both locked Demo Contract profiles (docs/13
 * Demo Contract.md §2-3) — not a dev fixture, not removable. Profile A's
 * cards would eventually come from live paste-extraction; Profile B is
 * explicitly pre-seeded per docs/08 MVP.md §2. Both need real rows in
 * `profile_cards` before getBriefing (Task 5, lib/briefing.ts) has
 * anything to weight against, regardless of GDELT/paste-extraction status.
 *
 * "Organization" in the Demo Contract's card table maps to the schema's
 * `entity` item_type — the closest of the four allowed values (docs/10
 * Task Backlog.md §4); this mapping was already implicit in the schema
 * design, not introduced here.
 *
 * No-ops per profile if that profile already has cards.
 */

const PROFILE_CARDS: Record<string, Array<{ label: string; item_type: string; weight: number }>> = {
  "profile-a": [
    { label: "Ship the AI compliance feature before Q4", item_type: "goal", weight: 3 },
    { label: "AI regulation", item_type: "interest", weight: 3 },
    { label: "Enterprise AI adoption", item_type: "interest", weight: 2 },
    { label: "Competitors in the LLM tooling space", item_type: "entity", weight: 2 },
    { label: "United States", item_type: "location", weight: 2 },
  ],
  "profile-b": [
    { label: "Track EU carbon policy changes this quarter", item_type: "goal", weight: 3 },
    { label: "Climate policy", item_type: "interest", weight: 3 },
    { label: "Energy markets", item_type: "interest", weight: 2 },
    { label: "EU regulatory bodies", item_type: "entity", weight: 2 },
    { label: "European Union", item_type: "location", weight: 2 },
  ],
};

export const seedProfileCards = task({
  id: "seed-profile-cards",
  run: async () => {
    const clickhouse = getClickHouseClient();
    const results: Record<string, { skipped: boolean; inserted: number }> = {};

    for (const [profileId, cards] of Object.entries(PROFILE_CARDS)) {
      const existingResult = await clickhouse.query({
        query: `SELECT count() AS n FROM profile_cards WHERE profile_id = {profileId:String}`,
        query_params: { profileId },
        format: "JSONEachRow",
      });
      const [existingRow] = await existingResult.json<{ n: string }>();
      const existingCount = Number(existingRow?.n ?? 0);

      if (existingCount > 0) {
        logger.info("profile_cards already populated, no-op", { profileId, existingCount });
        results[profileId] = { skipped: true, inserted: 0 };
        continue;
      }

      const rows = cards.map((card) => ({
        profile_id: profileId,
        card_id: randomUUID(),
        label: card.label,
        item_type: card.item_type,
        weight: card.weight,
      }));
      await clickhouse.insert({ table: "profile_cards", values: rows, format: "JSONEachRow" });
      results[profileId] = { skipped: false, inserted: rows.length };
    }

    logger.info("seed-profile-cards complete", results);
    return results;
  },
});
