import { appendPageRecord } from "../output/stream.ts";
import {
  fetchHtmlPages,
  type DelayLike,
  type FetchLike,
  type FetchPageError,
  type FetchResponseLike,
} from "./fetch.ts";
import { extractPage } from "./extract.ts";
import { isChallengeHtml } from "./probe.ts";
import { redactStringFields } from "./redact.ts";
import { SCRAPE_LIMITS, type PageRecord } from "./record.ts";

export type ScrapeErrorClass =
  | "network"
  | "empty"
  | "challenge"
  | "schema"
  | "quota"
  | "denied";

export type ScrapeError = {
  url: string;
  class: ScrapeErrorClass;
  message: string;
  nextAction: "save-fixture" | "stop" | "none";
  route: "direct";
  status?: number;
};

export type ScrapeOptions = {
  fetch: FetchLike;
  outDir?: string;
  now?: string | Date | (() => string | Date);
  delay?: DelayLike;
};

function defaultFetch(): FetchLike {
  return (url, init) => globalThis.fetch(url, init) as Promise<FetchResponseLike>;
}

function retrievedAt(now: ScrapeOptions["now"]): string | Date | undefined {
  return typeof now === "function" ? now() : now;
}

function mapFetchError(error: FetchPageError): ScrapeError {
  return {
    url: error.url,
    class: error.class,
    message: error.message,
    nextAction: "none",
    route: "direct",
    status: error.status,
  };
}

function redactRecord(record: PageRecord): PageRecord {
  const redacted = redactStringFields({
    title: record.title,
    text: record.text,
  });

  return {
    ...record,
    title: redacted.title ?? record.title,
    text: redacted.text ?? record.text,
  };
}

export async function scrape(
  urls: readonly string[],
  opts?: ScrapeOptions,
): Promise<{ records: PageRecord[]; errors: ScrapeError[] }> {
  const fetch = opts?.fetch ?? defaultFetch();
  const records: PageRecord[] = [];
  const errors: ScrapeError[] = [];
  const limitedUrls = urls.slice(0, SCRAPE_LIMITS.maxPages);

  if (urls.length > SCRAPE_LIMITS.maxPages) {
    errors.push({
      url: urls[SCRAPE_LIMITS.maxPages] ?? urls.at(-1) ?? "",
      class: "quota",
      message: `Stopped after ${SCRAPE_LIMITS.maxPages} pages`,
      nextAction: "none",
      route: "direct",
    });
  }

  const fetched = await fetchHtmlPages(limitedUrls, {
    fetch,
    delay: opts?.delay,
    maxConcurrency: SCRAPE_LIMITS.maxConcurrency,
    maxRequestRetries: SCRAPE_LIMITS.maxRequestRetries,
  });

  errors.push(...fetched.errors.map(mapFetchError));

  for (const page of fetched.pages) {
    if (records.length >= SCRAPE_LIMITS.maxRecords) {
      errors.push({
        url: page.url,
        class: "quota",
        message: `Stopped after ${SCRAPE_LIMITS.maxRecords} records`,
        nextAction: "none",
        route: "direct",
      });
      break;
    }

    if (isChallengeHtml(page.html)) {
      errors.push({
        url: page.url,
        class: "challenge",
        message: "Challenge page detected",
        nextAction: "stop",
        route: "direct",
        status: page.status,
      });
      continue;
    }

    const extracted = extractPage({
      url: page.url,
      html: page.html,
      contentType: page.contentType,
      now: retrievedAt(opts?.now),
    });

    if (!extracted) {
      errors.push({
        url: page.url,
        class: "empty",
        message: "No extractable page content",
        nextAction: "save-fixture",
        route: "direct",
        status: page.status,
      });
      continue;
    }

    try {
      const { record } = await appendPageRecord(redactRecord(extracted), {
        outDir: opts?.outDir,
      });
      records.push(record);
    } catch (error) {
      errors.push({
        url: page.url,
        class: "schema",
        message: error instanceof Error ? error.message : String(error),
        nextAction: "save-fixture",
        route: "direct",
        status: page.status,
      });
    }
  }

  return { records, errors };
}
