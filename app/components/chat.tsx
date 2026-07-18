"use client";

import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { useTriggerChatTransport } from "@trigger.dev/sdk/chat/react";
import type { mirrorAgent } from "@/trigger/chat";
import { mintChatAccessToken, startChatSession } from "@/app/actions";

// The exact Demo Contract question (docs/13 Demo Contract.md §1) - not a
// generic input placeholder. Never change this string without reopening the
// Demo Contract.
const DEMO_QUESTION = "What should I know today?";

type ProfileId = "profile-a" | "profile-b";

export function Chat() {
  const [profileId, setProfileId] = useState<ProfileId>("profile-a");
  const chatId = `${profileId}-chat`;

  const transport = useTriggerChatTransport<typeof mirrorAgent>({
    task: "mirror-agent",
    accessToken: ({ chatId }) => mintChatAccessToken(chatId),
    startSession: ({ chatId, clientData }) => startChatSession({ chatId, clientData }),
    clientData: { profileId },
  });

  const { messages, sendMessage, status } = useChat({ id: chatId, transport });

  return (
    <div className="flex w-full max-w-2xl flex-col gap-4">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setProfileId("profile-a")}
          className={`rounded px-3 py-1 text-sm ${profileId === "profile-a" ? "bg-white text-black" : "bg-neutral-800"}`}
        >
          Profile A — Maya Chen
        </button>
        <button
          type="button"
          onClick={() => setProfileId("profile-b")}
          className={`rounded px-3 py-1 text-sm ${profileId === "profile-b" ? "bg-white text-black" : "bg-neutral-800"}`}
        >
          Profile B — Jordan Reyes
        </button>
      </div>

      <button
        type="button"
        disabled={status === "streaming" || status === "submitted"}
        onClick={() => sendMessage({ text: DEMO_QUESTION }, { metadata: { profileId } })}
        className="rounded bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
      >
        Ask: &ldquo;{DEMO_QUESTION}&rdquo;
      </button>

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <div key={m.id} className="rounded border border-neutral-700 p-3 text-sm">
            <div className="mb-1 font-semibold uppercase text-neutral-400">{m.role}</div>
            {m.parts.map((part, i) => {
              if (part.type === "text") {
                return <p key={i}>{part.text}</p>;
              }
              if (part.type === "tool-getBriefing" && part.state === "output-available") {
                return (
                  <pre key={i} className="mt-2 overflow-x-auto rounded bg-neutral-900 p-2 text-xs">
                    {JSON.stringify(part.output, null, 2)}
                  </pre>
                );
              }
              return null;
            })}
          </div>
        ))}
      </div>

      <p className="text-xs text-neutral-500">
        Status: {status}. This renders the raw manifest JSON for now — the Impact Radar, Timeline,
        and Map components come in a later task.
      </p>
    </div>
  );
}
