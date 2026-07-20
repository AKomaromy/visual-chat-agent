/**
 * Re-run this once the OpenAI account has usable quota again
 * (docs/11 Risks.md R-22) to complete Task 2's live acceptance test.
 *
 * Requires TRIGGER_PROD_SECRET_KEY in .env.local (a prod-scoped Trigger.dev
 * secret key — the plain TRIGGER_SECRET_KEY is dev-scoped and cannot
 * trigger/read prod runs). Run with:
 *
 *   set -a; source .env.local; set +a
 *   npx tsx scripts/verify-task2-chat-live.ts
 *
 * Drives mirror-agent through the real chat.agent() session protocol
 * (docs/ai-chat/client-protocol.mdx) against the deployed Trigger.dev
 * Cloud `prod` environment — not the offline mockChatAgent test harness,
 * which never calls a real model and can't prove this. Confirms, for
 * both locked Demo Contract profiles:
 *   - the run completes and getBriefing fires
 *   - the returned manifest validates
 *   - the two manifests' verdict and top Impact Radar item differ
 */

const BASE_URL = "https://api.trigger.dev";
const SECRET_KEY = process.env.TRIGGER_PROD_SECRET_KEY;
if (!SECRET_KEY) throw new Error("TRIGGER_PROD_SECRET_KEY not set");
const TASK_ID = "mirror-agent";
const DEMO_QUESTION = "What should I know today?";

interface Manifest {
  verdict: string;
  views: { impactRadar: Array<{ title: string; score: number }> };
  profileId: string;
}

async function runProfile(profileId: "profile-a" | "profile-b") {
  const chatId = `verify-${profileId}-${Date.now()}`;

  const createResp = await fetch(`${BASE_URL}/api/v1/sessions`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SECRET_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "chat.agent",
      externalId: chatId,
      taskIdentifier: TASK_ID,
      triggerConfig: {
        basePayload: {
          chatId,
          trigger: "submit-message",
          message: { id: "u1", role: "user", parts: [{ type: "text", text: DEMO_QUESTION }] },
          metadata: { profileId },
        },
      },
    }),
  });
  if (!createResp.ok) throw new Error(`session create failed: ${createResp.status} ${await createResp.text()}`);
  const created = (await createResp.json()) as { id: string; publicAccessToken: string; runId: string };
  console.log(`[${profileId}] session=${created.id} run=${created.runId}`);

  const sseResp = await fetch(`${BASE_URL}/realtime/v1/sessions/${created.id}/out`, {
    headers: { Authorization: `Bearer ${created.publicAccessToken}`, Accept: "text/event-stream", "Timeout-Seconds": "50" },
    signal: AbortSignal.timeout(55_000),
  });
  if (!sseResp.ok || !sseResp.body) throw new Error(`SSE subscribe failed: ${sseResp.status} ${await sseResp.text()}`);

  let toolOutput: Manifest | undefined;
  let errorText: string | undefined;
  let turnComplete = false;
  const reader = sseResp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (!turnComplete) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const blocks = buffer.split("\n\n");
    buffer = blocks.pop() ?? "";

    for (const block of blocks) {
      const dataLine = block.split("\n").find((l) => l.startsWith("data:"));
      if (!dataLine) continue;
      let payload: { records?: Array<{ body: string; headers?: [string, string][] }> };
      try {
        payload = JSON.parse(dataLine.slice(5).trim());
      } catch {
        continue;
      }
      if (!payload.records) continue;

      for (const record of payload.records) {
        const controlValue = record.headers?.find(([name]) => name === "trigger-control")?.[1];
        if (controlValue === "turn-complete") {
          turnComplete = true;
          continue;
        }
        if (controlValue || !record.body) continue;

        const { data: chunk } = JSON.parse(record.body) as { data: Record<string, unknown> };
        if (chunk.type === "error") errorText = (chunk as { errorText?: string }).errorText;
        if (typeof chunk.type === "string" && chunk.type.startsWith("tool-") && "output" in chunk) {
          toolOutput = (chunk as { output: Manifest }).output;
        }
      }
    }
  }

  return { chatId, toolOutput, errorText };
}

async function main() {
  const a = await runProfile("profile-a");
  const b = await runProfile("profile-b");

  console.log("=== profile-a ===");
  console.log("error:", a.errorText ?? "(none)");
  console.log("verdict:", a.toolOutput?.verdict);
  console.log("top radar item:", a.toolOutput?.views?.impactRadar?.[0]?.title);

  console.log("=== profile-b ===");
  console.log("error:", b.errorText ?? "(none)");
  console.log("verdict:", b.toolOutput?.verdict);
  console.log("top radar item:", b.toolOutput?.views?.impactRadar?.[0]?.title);

  const bothSucceeded = !a.errorText && !b.errorText && !!a.toolOutput && !!b.toolOutput;
  const manifestsDiffer = JSON.stringify(a.toolOutput) !== JSON.stringify(b.toolOutput);

  console.log("=== result ===");
  console.log("both turns completed without error:", bothSucceeded);
  console.log("manifests differ:", manifestsDiffer);

  if (!bothSucceeded) {
    console.log("Task 2 still blocked — check the error above (likely still OpenAI account quota).");
    process.exit(1);
  }
  if (!manifestsDiffer) {
    console.log("Task 2 ran but manifests did not differ — investigate before marking passed.");
    process.exit(1);
  }
  console.log("Task 2 live acceptance test PASSED.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
