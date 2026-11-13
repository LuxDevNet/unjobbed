/** Batch size for incremental `Actor.pushData` during a run. */
export const PUSH_BATCH_SIZE = 25;

/**
 * Split {@link records} into consecutive chunks of at most {@link batchSize}.
 * The last chunk may be smaller. An empty input yields no chunks.
 */
export function chunkForPushData<T>(
  records: readonly T[],
  batchSize: number = PUSH_BATCH_SIZE,
): T[][] {
  if (batchSize <= 0) {
    throw new RangeError("batchSize must be a positive integer");
  }
  if (records.length === 0) {
    return [];
  }

  const batches: T[][] = [];
  for (let i = 0; i < records.length; i += batchSize) {
    batches.push(records.slice(i, i + batchSize) as T[]);
  }
  return batches;
}

/**
 * Take every full batch from {@link records} and leave the remainder for a later flush.
 * Useful while appending records during a crawl before the final push.
 */
export function takeFullPushBatches<T>(
  records: readonly T[],
  batchSize: number = PUSH_BATCH_SIZE,
): { batches: T[][]; remainder: T[] } {
  if (batchSize <= 0) {
    throw new RangeError("batchSize must be a positive integer");
  }

  const fullLength = Math.floor(records.length / batchSize) * batchSize;
  const batches: T[][] = [];
  for (let i = 0; i < fullLength; i += batchSize) {
    batches.push(records.slice(i, i + batchSize) as T[]);
  }
  return { batches, remainder: records.slice(fullLength) as T[] };
}
