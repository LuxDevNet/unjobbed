import { describe, expect, it } from "vitest";
import {
  fetchHtmlPages,
  isRobotsAllowed,
  parseRobotsTxt,
  TEMPLATE_USER_AGENT,
  type FetchLike,
  type FetchResponseLike,
} from "../../src/template/fetch.ts";
import { SCRAPE_LIMITS } from "../../src/template/record.ts";

function response(body: string, init: { status?: number; contentType?: string } = {}): FetchResponseLike {
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

describe("template fetch scheduler", () => {
  it("declares the unjobbed user agent and fetches pages without Crawlee or Playwright", async () => {
    const calls: Array<{ url: string; userAgent: string | undefined }> = [];
    const fetch: FetchLike = async (url, init) => {
      calls.push({ url, userAgent: init?.headers?.["user-agent"] });
      if (url.endsWith("/robots.txt")) return response("");
      return response("<html><title>ok</title></html>");
    };

    const result = await fetchHtmlPages(["https://example.com/page"], { fetch });

    expect(TEMPLATE_USER_AGENT).toBe("unjobbed/1.1.0");
    expect(calls.every((call) => call.userAgent === TEMPLATE_USER_AGENT)).toBe(true);
    expect(result.pages).toEqual([
      {
        url: "https://example.com/page",
        status: 200,
        html: "<html><title>ok</title></html>",
        contentType: "text/html",
      },
    ]);
    expect(result.errors).toEqual([]);
  });

  it("returns denied when robots.txt disallows the HTML page path", async () => {
    const calls: string[] = [];
    const fetch: FetchLike = async (url) => {
      calls.push(url);
      if (url.endsWith("/robots.txt")) {
        return response("User-agent: *\nDisallow: /private\n");
      }
      return response("should not fetch");
    };

    const result = await fetchHtmlPages(["https://example.com/private/page"], { fetch });

    expect(calls).toEqual(["https://example.com/robots.txt"]);
    expect(result.pages).toEqual([]);
    expect(result.errors).toEqual([
      {
        url: "https://example.com/private/page",
        class: "denied",
        message: "Denied by robots.txt",
      },
    ]);
  });

  it("retries network failures using the scrape retry limit", async () => {
    let attempts = 0;
    const fetch: FetchLike = async () => {
      attempts += 1;
      if (attempts <= SCRAPE_LIMITS.maxRequestRetries) {
        throw new Error(`boom ${attempts}`);
      }
      return response("ok");
    };

    const result = await fetchHtmlPages(["https://retry.test/page"], {
      fetch,
      honorRobots: false,
    });

    expect(attempts).toBe(SCRAPE_LIMITS.maxRequestRetries + 1);
    expect(result.pages).toHaveLength(1);
    expect(result.errors).toEqual([]);
  });

  it("limits global concurrency to the scrape concurrency limit", async () => {
    let active = 0;
    let maxActive = 0;
    const fetch: FetchLike = async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await Promise.resolve();
      active -= 1;
      return response("ok");
    };

    await fetchHtmlPages(
      [
        "https://a.test/one",
        "https://b.test/two",
        "https://c.test/three",
        "https://d.test/four",
      ],
      { fetch, honorRobots: false },
    );

    expect(maxActive).toBe(SCRAPE_LIMITS.maxConcurrency);
  });

  it("runs one request per host at a time and waits about one second between pages", async () => {
    let activeForHost = 0;
    let maxActiveForHost = 0;
    let currentTime = 0;
    const starts: number[] = [];
    const delays: number[] = [];
    const fetch: FetchLike = async () => {
      activeForHost += 1;
      maxActiveForHost = Math.max(maxActiveForHost, activeForHost);
      starts.push(currentTime);
      await Promise.resolve();
      activeForHost -= 1;
      return response("ok");
    };

    const result = await fetchHtmlPages(["https://same.test/one", "https://same.test/two"], {
      fetch,
      honorRobots: false,
      now: () => currentTime,
      delay: async (ms) => {
        delays.push(ms);
        currentTime += ms;
      },
    });

    expect(result.errors).toEqual([]);
    expect(maxActiveForHost).toBe(1);
    expect(starts).toEqual([0, 1_000]);
    expect(delays).toEqual([1_000]);
  });

  it("parses allow rules ahead of same-length disallow rules", () => {
    const groups = parseRobotsTxt("User-agent: unjobbed\nDisallow: /docs\nAllow: /docs\n");

    expect(groups).toHaveLength(1);
    expect(isRobotsAllowed("User-agent: unjobbed\nDisallow: /docs\nAllow: /docs\n", "https://x.test/docs")).toBe(
      true,
    );
  });
});
