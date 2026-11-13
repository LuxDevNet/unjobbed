import * as cheerio from "cheerio";
import { str, stripHtml, type Item } from "../lib/extract.ts";
import {
  embeddedJson,
  findJobObjects,
  genericJob,
  jsonLdBlocks,
} from "../extractors.ts";
import { cleanHtml } from "../lib/text.ts";
import {
  pageRecordId,
  type ExtractedBy,
  type PageRecord,
} from "./record.ts";

const SCHEMA_KINDS = new Set([
  "JobPosting",
  "Product",
  "Article",
  "Person",
  "Organization",
]);

export type ExtractPageInput = {
  url: string;
  html: string;
  contentType?: string | null;
  /** ISO timestamp; defaults to wall clock when omitted. */
  now?: string | Date;
};

function toIso(now?: string | Date): string {
  if (now == null) return new Date().toISOString();
  if (typeof now === "string") return now;
  return now.toISOString();
}

function localSchemaType(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.includes(":") ? raw.split(":").pop()! : raw;
  return SCHEMA_KINDS.has(name) ? name : null;
}

function schemaKind(obj: Item): string | null {
  const t = obj["@type"];
  if (typeof t === "string") return localSchemaType(t);
  if (Array.isArray(t)) {
    for (const entry of t) {
      const k = localSchemaType(String(entry));
      if (k) return k;
    }
  }
  return null;
}

function schemaText(obj: Item, kind: string): string {
  const plain = stripHtml(
    str(
      obj,
      "description",
      "articleBody",
      "text",
      "about",
      "jobDescription",
      "descriptionPlain",
      "descriptionHtml",
      "snippet",
      "summary",
    ),
  );
  if (plain) return plain;
  const title = str(obj, "headline", "name", "title", "jobTitle");
  return title ?? "";
}

function recordFromSchemaObject(
  obj: Item,
  url: string,
  extractedBy: ExtractedBy,
  retrievedAt: string,
): PageRecord | null {
  const kind = schemaKind(obj);
  if (!kind) return null;

  if (kind === "JobPosting") {
    const job = genericJob(obj, url);
    if (!job) return null;
    const text = (job.description ?? job.title ?? "").trim();
    if (!text) return null;
    return {
      schemaVersion: 1,
      id: pageRecordId(url),
      url,
      title: job.title,
      text,
      kind,
      extractedBy,
      terms: "public-page",
      retrievedAt,
    };
  }

  const title =
    str(obj, "headline", "name", "title", "legalName", "alternateName") ?? "";
  const text = schemaText(obj, kind).trim();
  if (!title.trim() && !text) return null;

  return {
    schemaVersion: 1,
    id: pageRecordId(url),
    url,
    title: title.trim() || text.slice(0, 200),
    text: text || title.trim(),
    kind,
    extractedBy,
    terms: "public-page",
    retrievedAt,
  };
}

function walkForSchemaObject(root: unknown, max = 5000): Item | null {
  const seen = new Set<unknown>();
  let found: Item | null = null;

  const walk = (v: unknown, depth: number) => {
    if (found || depth > 25 || v == null || typeof v !== "object" || seen.has(v)) return;
    seen.add(v);

    if (Array.isArray(v)) {
      for (const item of v) walk(item, depth + 1);
      return;
    }

    const o = v as Item;
    if (schemaKind(o)) {
      found = o;
      return;
    }
    for (const k of Object.keys(o)) walk(o[k], depth + 1);
  };

  walk(root, 0);
  if (found) return found;

  for (const job of findJobObjects(root, max)) {
    return job;
  }
  return null;
}

function tryJsonLd(
  html: string,
  url: string,
  retrievedAt: string,
): PageRecord | null {
  for (const block of jsonLdBlocks(html)) {
    if (typeof block !== "object" || block == null) continue;
    const hit = recordFromSchemaObject(block as Item, url, "jsonld", retrievedAt);
    if (hit) return hit;
    const nested = walkForSchemaObject(block);
    if (nested) {
      const fromNested = recordFromSchemaObject(nested, url, "jsonld", retrievedAt);
      if (fromNested) return fromNested;
    }
  }
  return null;
}

