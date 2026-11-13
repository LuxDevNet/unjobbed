export const SEEN_ID_CAP = 50_000;

export type MergeSeenIdsResult = {
  ids: string[];
  seenTruncated: boolean;
};

/**
 * Merge prior seen ids with new ones, preserving order (existing first, then incoming).
 * Keeps the newest {@link SEEN_ID_CAP} entries. `seenTruncated` is true when the merged
 * unique list would exceed the cap before slicing.
 */
export function mergeSeenIds(
  existing: readonly string[],
  incoming: readonly string[],
): MergeSeenIdsResult {
  const merged = [...new Set([...existing, ...incoming])];
  const seenTruncated = merged.length > SEEN_ID_CAP;
  return {
    ids: merged.slice(-SEEN_ID_CAP),
    seenTruncated,
  };
}
