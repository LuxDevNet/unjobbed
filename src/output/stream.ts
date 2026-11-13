import { promises as fs } from "node:fs";
import path from "node:path";
import { parsePageRecord, type PageRecord } from "../template/record.ts";

export const STREAM_FILENAME = "stream.jsonl";

/** Default jsonl path relative to {@link process.cwd}. */
export const DEFAULT_STREAM_RELATIVE = path.join(
  "storage",
  "datasets",
  "default",
  STREAM_FILENAME,
);

export type StreamPathOptions = {
  /** Full path to the jsonl file (relative paths resolve against {@link StreamPathOptions.cwd}). */
  path?: string;
  /** Storage root; file is `{outDir}/datasets/default/stream.jsonl`. */
  outDir?: string;
  /** Working directory when resolving the default or a relative {@link StreamPathOptions.path}. */
  cwd?: string;
};

export function resolveStreamPath(options: StreamPathOptions = {}): string {
  const cwd = options.cwd ?? process.cwd();

  if (options.path !== undefined) {
    return path.isAbsolute(options.path) ? options.path : path.resolve(cwd, options.path);
  }

  if (options.outDir !== undefined) {
    return path.join(options.outDir, "datasets", "default", STREAM_FILENAME);
  }

  return path.resolve(cwd, DEFAULT_STREAM_RELATIVE);
}

/** One JSONL line (including trailing newline) for a validated {@link PageRecord}. */
export function formatPageRecordLine(record: PageRecord): string {
  return `${JSON.stringify(record)}\n`;
}

/**
 * Parse {@link value} with {@link parsePageRecord}, then append one line to the stream file.
 * Creates parent directories when missing.
 */
export async function appendPageRecord(
  value: unknown,
  options: StreamPathOptions = {},
): Promise<{ record: PageRecord; path: string }> {
  const record = parsePageRecord(value);
  const filePath = resolveStreamPath(options);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.appendFile(filePath, formatPageRecordLine(record), "utf-8");
  return { record, path: filePath };
}
