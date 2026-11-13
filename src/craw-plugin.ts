import { runDoctor } from "./cli/doctor.ts";
import { scrape } from "./template/scrape.ts";

export function manifest() {
  return {
    id: "craw-jobs",
    name: "unjobbed",
    title: "Craw Jobs",
    description: "Jobs scraper plugin for public APIs, ATS feeds, and opt-in boards. Needs-route boards are not the default.",
    version: "1.1.0",
    npmName: "@agnamo/craw-jobs",
    kind: "plugin" as const,
    endpoints: ["scrape", "run", "doctor"],
    vertical: "jobs",
    license: "MIT",
    homepage: "https://github.com/LuxDevNet/unjobbed",
  };
}

const plugin = {
  manifest,
  scrape,
  doctor: runDoctor,
  async run(input: unknown) {
    if (input && typeof input === "object" && Array.isArray((input as { startUrls?: unknown }).startUrls)) {
      return scrape((input as { startUrls: string[] }).startUrls);
    }
    return { ok: true, hint: "use `unjobbed run` for the jobs pipeline", input };
  },
};

export const crawPlugin = plugin;
export default plugin;
