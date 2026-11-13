import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { buildContext } from "../../src/output/context.ts";
import { resolveStreamPath } from "../../src/output/stream.ts";
import { scrape } from "../../src/template/scrape.ts";
import type { FetchLike, FetchResponseLike } from "../../src/template/fetch.ts";
import { parsePageRecord, type PageRecord } from "../../src/template/record.ts";

const FROZEN_NOW = "2026-10-30T20:00:00.000Z";
const SCRAPE_URL = "https://example.com";

const here = dirname(fileURLToPath(import.meta.url));
const expectedDir = join(here, "../fixtures/expected");

/** Minimal public page with no JSON-LD — excerpt path only. */
const FIXTURE_HTML = `<!doctype html><html><head><title>Example Domain</title></head><body></body></html>`;

function mockResponse(body: string, contentType = "text/html"): FetchResponseLike {
  return {
    ok: true,
    status: 200,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-type" ? contentType : null;
      },
    },
    async text() {
      return body;
    },
  };
}

function createFixtureFetch(html: string): FetchLike {
  return async (url) => {
    if (url.endsWith("/robots.txt")) {
      return mockResponse("");
    }
    return mockResponse(html);
  };
}

async function readExpectedStreamRecords(): Promise<PageRecord[]> {
  const body = await readFile(join(expectedDir, "stream.jsonl"), "utf-8");
  return body
    .trimEnd()
    .split("\n")
    .filter(Boolean)
    .map((line) => parsePageRecord(JSON.parse(line)));
}

describe("acceptance: scrape files on disk", () => {
  it("writes stream.jsonl and buildContext matches golden fixtures", async () => {
    const expectedRecords = await readExpectedStreamRecords();
    expect(expectedRecords).toHaveLength(1);

    const expectedRecord = expectedRecords[0]!;
    expect(expectedRecord.schemaVersion).toBe(1);
    expect(expectedRecord.retrievedAt).toBe(FROZEN_NOW);
    expect(["excerpt", "jsonld"]).toContain(expectedRecord.extractedBy);

    const expectedContext = JSON.parse(
      await readFile(join(expectedDir, "context.json"), "utf-8"),
    );

    const outDir = await mkdtemp(path.join(os.tmpdir(), "unjobbed-accept-scrape-"));
    const { records, errors } = await scrape([SCRAPE_URL], {
      fetch: createFixtureFetch(FIXTURE_HTML),
      outDir,
      now: FROZEN_NOW,
    });

    expect(errors).toEqual([]);
    expect(records).toHaveLength(1);

    const streamBody = await readFile(resolveStreamPath({ outDir }), "utf-8");
    const streamLines = streamBody.trimEnd().split("\n");
    expect(streamLines).toHaveLength(1);

    const streamRecord = parsePageRecord(JSON.parse(streamLines[0]!));
    expect(streamRecord).toEqual(expectedRecord);
    expect(streamRecord.extractedBy).toBe(expectedRecord.extractedBy);

    const context = buildContext(records, {
      totalOutput: records.length,
      perSource: { template: records.length },
      errors: {},
      seenTruncated: false,
      finishedAt: FROZEN_NOW,
    });

    expect(context).toEqual(expectedContext);
  });
});
