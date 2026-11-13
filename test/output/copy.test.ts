import { describe, it, expect } from "vitest";
import { WEBHOOK_HELP } from "../../src/output/copy.ts";

describe("copy.ts", () => {
  describe("WEBHOOK_HELP", () => {
    it("exports a non-empty help string", () => {
      expect(WEBHOOK_HELP.length).toBeGreaterThan(0);
    });

    it("describes a single POST payload shape", () => {
      expect(WEBHOOK_HELP).toMatch(/summary/i);
      expect(WEBHOOK_HELP).toMatch(/records/i);
      expect(WEBHOOK_HELP).toMatch(/\{[^}]*summary[^}]*records[^}]*\}/i);
    });

    it("states delivery happens when the run finishes", () => {
      expect(WEBHOOK_HELP).toMatch(/when the run finishes|at the end|when the run ends/i);
    });

    it("does not use the word stream in help copy", () => {
      expect(WEBHOOK_HELP.toLowerCase()).not.toMatch(/\bstream\b/);
      expect(WEBHOOK_HELP.toLowerCase()).toMatch(/end-of-run|when the run finishes/i);
    });
  });
});