function tryEmbedded(
  html: string,
  url: string,
  retrievedAt: string,
): PageRecord | null {
  for (const blob of embeddedJson(html)) {
    const nested = walkForSchemaObject(blob);
    if (!nested) continue;
    const hit = recordFromSchemaObject(nested, url, "embedded", retrievedAt);
    if (hit) return hit;
  }
  return null;
}

function looksLikeRss(
  html: string,
  url: string,
  contentType?: string | null,
): boolean {
  const ct = (contentType ?? "").toLowerCase();
  if (
    ct.includes("application/rss") ||
    ct.includes("application/atom") ||
    ct.includes("application/xml") ||
    ct.includes("text/xml")
  ) {
    const trimmed = html.trimStart();
    if (trimmed.startsWith("<?xml") || trimmed.startsWith("<rss") || trimmed.startsWith("<feed")) {
      return true;
    }
  }
  try {
    const u = new URL(url);
    if (/\.(rss|xml|atom)$/i.test(u.pathname) || /\/feed\/?$/i.test(u.pathname)) {
      const trimmed = html.trimStart();
      return trimmed.startsWith("<rss") || trimmed.startsWith("<feed") || trimmed.includes("<channel");
    }
  } catch {
    /* ignore */
  }
  const trimmed = html.trimStart();
  return trimmed.startsWith("<rss") || trimmed.startsWith("<feed");
}

function tryRss(
  html: string,
  url: string,
  contentType: string | null | undefined,
  retrievedAt: string,
): PageRecord | null {
  if (!looksLikeRss(html, url, contentType)) return null;

  const $ = cheerio.load(html, { xml: true });
  const channelTitle = $("channel > title").first().text().trim();
  const itemTitle = $("item > title").first().text().trim() || $("entry > title").first().text().trim();
  const itemDesc =
    $("item > description").first().text().trim() ||
    $("entry > summary").first().text().trim() ||
    $("entry > content").first().text().trim();

  const title = itemTitle || channelTitle;
  const text = cleanHtml(itemDesc || channelTitle || title).trim();
  if (!title && !text) return null;

  return {
    schemaVersion: 1,
    id: pageRecordId(url),
    url,
    title: title || text.slice(0, 200),
    text: text || title,
    kind: "WebPage",
    extractedBy: "rss",
    terms: "public-page",
    retrievedAt,
  };
}

/** Last resort: document title and meta description (combined, max 500 chars). */
export function buildExcerpt(
  html: string,
  url: string,
  retrievedAt: string,
): PageRecord | null {
  const $ = cheerio.load(html);
  const title =
    $("title").first().text().trim() ||
    $('meta[property="og:title"]').attr("content")?.trim() ||
    "";
  const desc =
    $('meta[name="description"]').attr("content")?.trim() ||
    $('meta[property="og:description"]').attr("content")?.trim() ||
    "";

  let text = [title, desc].filter(Boolean).join(" ").trim();
  if (!text) {
    const body = cleanHtml($("body").text()).trim();
    if (body) text = body.length > 500 ? body.slice(0, 500) : body;
  } else if (text.length > 500) {
    text = text.slice(0, 500);
  }

  if (!title && !text) return null;

  return {
    schemaVersion: 1,
    id: pageRecordId(url),
    url,
    title: title || text.slice(0, 200) || "Untitled",
    text: text || title,
    kind: "WebPage",
    extractedBy: "excerpt",
    terms: "public-page",
    retrievedAt,
  };
}

/**
 * Local extractor waterfall: jsonld → embedded → rss → excerpt.
 * Returns null only when the HTML is empty or no title/text can be derived.
 */
export function extractPage(input: ExtractPageInput): PageRecord | null {
  const html = input.html ?? "";
  if (!html.trim()) return null;

  const retrievedAt = toIso(input.now);
  const { url, contentType } = input;

  return (
    tryJsonLd(html, url, retrievedAt) ??
    tryEmbedded(html, url, retrievedAt) ??
    tryRss(html, url, contentType, retrievedAt) ??
    buildExcerpt(html, url, retrievedAt)
  );
}
