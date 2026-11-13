import { runJobs } from "./pipeline.ts";
import { createActorRuntime } from "./host/runtime.ts";

async function loadActor() {
  try {
    return await import("apify");
  } catch {
    throw new Error(
      "Actor entry requires the optional peer `apify`. For local jobs: node bin/unjobbed.js run",
    );
  }
}

const { Actor } = await loadActor();
await Actor.init();
try {
  await runJobs((await Actor.getInput()) ?? {}, await createActorRuntime());
} finally {
  await Actor.exit();
}
