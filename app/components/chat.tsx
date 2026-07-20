"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react";
import type { InferChatUIMessageFromTools } from "@trigger.dev/sdk/ai";
import type { mirrorAgent, tools } from "@/trigger/chat";
import { mintChatAccessToken, startChatSession } from "@/app/actions";
import { visualResponseManifestSchema } from "@/lib/visual-response";
import { Workspace } from "@/app/components/workspace/Workspace";

type Msg = InferChatUIMessageFromTools<typeof tools>;

// The exact Demo Contract question (docs/13 Demo Contract.md §1) - not a
// generic input placeholder. Never change this string without reopening the
// Demo Contract.
const DEMO_QUESTION = "What should I know today?";

type ProfileId = "profile-a" | "profile-b";

function LoadingStage({ label }: { label: string }) {
  // Skeleton preserving final geometry (docs/04 Visual Language.md §12),
  // concrete stage language rather than "Thinking..." (docs/03 UX.md §10).
  return (
    <div className="flex flex-col gap-3" aria-live="polite" role="status">
      <div className="h-5 w-2/3 animate-pulse rounded bg-neutral-800" />
      <p className="text-xs text-neutral-500">{label}</p>
      <div className="h-24 animate-pulse rounded-lg bg-neutral-900" />
      <div className="h-32 animate-pulse rounded-lg bg-neutral-900" />
    </div>
  );
}

export function Chat() {
  const [profileId, setProfileId] = useState<ProfileId>("profile-a");
  const chatId = `${profileId}-chat`;

  const transport = useTriggerChatTransport<typeof mirrorAgent>({
    task: "mirror-agent",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) => startChatSession({ chatId, clientData }),
    clientData: { profileId },
  });

  const { messages, sendMessage, status, regenerate } = useChat<Msg>({ id: chatId, transport });

  const canAsk = status !== "streaming" && status !== "submitted";
  const lastMessage = messages[messages.length - 1];
  const briefingPart = lastMessage?.parts.find(
    (part): part is Extract<Msg["parts"][number], { type: "tool-getBriefing" }> => part.type === "tool-getBriefing",
  );
  const textParts = lastMessage?.role === "assistant" ? lastMessage.parts.filter((p) => p.type === "text") : [];

  return (
    <div className="flex w-full max-w-3xl flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProfileId("profile-a")}
          disabled={!canAsk}
          className={`rounded px-3 py-1 text-sm disabled:opacity-50 ${profileId === "profile-a" ? "bg-white text-black" : "bg-neutral-800"}`}
        >
          Profile A — Maya Chen
        </button>
        <button
          type="button"
          onClick={() => setProfileId("profile-b")}
          disabled={!canAsk}
          className={`rounded px-3 py-1 text-sm disabled:opacity-50 ${profileId === "profile-b" ? "bg-white text-black" : "bg-neutral-800"}`}
        >
          Profile B — Jordan Reyes
        </button>
      </div>

      <button
        type="button"
        disabled={!canAsk}
        onClick={() => sendMessage({ text: DEMO_QUESTION }, { metadata: { profileId } })}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Ask: &ldquo;{DEMO_QUESTION}&rdquo;
      </button>

      {/* Top-level connection error (docs/03 UX.md §15) - distinct from a
          failed getBriefing tool call, which is handled below instead. */}
      {status === "error" && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200" role="alert">
          <p className="mb-2">Connection lost before a response arrived. Your question wasn&apos;t answered.</p>
          <button
            type="button"
            onClick={() => regenerate()}
            className="rounded bg-red-900/60 px-3 py-1 text-xs font-medium hover:bg-red-900"
          >
            Retry
          </button>
        </div>
      )}

      {!lastMessage && status === "ready" && (
        <p className="text-sm text-neutral-500">Ask the question above to see the briefing for this profile.</p>
      )}

      {(status === "submitted" || (status === "streaming" && !briefingPart)) && (
        <LoadingStage label="Interpreting your question and querying ClickHouse…" />
      )}

      {briefingPart?.state === "input-streaming" || briefingPart?.state === "input-available" ? (
        <LoadingStage label="Running the ClickHouse-backed briefing query…" />
      ) : null}

      {briefingPart?.state === "output-error" && (
        <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200" role="alert">
          <p>The briefing query failed: {briefingPart.errorText}</p>
        </div>
      )}

      {briefingPart?.state === "output-available" &&
        (() => {
          const parsed = visualResponseManifestSchema.safeParse(briefingPart.output);
          if (!parsed.success) {
            return (
              <div className="rounded-lg border border-red-900 bg-red-950/40 p-4 text-sm text-red-200" role="alert">
                The briefing response didn&apos;t match the expected shape — not rendering an unvalidated manifest.
              </div>
            );
          }
          return <Workspace manifest={parsed.data} />;
        })()}

      {textParts && textParts.length > 0 && (
        <div className="text-sm text-neutral-400">
          {textParts.map((part, i) => (part.type === "text" ? <p key={i}>{part.text}</p> : null))}
        </div>
      )}

      <p className="text-xs text-neutral-600">Status: {status}</p>
    </div>
  );
}
