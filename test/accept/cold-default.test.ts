import { describe, it, expect } from "vitest";
import { InputSchema } from "../../src/input.ts";
import { COLD_SOURCE_IDS } from "../../src/registry.ts";

describe("cold default sources (acceptance)", () => {
  it("defaults run input sources to COLD_SOURCE_IDS only", () => {
    const { sources } = InputSchema.parse({});

    expect(sources).toHaveLength(13);
    expect(sources).toEqual([...COLD_SOURCE_IDS]);
    expect(sources).not.toContain("linkedin");
    expect(sources).not.toContain("indeed");
  });
});
