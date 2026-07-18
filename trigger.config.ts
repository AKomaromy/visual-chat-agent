import { defineConfig } from "@trigger.dev/sdk";

const TRIGGER_PROJECT_REF = "proj_nlisinjujntnqjrchglx";

export default defineConfig({
  project: TRIGGER_PROJECT_REF,
  runtime: "node",
  logLevel: "log",
  maxDuration: 60,
  dirs: ["./trigger"],
});
