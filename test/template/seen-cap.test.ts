import { describe, expect, it } from "vitest";
import { SEEN_ID_CAP, mergeSeenIds } from "../../src/template/seen.ts";

describe("seen.ts", () => {
  it("keeps the newest ids up to the cap", () => {
    const existing = Array.from({ length: SEEN_ID_CAP }, (_, i) => `old-${i}`);
    const incoming = ["new-a", "new-b"];
    const { ids, seenTruncated } = mergeSeenIds(existing, incoming);
    expect(seenTruncated).toBe(true);
    expect(ids).toHaveLength(SEEN_ID_CAP);
    expect(ids.at(-2)).toBe("new-a");
    expect(ids.at(-1)).toBe("new-b");
    expect(ids[0]).toBe("old-2");
  });

  it("sets seenTruncated false when under the cap", () => {
    const { ids, seenTruncated } = mergeSeenIds(["a", "b"], ["c"]);
    expect(seenTruncated).toBe(false);
    expect(ids).toEqual(["a", "b", "c"]);
  });

  it("dedupes while preserving first-seen order", () => {
    const { ids, seenTruncated } = mergeSeenIds(["a", "b"], ["b", "c"]);
    expect(seenTruncated).toBe(false);
    expect(ids).toEqual(["a", "b", "c"]);
  });
});
