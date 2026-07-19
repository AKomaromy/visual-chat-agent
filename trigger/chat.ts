import { chat } from "@trigger.dev/sdk/ai";
import { streamText, stepCountIs, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { visualResponseManifestSchema, type VisualResponseManifest } from "../lib/visual-response";

/**
 * Task 2 fixture (docs/09 Sprint Plan.md Task 2 / docs/10 Task Backlog.md §2).
 * Two hard-coded manifests keyed by the two locked Demo Contract profiles
 * (docs/13 Demo Contract.md §2-3) so the two-profile differentiation can be
 * smoke-tested even before real ClickHouse queries exist. Task 5 replaces
 * only the body of `execute` below with real queries - the tool's
 * input/output shape does not change.
 */
const FIXTURES: Record<string, VisualResponseManifest> = {
  "profile-a": {
    protocolVersion: 1,
    artifactId: randomUUID(),
    profileId: "profile-a",
    verdict: "AI regulation activity accelerated this week, led by the EU and US.",
    views: {
      impactRadar: [
        {
          id: "sig-1",
          title: "EU finalizes AI Act enforcement guidance",
          score: 0.91,
          direction: "rising",
          evidenceIds: ["ev-1"],
        },
        {
          id: "sig-2",
          title: "US agency proposes AI compliance framework",
          score: 0.74,
          direction: "rising",
          evidenceIds: ["ev-2"],
        },
      ],
      timeline: [
        { bucketStart: "2026-07-15T00:00:00Z", count: 3 },
        { bucketStart: "2026-07-16T00:00:00Z", count: 5 },
        { bucketStart: "2026-07-17T00:00:00Z", count: 9 },
      ],
      map: [
        { h3: "831f0ffffffffff", count: 4, label: "European Union" },
        { h3: "832834fffffffff", count: 3, label: "United States" },
      ],
    },
    evidence: [
      {
        id: "ev-1",
        title: "EU finalizes AI Act enforcement guidance",
        url: "https://example.com/eu-ai-act",
        source: "Reuters",
        publishedAt: "2026-07-17T09:00:00Z",
      },
      {
        id: "ev-2",
        title: "US agency proposes AI compliance framework",
        url: "https://example.com/us-ai-framework",
        source: "AP",
        publishedAt: "2026-07-17T14:00:00Z",
      },
    ],
    createdAt: new Date().toISOString(),
  },
  "profile-b": {
    protocolVersion: 1,
    artifactId: randomUUID(),
    profileId: "profile-b",
    verdict: "EU carbon policy moved this week, with energy markets reacting.",
    views: {
      impactRadar: [
        {
          id: "sig-3",
          title: "EU carbon border tax rules take effect",
          score: 0.88,
          direction: "rising",
          evidenceIds: ["ev-3"],
        },
        {
          id: "sig-4",
          title: "European energy prices shift on policy news",
          score: 0.69,
          direction: "stable",
          evidenceIds: ["ev-4"],
        },
      ],
      timeline: [
        { bucketStart: "2026-07-15T00:00:00Z", count: 2 },
        { bucketStart: "2026-07-16T00:00:00Z", count: 4 },
        { bucketStart: "2026-07-17T00:00:00Z", count: 6 },
      ],
      map: [{ h3: "831f0ffffffffff", count: 6, label: "European Union" }],
    },
    evidence: [
      {
        id: "ev-3",
        title: "EU carbon border tax rules take effect",
        url: "https://example.com/eu-carbon-tax",
        source: "Reuters",
        publishedAt: "2026-07-17T08:00:00Z",
      },
      {
        id: "ev-4",
        title: "European energy prices shift on policy news",
        url: "https://example.com/eu-energy",
        source: "Bloomberg",
        publishedAt: "2026-07-17T11:00:00Z",
      },
    ],
    createdAt: new Date().toISOString(),
  },
};

const tools = {
  getBriefing: tool({
    description:
      "Return the personalized visual briefing manifest for the active profile. " +
      "Always call this tool exactly once per user question - never answer in prose alone.",
    inputSchema: z.object({
      profileId: z.enum(["profile-a", "profile-b"]),
    }),
    outputSchema: visualResponseManifestSchema,
    execute: async ({ profileId }) => {
      // TASK 5 REPLACES THIS BODY with real ClickHouse-backed queries.
      // Input/output shape (profileId in, VisualResponseManifest out) is
      // the contract Task 5 must preserve - see docs/10 Task Backlog.md §2.
      const fixture = FIXTURES[profileId];
      if (!fixture) {
        throw new Error(`No fixture for profileId: ${profileId}`);
      }
      return { ...fixture, artifactId: randomUUID(), createdAt: new Date().toISOString() };
    },
  }),
};

export const mirrorAgent = chat.agent({
  id: "mirror-agent",
  tools,
  run: async ({ messages, tools, signal }) => {
    return streamText({
      ...chat.toStreamTextOptions({ tools }),
      // Provider swapped from Anthropic to OpenAI (Anthropic org disabled,
      // pending appeal - docs/14 Engineering Handoff.md §5/§7). Reads
      // OPENAI_API_KEY from the environment automatically, same convention
      // as the anthropic() provider did for ANTHROPIC_API_KEY.
      model: openai("gpt-4o"),
      messages,
      abortSignal: signal,
      stopWhen: stepCountIs(3),
    });
  },
});
