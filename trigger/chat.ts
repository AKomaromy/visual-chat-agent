import { logger } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";
import { streamText, stepCountIs, tool, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { z } from "zod";
import { visualResponseManifestSchema } from "../lib/visual-response";
import { getBriefingManifest } from "../lib/briefing";
import { deriveTags } from "../lib/tags";

/**
 * gpt-4o was observed (hostile-judge hardening pass, live testing) to
 * reliably fabricate a timeHorizonDays/topicFocus value for the locked
 * default question "What should I know today?" even after several rounds
 * of increasingly explicit prompt/description wording telling it not to -
 * it kept inventing numbers/topics (sometimes copied straight from this
 * file's own .describe() examples) with no basis in the actual question
 * text. Prompt-only fixes could not make the reliable default path
 * reliable, so this grounds the model's extracted params against the
 * literal user text as a deterministic backstop: a param the question's
 * own words don't support is dropped rather than passed to ClickHouse.
 * ClickHouse still computes everything else; this only decides whether
 * the model's narrowing is honored, exactly like the rest of Priority 1.
 */
function lastUserText(messages: ModelMessage[]): string {
  for (let i = messages.length - 1; i >= 0; i--) {
    const message = messages[i];
    if (!message || message.role !== "user") continue;
    if (typeof message.content === "string") return message.content;
    return message.content
      .filter((part): part is Extract<typeof part, { type: "text" }> => part.type === "text")
      .map((part) => part.text)
      .join(" ");
  }
  return "";
}

// Deliberately excludes bare "today"/"now" - those are how the locked
// default question phrases a generic request, not a narrowing window.
const EXPLICIT_TIME_WINDOW_RE =
  /\b(yesterday|this week|last week|past week|this month|last month|past month|\d+\s*(day|days|hour|hours))\b/i;

function groundedTimeHorizon(rawQuestion: string, value: number | undefined): number | undefined {
  if (value === undefined) return undefined;
  return EXPLICIT_TIME_WINDOW_RE.test(rawQuestion) ? value : undefined;
}

function groundedTopicFocus(rawQuestion: string, value: string | undefined): string | undefined {
  if (!value) return undefined;
  const questionTags = new Set(deriveTags(rawQuestion));
  const focusTags = deriveTags(value);
  return focusTags.some((tag) => questionTags.has(tag)) ? value : undefined;
}

/**
 * Task 5 (docs/09 Sprint Plan.md Task 5 / docs/10 Task Backlog.md §2):
 * getBriefing is backed by the real ClickHouse query in lib/briefing.ts.
 *
 * `timeHorizonDays`/`topicFocus` (hostile-judge hardening pass) are the
 * agent's one material job: bounded interpretation of the user's actual
 * question into typed parameters that change the deterministic ClickHouse
 * request. The model never authors a ranking, score, evidence item,
 * geography, or the verdict — those params only narrow which rows
 * lib/briefing.ts's SQL considers; everything it returns is still
 * ClickHouse-computed.
 */
export const tools = {
  getBriefing: tool({
    description:
      "Return the personalized visual briefing manifest for the active profile. " +
      "Always call this tool exactly once per user question - never answer in prose alone. " +
      "Optionally scope it with timeHorizonDays and/or topicFocus when the question actually " +
      "names a time window or topic - never invent either for a generic question.",
    inputSchema: z.object({
      profileId: z.enum(["profile-a", "profile-b"]),
      timeHorizonDays: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe(
          "A number of days, but ONLY when the user's literal question text contains its own explicit " +
            "relative-time phrase naming a window narrower than 'no restriction' (a specific count of hours/days, " +
            "'yesterday', 'this week', 'this month', etc). Do not copy any number from this description as a " +
            "default or example - there is no default. If the question text does not itself contain such a " +
            "phrase, this field must be completely absent from the tool call. This is a strict requirement: " +
            "guessing a plausible-sounding number when the question is generic or vague (including questions " +
            "that use the word 'today' loosely, not as a strict 24-hour cutoff) is an error - omit the field.",
        ),
      topicFocus: z
        .string()
        .min(1)
        .max(60)
        .optional()
        .describe(
          "A short 1-4 word topic phrase, but ONLY when the user's literal question text itself names a " +
            "specific topic in its own words. Do not copy any topic from this description as a default or " +
            "example - there is no default, and do not infer a topic from the active profile's presumed " +
            "interests when the question itself doesn't name one. If the question text does not itself name a " +
            "topic, this field must be completely absent from the tool call. Guessing a plausible-sounding " +
            "topic for a generic or vague question is an error - omit the field.",
        ),
    }),
    outputSchema: visualResponseManifestSchema,
    execute: async ({ profileId, timeHorizonDays, topicFocus }, { messages }) => {
      const rawQuestion = lastUserText(messages);
      const groundedRequest = {
        profileId,
        timeHorizonDays: groundedTimeHorizon(rawQuestion, timeHorizonDays),
        topicFocus: groundedTopicFocus(rawQuestion, topicFocus),
      };
      logger.info("getBriefing request", { modelArgs: { timeHorizonDays, topicFocus }, groundedRequest });
      return getBriefingManifest(groundedRequest);
    },
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
        `never ask the user which profile is active, it is already fixed for this session. ` +
        `Interpret the user's actual question into getBriefing's bounded optional parameters, using only ` +
        `words that literally appear in the question itself - never a number or topic you merely think is ` +
        `plausible, and never one inferred from the profile's presumed interests rather than the question's ` +
        `own text. The generic default question, "What should I know today?", uses "today" loosely to mean ` +
        `"give me the current briefing" - it does NOT name a time window or a topic, so you must leave BOTH ` +
        `parameters completely absent from the tool call for it, and for any similarly generic, unscoped ` +
        `question. When genuinely unsure whether a word in the question counts as naming a window or topic, ` +
        `the correct behavior is to omit the parameter, not to guess. These parameters only narrow which ` +
        `rows the deterministic ClickHouse query considers; you never author a ranking, score, ` +
        `evidence item, geography, or the verdict yourself. ` +
        `After calling getBriefing, do not write any additional prose, summary, or narration - ` +
        `the tool's output is the entire answer and is rendered directly as a visual workspace. ` +
        `Do not describe, restate, or list the briefing's contents in text.`,
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
