import type { PageRecord } from "../template/record.ts";

/** Max full records written to the Apify `OUTPUT` key-value entry. */
export const OUTPUT_RECORD_CAP = 50;

/** Max records embedded in {@link ContextFile}. */
export const CONTEXT_RECORD_CAP = 20;

/** Max length for `text` in context records. */
export const CONTEXT_FIELD_MAX = 500;

export type ContextSummary = {
  totalOutput: number;
  perSource: Record<string, number>;
  errors: Record<string, string[]>;
  seenTruncated: boolean;
  finishedAt: string;
};

export type ContextFile = {
  summary: ContextSummary;
  records: PageRecord[];
};

export type BuildSummaryInput = {
  totalOutput: number;
  perSource: Record<string, number>;
  errors: Record<string, string[]>;
  seenTruncated: boolean;
  finishedAt: string;
};

/** Build the summary object stored as `SUMMARY` and inside {@link ContextFile}. */
export function buildSummary(input: BuildSummaryInput): ContextSummary {
  return {
    totalOutput: input.totalOutput,
    perSource: { ...input.perSource },
    errors: Object.fromEntries(
      Object.entries(input.errors).map(([key, messages]) => [key, [...messages]]),
    ),
    seenTruncated: input.seenTruncated,
    finishedAt: input.finishedAt,
  };
}

/** First {@link OUTPUT_RECORD_CAP} records, unchanged. */
export function buildOutput(records: readonly PageRecord[]): PageRecord[] {
  return records.slice(0, OUTPUT_RECORD_CAP).map((record) => ({ ...record }));
}

function truncateContextField(value: string): string {
  if (value.length <= CONTEXT_FIELD_MAX) {
    return value;
  }
  return value.slice(0, CONTEXT_FIELD_MAX);
}

function truncateRecordForContext(record: PageRecord): PageRecord {
  return {
    ...record,
    text: truncateContextField(record.text),
  };
}

export type BuildContextInput = BuildSummaryInput;

/**
 * Build {@link ContextFile}: summary plus the first {@link CONTEXT_RECORD_CAP} records
 * with long `text` cut to {@link CONTEXT_FIELD_MAX} characters.
 * `url`, `retrievedAt`, `extractedBy`, and `terms` are never cut.
 */
export function buildContext(
  records: readonly PageRecord[],
  summaryInput: BuildContextInput,
): ContextFile {
  return {
    summary: buildSummary(summaryInput),
    records: records.slice(0, CONTEXT_RECORD_CAP).map(truncateRecordForContext),
  };
}
