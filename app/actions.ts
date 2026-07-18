"use server";

import { auth } from "@trigger.dev/sdk";
import { chat } from "@trigger.dev/sdk/ai";

// Creates the Session row + triggers the first run. The browser never holds
// the environment's secret key - both actions run on the server.
export const startChatSession = chat.createStartSessionAction("mirror-agent");

// Fresh session-scoped access token; the transport calls this on 401/403 to
// refresh. No per-user authorization here - this build has no auth (see
// docs/12 Scope Gate.md §4), so any chatId the client already knows may be
// read/written by that same client.
export async function mintChatAccessToken(chatId: string) {
  return auth.createPublicToken({
    scopes: {
      read: { sessions: chatId },
      write: { sessions: chatId },
    },
    expirationTime: "1h",
  });
}
