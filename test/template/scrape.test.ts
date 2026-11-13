import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { resolveStreamPath } from "../../src/output/stream.ts";
import { scrape, type ScrapeError } from "../../src/template/scrape.ts";
import type { FetchLike, FetchResponseLike } from "../../src/template/fetch.ts";
import { pageRecordId, SCRAPE_LIMITS, type PageRecord } from "../../src/template/record.ts";

const FROZEN_NOW = "2026-10-30T20:00:00.000Z";

function response(
  body: string,
  init: { status?: number; contentType?: string } = {},
): FetchResponseLike {
  const status = init.status ?? 200;
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-type" ? (init.contentType ?? "text/html") : null;
      },
    },
    async text() {
      return body;
    },
  };
}

function pageHtml(title: string, description = ""): string {
  return `<!doctype html><html><head>
    <title>${title}</title>
    <meta name="description" content="${description}" />
  </head><body>${description}</body></html>`;
}

async function readJsonl(outDir: string): Promise<PageRecord[]> {
  const body = await readFile(resolveStreamPath({ outDir }), "utf-8");
  return body.trimEnd().split("\n").map((line) => JSON.parse(line) as PageRecord);
}

describe("template/scrape.ts", () => {
  it("exports scrape", () => {
    expect(typeof scrape).toBe("function");
  });

  it("fetches, extracts, redacts, and streams PageRecords to outDir", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "unjobbed-scrape-"));
    const calls: string[] = [];
    const fetch: FetchLike = async (url) => {
      calls.push(url);
      if (url.endsWith("/robots.txt")) return response("");
      return response(pageHtml("Contact help@example.com", "Call 415-555-0100 for details."));
    };

    const result = await scrape(["https://example.com/page"], {
      fetch,
      outDir,
      now: FROZEN_NOW,
    });

    expect(result.errors).toEqual([]);
    expect(calls).toEqual(["https://example.com/robots.txt", "https://example.com/page"]);
    expect(result.records).toHaveLength(1);
    expect(result.records[0]).toEqual({
      schemaVersion: 1,
      id: pageRecordId("https://example.com/page"),
      url: "https://example.com/page",
      title: "Contact [redacted]",
      text: "Contact [redacted] Call [redacted] for details.",
      kind: "WebPage",
      extractedBy: "excerpt",
      terms: "public-page",
      retrievedAt: FROZEN_NOW,
    });
    expect(await readJsonl(outDir)).toEqual(result.records);
  });

  it("returns denied fetch errors without fetching a disallowed page", async () => {
    const fetch: FetchLike = async (url) => {
      if (url.endsWith("/robots.txt")) {
        return response("User-agent: *\nDisallow: /private\n");
      }
      throw new Error("page should not be fetched");
    };

    const result = await scrape(["https://example.com/private/page"], {
      fetch,
      outDir: await mkdtemp(path.join(os.tmpdir(), "unjobbed-scrape-denied-")),
      now: FROZEN_NOW,
    });

    expect(result.records).toEqual([]);
    expect(result.errors).toEqual([
      {
        url: "https://example.com/private/page",
        class: "denied",
        message: "Denied by robots.txt",
        nextAction: "none",
        route: "direct",
        status: undefined,
      },
    ] satisfies ScrapeError[]);
  });

  it("reports challenge pages and keeps the route direct", async () => {
    const challenge = `${"<html><title>Just a moment</title><body>".padEnd(60, "x")}
      verify you are human before continuing</body></html>`;
    const fetch: FetchLike = async (url) => {
      if (url.endsWith("/robots.txt")) return response("");
      return response(challenge);
    };

    const result = await scrape(["https://blocked.example.com"], {
      fetch,
      outDir: await mkdtemp(path.join(os.tmpdir(), "unjobbed-scrape-challenge-")),
      now: FROZEN_NOW,
    });

    expect(result.records).toEqual([]);
    expect(result.errors[0]).toMatchObject({
      url: "https://blocked.example.com/",
      class: "challenge",
      nextAction: "stop",
      route: "direct",
      status: 200,
    });
  });

  it("reports empty pages without writing a record", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "unjobbed-scrape-empty-"));
    const fetch: FetchLike = async (url) => {
      if (url.endsWith("/robots.txt")) return response("");
      return response("   ");
    };

    const result = await scrape(["https://empty.example.com"], {
      fetch,
      outDir,
      now: FROZEN_NOW,
    });

    expect(result.records).toEqual([]);
    expect(result.errors[0]).toMatchObject({
      url: "https://empty.example.com/",
      class: "empty",
      nextAction: "save-fixture",
      route: "direct",
    });
    await expect(readFile(resolveStreamPath({ outDir }), "utf-8")).rejects.toThrow();
  });

  it("caps input pages using SCRAPE_LIMITS", async () => {
    const outDir = await mkdtemp(path.join(os.tmpdir(), "unjobbed-scrape-cap-"));
    const pageCalls: string[] = [];
    const urls = Array.from(
      { length: SCRAPE_LIMITS.maxPages + 1 },
      (_, i) => `https://cap${i}.example.com/page`,
    );
    const fetch: FetchLike = async (url) => {
      if (url.endsWith("/robots.txt")) return response("");
      pageCalls.push(url);
      return response(pageHtml(url));
    };

    const result = await scrape(urls, { fetch, outDir, now: FROZEN_NOW });

    expect(result.records).toHaveLength(SCRAPE_LIMITS.maxPages);
    expect(pageCalls).toHaveLength(SCRAPE_LIMITS.maxPages);
    expect(pageCalls).not.toContain(urls.at(-1));
    expect(result.errors).toContainEqual({
      url: urls[SCRAPE_LIMITS.maxPages],
      class: "quota",
      message: `Stopped after ${SCRAPE_LIMITS.maxPages} pages`,
      nextAction: "none",
      route: "direct",
    });
  });
});
