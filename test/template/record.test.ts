import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  SCRAPE_LIMITS,
  PageRecordSchema,
  canonicalUrlForPageId,
  pageRecordId,
  parsePageRecord,
  type PageRecord,
} from "../../src/template/record.ts";

describe("record.ts", () => {
  it("exports scrape limits for the template command", () => {
    expect(SCRAPE_LIMITS).toEqual({
      maxPages: 20,
      maxRecords: 50,
      timeBudgetMs: 60_000,
      maxRequestRetries: 2,
      maxConcurrency: 2,
    });
  });

  it("canonicalUrlForPageId drops hash, search, and non-root trailing slashes", () => {
    expect(canonicalUrlForPageId("https://example.com/path/?q=1#frag")).toBe(
      "https://example.com/path",
    );
    expect(canonicalUrlForPageId("https://example.com/")).toBe("https://example.com/");
    expect(canonicalUrlForPageId("https://example.com")).toBe("https://example.com/");
  });

  it("pageRecordId is the first 16 hex chars of sha256(canonical url)", () => {
    const url = "https://example.com/about/?utm=1#x";
    const canonical = canonicalUrlForPageId(url);
    const expected = createHash("sha256").update(canonical).digest("hex").slice(0, 16);
    expect(pageRecordId(url)).toBe(expected);
    expect(pageRecordId(url)).toHaveLength(16);
  });

  it("parses a valid PageRecord with schemaVersion 1", () => {
    const id = pageRecordId("https://example.com");
    const row: PageRecord = {
      schemaVersion: 1,
      id,
      url: "https://example.com",
      title: "Example Domain",
      text: "Example Domain",
      kind: "WebPage",
      extractedBy: "excerpt",
      terms: "public-page",
      retrievedAt: "2026-10-30T20:00:00.000Z",
    };
    expect(parsePageRecord(row)).toEqual(row);
    expect(PageRecordSchema.shape.extractedBy.options).toEqual([
      "jsonld",
      "embedded",
      "rss",
      "excerpt",
    ]);
  });

  it("rejects invalid extractedBy values", () => {
    const id = pageRecordId("https://example.com");
    expect(() =>
      parsePageRecord({
        schemaVersion: 1,
        id,
        url: "https://example.com",
        title: "t",
        text: "t",
        kind: "WebPage",
        extractedBy: "firecrawl",
        terms: "public-page",
        retrievedAt: "2026-10-30T20:00:00.000Z",
      }),
    ).toThrow();
  });
});
