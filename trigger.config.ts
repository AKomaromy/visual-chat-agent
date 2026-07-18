import { defineConfig } from "@trigger.dev/sdk";

// TODO(human): replace with the real project ref from the Trigger.dev
// dashboard once the hackathon project is created (Task 1 blocker — see
// docs/09 Sprint Plan.md Task 1 and the "credentials needed" note in the
// implementation status report).
const TRIGGER_PROJECT_REF = "proj_REPLACE_ME";

export default defineConfig({
  project: TRIGGER_PROJECT_REF,
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,
  dirs: ["./trigger"],
});
