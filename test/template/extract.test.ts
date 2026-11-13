import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildExcerpt, extractPage } from "../../src/template/extract.ts";
import { pageRecordId, parsePageRecord } from "../../src/template/record.ts";

const here = dirname(fileURLToPath(import.meta.url));
const jsonLdFixture = readFileSync(
  join(here, "../fixtures/jsonld-page.html"),
  "utf8",
);

const PAGE_URL = "https://careers.example.com/jobs/platform-engineer";
const FROZEN_NOW = "2026-10-30T20:00:00.000Z";

describe("template/extract.ts", () => {
  it("exports extractPage and buildExcerpt", () => {
    expect(typeof extractPage).toBe("function");
    expect(typeof buildExcerpt).toBe("function");
  });

  it("JSON-LD JobPosting yields extractedBy jsonld and does not use excerpt decoys", () => {
    const record = extractPage({
      url: PAGE_URL,
      html: jsonLdFixture,
      now: FROZEN_NOW,
    });

    expect(record).not.toBeNull();
    const parsed = parsePageRecord(record);
    expect(parsed.extractedBy).toBe("jsonld");
    expect(parsed.kind).toBe("JobPosting");
    expect(parsed.title).toBe("Senior Platform Engineer");
    expect(parsed.text).toContain("reliable scraping infrastructure");
    expect(parsed.text).not.toMatch(/DECOY/i);
    expect(parsed.title).not.toMatch(/DECOY/i);
    expect(parsed.schemaVersion).toBe(1);
    expect(parsed.id).toBe(pageRecordId(PAGE_URL));
    expect(parsed.url).toBe(PAGE_URL);
    expect(parsed.terms).toBe("public-page");
    expect(parsed.retrievedAt).toBe(FROZEN_NOW);
  });

  it("falls back to excerpt when no structured data is present", () => {
    const html = `<!DOCTYPE html><html><head>
      <title>Plain Blog</title>
      <meta name="description" content="Short intro." />
    </head><body></body></html>`;

    const record = extractPage({
      url: "https://example.com/blog",
      html,
      now: FROZEN_NOW,
    });

    expect(record?.extractedBy).toBe("excerpt");
    expect(record?.kind).toBe("WebPage");
    expect(record?.title).toBe("Plain Blog");
    expect(record?.text).toBe("Plain Blog Short intro.");
  });

  it("returns null for empty HTML", () => {
    expect(
      extractPage({ url: "https://example.com", html: "   ", now: FROZEN_NOW }),
    ).toBeNull();
  });
});
