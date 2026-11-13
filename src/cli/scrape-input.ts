export type ScrapeModeInput = {
  mode: "scrape";
  startUrls: string[];
  maxPages: number;
  maxRecords: number;
};

function numFlag(flags: Record<string, unknown> | undefined, ...keys: string[]): number | undefined {
  if (!flags) return undefined;
  for (const key of keys) {
    const v = flags[key];
    if (v === undefined || v === true) continue;
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
}

/** Build Actor input for the HTTP scrape template (no jobs source list). */
export function buildScrapeInput(urls: string[], flags?: Record<string, unknown>): ScrapeModeInput {
  const startUrls = urls.map((u) => u.trim()).filter(Boolean);
  const maxPages = numFlag(flags, "max-pages", "maxPages") ?? 20;
  const maxRecords = numFlag(flags, "max-records", "maxRecords") ?? 50;
  return {
    mode: "scrape",
    startUrls,
    maxPages,
    maxRecords,
  };
}
