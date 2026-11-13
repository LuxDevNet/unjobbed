import { mkdtemp, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { pageRecordId } from "../../src/template/record.ts";
import {
  DEFAULT_STREAM_RELATIVE,
  STREAM_FILENAME,
  appendPageRecord,
  formatPageRecordLine,
  resolveStreamPath,
} from "../../src/output/stream.ts";

function sampleRecord(overrides: Partial<Record<string, unknown>> = {}) {
  const id = pageRecordId("https://example.com");
  return {
    schemaVersion: 1,
    id,
    url: "https://example.com",
    title: "Example Domain",
    text: "Example Domain",
    kind: "WebPage",
    extractedBy: "excerpt",
    terms: "public-page",
    retrievedAt: "2026-10-30T20:00:00.000Z",
    ...overrides,
  };
}

describe("stream.ts", () => {
  describe("resolveStreamPath", () => {
    it("defaults to storage/datasets/default/stream.jsonl under cwd", () => {
      const cwd = path.join(os.tmpdir(), "unjobbed-stream-cwd");
      expect(resolveStreamPath({ cwd })).toBe(
        path.resolve(cwd, DEFAULT_STREAM_RELATIVE),
      );
      expect(DEFAULT_STREAM_RELATIVE).toContain(STREAM_FILENAME);
    });

    it("places the file under outDir datasets/default", () => {
      const outDir = path.join(os.tmpdir(), "custom-storage");
      expect(resolveStreamPath({ outDir })).toBe(
        path.join(outDir, "datasets", "default", STREAM_FILENAME),
      );
    });

    it("honors an explicit absolute path", () => {
      const file = path.join(os.tmpdir(), "explicit", "lines.jsonl");
      expect(resolveStreamPath({ path: file })).toBe(file);
    });

    it("resolves a relative explicit path against cwd", () => {
      const cwd = path.join(os.tmpdir(), "rel-cwd");
      expect(resolveStreamPath({ cwd, path: "out/stream.jsonl" })).toBe(
        path.resolve(cwd, "out/stream.jsonl"),
      );
    });
  });

  describe("formatPageRecordLine", () => {
    it("serializes one record as a single JSON line with newline", () => {
      const record = sampleRecord();
      const line = formatPageRecordLine(record as never);
      expect(line.endsWith("\n")).toBe(true);
      expect(line.trim()).toBe(JSON.stringify(record));
    });
  });

  describe("appendPageRecord", () => {
    it("writes one jsonl line after PageRecord parses", async () => {
      const outDir = await mkdtemp(path.join(os.tmpdir(), "unjobbed-stream-"));
      const row = sampleRecord();
      const { record, path: filePath } = await appendPageRecord(row, { outDir });

      expect(record).toEqual(row);
      expect(filePath).toBe(resolveStreamPath({ outDir }));
      const body = await readFile(filePath, "utf-8");
      expect(body).toBe(formatPageRecordLine(record));
      expect(JSON.parse(body.trim())).toEqual(row);
    });

    it("appends multiple lines in order", async () => {
      const filePath = path.join(
        await mkdtemp(path.join(os.tmpdir(), "unjobbed-stream-append-")),
        "stream.jsonl",
      );
      const first = sampleRecord({ url: "https://example.com/a", title: "A" });
      const second = sampleRecord({
        url: "https://example.com/b",
        title: "B",
        id: pageRecordId("https://example.com/b"),
      });

      await appendPageRecord(first, { path: filePath });
      await appendPageRecord(second, { path: filePath });

      const lines = (await readFile(filePath, "utf-8")).trimEnd().split("\n");
      expect(lines).toHaveLength(2);
      expect(JSON.parse(lines[0]!)).toEqual(first);
      expect(JSON.parse(lines[1]!)).toEqual(second);
    });

    it("rejects invalid records before writing", async () => {
      const filePath = path.join(
        await mkdtemp(path.join(os.tmpdir(), "unjobbed-stream-invalid-")),
        "stream.jsonl",
      );
      await expect(
        appendPageRecord({ ...sampleRecord(), extractedBy: "firecrawl" }, { path: filePath }),
      ).rejects.toThrow();
      await expect(readFile(filePath, "utf-8")).rejects.toThrow();
    });
  });
});
