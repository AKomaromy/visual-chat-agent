import { chat } from "@trigger.dev/sdk/ai";
import { streamText, stepCountIs, tool } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { visualResponseManifestSchema } from "../lib/visual-response";
import { getBriefingManifest } from "../lib/briefing";

/**
 * Task 5 (docs/09 Sprint Plan.md Task 5 / docs/10 Task Backlog.md §2):
 * getBriefing is now backed by the real ClickHouse query in
 * lib/briefing.ts, replacing the Task 2 hard-coded fixture manifests.
 * Input/output shape (profileId in, VisualResponseManifest out) is
 * unchanged from the fixture era, per the contract docs/10 §2 fixed.
 */
const tools = {
  getBriefing: tool({
    description:
      "Return the personalized visual briefing manifest for the active profile. " +
      "Always call this tool exactly once per user question - never answer in prose alone.",
    inputSchema: z.object({
      profileId: z.enum(["profile-a", "profile-b"]),
    }),
    outputSchema: visualResponseManifestSchema,
    execute: async ({ profileId }) => getBriefingManifest(profileId),
  }),
};

export const mirrorAgent = chat.agent({
  id: "mirror-agent",
  tools,
  // Discovered while preparing live verification: run() only sees
  // `messages`/`tools`/`signal` - clientData (the profileId set by the
  // frontend's profile switcher, app/components/chat.tsx) was never
  // threaded to the model, so it had no way to know which profile is
  // active and therefore no way to call getBriefing correctly. Fixed by
  // setting the system prompt from clientData in onChatStart (fires once
  // per chat) - chat.toStreamTextOptions() in run() picks it up
  // automatically via chat.prompt.set().
  clientDataSchema: z.object({
    profileId: z.enum(["profile-a", "profile-b"]),
  }),
  onChatStart: async ({ clientData }) => {
    chat.prompt.set(
      `The active profile for this conversation is "${clientData.profileId}". ` +
        `Always call getBriefing with profileId set to exactly "${clientData.profileId}" - ` +
        `never ask the user which profile is active, it is already fixed for this session.`,
    );
  },
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
