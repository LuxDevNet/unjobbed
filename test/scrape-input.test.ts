import { describe, it, expect } from "vitest";
import { buildScrapeInput } from "../src/cli/scrape-input.ts";

describe("buildScrapeInput", () => {
  it("returns scrape mode with defaults and no sources list", () => {
    const input = buildScrapeInput(["https://example.com", "  "]);
    expect(input).toEqual({
      mode: "scrape",
      startUrls: ["https://example.com"],
      maxPages: 20,
      maxRecords: 50,
    });
    expect("sources" in input).toBe(false);
  });

  it("honors --max-pages and --max-records flags", () => {
    const input = buildScrapeInput(["https://a.test"], {
      "max-pages": "5",
      "max-records": "10",
    });
    expect(input.maxPages).toBe(5);
    expect(input.maxRecords).toBe(10);
  });
});
