import { describe, it, expect } from "vitest";
import {
  PUSH_BATCH_SIZE,
  chunkForPushData,
  takeFullPushBatches,
} from "../../src/output/flush.ts";

describe("flush.ts", () => {
  describe("PUSH_BATCH_SIZE", () => {
    it("is 25 for Actor.pushData batches", () => {
      expect(PUSH_BATCH_SIZE).toBe(25);
    });
  });

  describe("chunkForPushData", () => {
    it("returns no chunks for an empty list", () => {
      expect(chunkForPushData([])).toEqual([]);
    });

    it("returns one chunk when length is below the batch size", () => {
      const records = Array.from({ length: 24 }, (_, i) => i);
      expect(chunkForPushData(records)).toEqual([records]);
    });

    it("returns one full chunk of exactly 25", () => {
      const records = Array.from({ length: 25 }, (_, i) => i);
      expect(chunkForPushData(records)).toEqual([records]);
    });

    it("splits 26 records into 25 and 1", () => {
      const records = Array.from({ length: 26 }, (_, i) => i);
      expect(chunkForPushData(records)).toEqual([
        records.slice(0, 25),
        records.slice(25),
      ]);
    });

    it("splits 51 records into three chunks", () => {
      const records = Array.from({ length: 51 }, (_, i) => i);
      expect(chunkForPushData(records)).toEqual([
        records.slice(0, 25),
        records.slice(25, 50),
        records.slice(50),
      ]);
    });

    it("honors a custom batch size", () => {
      expect(chunkForPushData([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it("throws when batch size is not positive", () => {
      expect(() => chunkForPushData([1], 0)).toThrow(RangeError);
      expect(() => chunkForPushData([1], -1)).toThrow(RangeError);
    });

    it("does not mutate the input array", () => {
      const records = [1, 2, 3];
      chunkForPushData(records);
      expect(records).toEqual([1, 2, 3]);
    });
  });

  describe("takeFullPushBatches", () => {
    it("returns no batches and empty remainder when below batch size", () => {
      const records = Array.from({ length: 10 }, (_, i) => i);
      expect(takeFullPushBatches(records)).toEqual({ batches: [], remainder: records });
    });

    it("returns one batch and empty remainder at exactly 25", () => {
      const records = Array.from({ length: 25 }, (_, i) => i);
      expect(takeFullPushBatches(records)).toEqual({
        batches: [records],
        remainder: [],
      });
    });

    it("leaves a partial tail after taking full batches", () => {
      const records = Array.from({ length: 30 }, (_, i) => i);
      expect(takeFullPushBatches(records)).toEqual({
        batches: [records.slice(0, 25)],
        remainder: records.slice(25),
      });
    });

    it("takes multiple full batches and keeps the remainder", () => {
      const records = Array.from({ length: 55 }, (_, i) => i);
      expect(takeFullPushBatches(records)).toEqual({
        batches: [records.slice(0, 25), records.slice(25, 50)],
        remainder: records.slice(50),
      });
    });

    it("throws when batch size is not positive", () => {
      expect(() => takeFullPushBatches([1], 0)).toThrow(RangeError);
    });
  });
});
