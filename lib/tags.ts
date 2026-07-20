/**
 * Shared keyword-tag vocabulary (docs/12 Scope Gate.md §7.1 — lightweight
 * keyword matching instead of GDELT's own theme/entity taxonomy). Used on
 * both sides of the relevance match: `seed-gdelt` derives these tags from
 * article titles at ingestion time, and `getBriefing` (lib/briefing.ts)
 * derives the same tags from profile-card labels so the two sides share
 * real vocabulary, per the design note in docs/12 Scope Gate.md §7.1.
 *
 * Extracted from trigger/seed-gdelt.ts during Task 5 so the card-matching
 * side doesn't duplicate (and risk drifting from) the article-tagging side.
 */

export const TAG_KEYWORDS: Record<string, string[]> = {
  ai: ["ai ", " ai", "artificial intelligence", "chatgpt", "llm", "machine learning", "generative ai"],
  regulation: ["regulation", "regulatory", "compliance", "legislation", " law", " act "],
  enterprise: ["enterprise", "startup", "company", "corporate", "business", "tech industry"],
  "llm-tooling": ["llm", "chatbot", "copilot", "openai", "anthropic", "google ai", "ai model"],
  climate: ["climate", "emissions", "warming", "environment"],
  carbon: ["carbon"],
  energy: ["energy", "power grid", " oil", " gas", "renewable", "solar", "wind power"],
  eu: ["european union", "eu regulat", "eu carbon", "eu policy", "brussels", " eu "],
  markets: ["market", "stock", "shares", "trading", "economy", "inflation", "finance", "central bank"],
  geopolitics: ["geopolitic", "diplomat", "sanctions", "foreign policy", "conflict"],
  "united-states": ["united states", "u.s.", "washington", "congress", "white house"],
};

export function deriveTags(text: string): string[] {
  const lower = ` ${text.toLowerCase()} `;
  const tags: string[] = [];
  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) tags.push(tag);
  }
  return tags;
}

/**
 * Coarse mapping from a profile's "location" card label to the article
 * country codes that should earn the geo boost in getBriefing's ranking
 * query (lib/briefing.ts). Deliberately small and hand-maintained — the
 * two locked Demo Contract profiles (docs/13 Demo Contract.md §2-3) only
 * ever use "United States" and "European Union".
 */
export const LOCATION_TO_COUNTRIES: Record<string, string[]> = {
  "United States": ["US"],
  "European Union": [
    "DE", "FR", "BE", "NL", "IT", "ES", "PL", "AT", "LT", "LV", "EE",
    "SE", "DK", "FI", "PT", "GR", "CZ", "IE", "LU", "HU", "RO", "BG",
    "HR", "SK", "SI",
  ],
};
