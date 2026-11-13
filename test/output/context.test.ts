import { describe, it, expect } from "vitest";
import type { PageRecord } from "../../src/template/record.ts";
import {
  buildSummary,
  buildOutput,
  buildContext,
  CONTEXT_FIELD_MAX,
  CONTEXT_RECORD_CAP,
  OUTPUT_RECORD_CAP,
} from "../../src/output/context.ts";

const FINISHED_AT = "2026-10-30T20:00:00.000Z";

function makeRecord(overrides: Partial<PageRecord> & Pick<PageRecord, "id">): PageRecord {
  return {
    schemaVersion: 1,
    url: "https://example.com/page",
    title: "Title",
    text: "Body text",
    kind: "WebPage",
    extractedBy: "excerpt",
    terms: "public-page",
    retrievedAt: FINISHED_AT,
    ...overrides,
  };
}

function longText(length: number): string {
  return "x".repeat(length);
}

describe("context.ts", () => {
  describe("constants", () => {
    it("defines output and context caps", () => {
      expect(OUTPUT_RECORD_CAP).toBe(50);
      expect(CONTEXT_RECORD_CAP).toBe(20);
      expect(CONTEXT_FIELD_MAX).toBe(500);
    });
  });

  describe("buildSummary", () => {
    it("returns a shallow copy of summary fields", () => {
      const perSource = { generic: 3 };
      const errors = { generic: ["https://a.test → denied"] };
      const summary = buildSummary({
        totalOutput: 3,
        perSource,
        errors,
        seenTruncated: true,
        finishedAt: FINISHED_AT,
      });

      expect(summary).toEqual({
        totalOutput: 3,
        perSource: { generic: 3 },
        errors: { generic: ["https://a.test → denied"] },
        seenTruncated: true,
        finishedAt: FINISHED_AT,
      });

      perSource.generic = 99;
      errors.generic.push("mutated");
      expect(summary.perSource.generic).toBe(3);
      expect(summary.errors.generic).toEqual(["https://a.test → denied"]);
    });

    it("does not recompute seenTruncated", () => {
      const summary = buildSummary({
        totalOutput: 0,
        perSource: {},
        errors: {},
        seenTruncated: true,
        finishedAt: FINISHED_AT,
      });
      expect(summary.seenTruncated).toBe(true);
    });
  });

  describe("buildOutput", () => {
    it("returns at most 50 full records", () => {
      const records = Array.from({ length: 60 }, (_, i) =>
        makeRecord({
          id: String(i).padStart(16, "0"),
          url: `https://example.com/${i}`,
          text: longText(800),
        }),
      );

      const output = buildOutput(records);
      expect(output).toHaveLength(50);
      expect(output[0]?.text).toHaveLength(800);
      expect(output[49]?.url).toBe("https://example.com/49");
      expect(output[49]?.text).toHaveLength(800);
    });

    it("does not mutate the input array or records", () => {
      const record = makeRecord({ id: "abc123", text: "short" });
      const records = [record];
      buildOutput(records);
      expect(records[0]).toBe(record);
      expect(record.text).toBe("short");
    });
  });

  describe("buildContext", () => {
    it("includes summary and at most 20 truncated records", () => {
      const records = Array.from({ length: 25 }, (_, i) =>
        makeRecord({
          id: String(i).padStart(16, "0"),
          url: `https://example.com/${i}`,
          text: longText(600 + i),
        }),
      );

      const ctx = buildContext(records, {
        totalOutput: 25,
        perSource: { template: 25 },
        errors: {},
        seenTruncated: false,
        finishedAt: FINISHED_AT,
      });

      expect(ctx.summary.totalOutput).toBe(25);
      expect(ctx.records).toHaveLength(CONTEXT_RECORD_CAP);
      expect(ctx.records[0]?.text).toHaveLength(CONTEXT_FIELD_MAX);
      expect(ctx.records[19]?.text).toHaveLength(CONTEXT_FIELD_MAX);
    });

    it("never cuts url, retrievedAt, extractedBy, or terms", () => {
      const longUrl = `https://example.com/${"path/".repeat(80)}`;
      const record = makeRecord({
        id: "feeddeadbeef0001",
        url: longUrl,
        text: longText(900),
        extractedBy: "jsonld",
        terms: "public-page",
        retrievedAt: "2026-01-02T03:04:05.678Z",
      });

      const ctx = buildContext([record], {
        totalOutput: 1,
        perSource: { generic: 1 },
        errors: {},
        seenTruncated: false,
        finishedAt: FINISHED_AT,
      });

      const row = ctx.records[0]!;
      expect(row.url).toBe(longUrl);
      expect(row.retrievedAt).toBe("2026-01-02T03:04:05.678Z");
      expect(row.extractedBy).toBe("jsonld");
      expect(row.terms).toBe("public-page");
      expect(row.text).toHaveLength(CONTEXT_FIELD_MAX);
    });

    it("passes seenTruncated through from the caller", () => {
      const ctx = buildContext([], {
        totalOutput: 100,
        perSource: {},
        errors: {},
        seenTruncated: true,
        finishedAt: FINISHED_AT,
      });
      expect(ctx.summary.seenTruncated).toBe(true);
      expect(ctx.records).toEqual([]);
    });

    it("leaves short text unchanged", () => {
      const record = makeRecord({ id: "shorttext0000001", text: "hello" });
      const ctx = buildContext([record], {
        totalOutput: 1,
        perSource: {},
        errors: {},
        seenTruncated: false,
        finishedAt: FINISHED_AT,
      });
      expect(ctx.records[0]?.text).toBe("hello");
    });
  });
});
