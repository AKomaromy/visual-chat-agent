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

// The exact Demo Contract question (docs/13 Demo Contract.md §1). The
// question input below is editable (hostile-judge hardening pass - an
// editable input plus bounded agent interpretation is what makes
// chat.agent() materially meaningful, see trigger/chat.ts), but it always
// starts prefilled with this exact string and "Reset" always returns to
// it, so the locked one-click demo path is never lost. Never change this
// string without reopening the Demo Contract.
const DEMO_QUESTION = "What should I know today?";

type ProfileId = "profile-a" | "profile-b";

// Trigger.dev Sessions are terminal - once closed, that exact externalId can
// never start a new session (confirmed live: a stale dev-testing session on
// "profile-a-chat" left it permanently closed, 409 "Session is closed; use a
// different externalId"). A fixed per-profile chatId would mean one closed
// session locks that profile out forever. Instead, mint a fresh id per
// profile the first time it's used in a browser tab and persist it in
// sessionStorage - this still resumes correctly across a same-tab reload
// (needed for the durable-refresh proof) without ever reusing a dead id
// across separate sessions/tabs. Read directly during render (not via
// useEffect+setState) since it's an idempotent, synchronous external-store
// lookup: after the first call writes it, every later call for the same
// profileId reads back the same value.
function getOrCreateChatId(profileId: ProfileId): string {
  if (typeof window === "undefined") return `${profileId}-chat`;
  const key = `mirror-chat-id:${profileId}`;
  const existing = window.sessionStorage.getItem(key);
  if (existing) return existing;
  const fresh = `${profileId}-chat-${crypto.randomUUID()}`;
  window.sessionStorage.setItem(key, fresh);
  return fresh;
}

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
  const [question, setQuestion] = useState(DEMO_QUESTION);
  const chatId = getOrCreateChatId(profileId);

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

  const trimmedQuestion = question.trim();
  const isDefaultQuestion = trimmedQuestion === DEMO_QUESTION;

  return (
    <div className="flex w-full max-w-6xl flex-col gap-4">
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

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={!canAsk}
          aria-label="Question to ask Mirror"
          placeholder={DEMO_QUESTION}
          className="flex-1 rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 disabled:opacity-50"
        />
        <div className="flex gap-2">
          {!isDefaultQuestion && (
            <button
              type="button"
              onClick={() => setQuestion(DEMO_QUESTION)}
              disabled={!canAsk}
              className="rounded px-3 py-2 text-xs text-neutral-400 hover:bg-neutral-800 hover:text-neutral-200 disabled:opacity-50"
              title="Reset to the locked Demo Contract question"
            >
              Reset
            </button>
          )}
          <button
            type="button"
            disabled={!canAsk || trimmedQuestion.length === 0}
            onClick={() => sendMessage({ text: trimmedQuestion }, { metadata: { profileId } })}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            Ask
          </button>
        </div>
      </div>

      {!isDefaultQuestion && (
        <p className="text-xs text-neutral-500">
          Mirror will interpret this question into a bounded time window and/or topic focus if it names one — the
          ranking, evidence, geography, and verdict are still computed entirely by ClickHouse.
        </p>
      )}

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
    </div>
  );
}
