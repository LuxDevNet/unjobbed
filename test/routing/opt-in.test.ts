import { describe, expect, it } from "vitest";
import { allowNeedsRouteSource, needsRouteDeniedMessage } from "../../src/routing/opt-in.ts";

describe("residentialOptIn", () => {
  it("allows cold sources without opt-in", () => {
    expect(allowNeedsRouteSource("greenhouse", false)).toBe(true);
    expect(allowNeedsRouteSource("remoteok", false)).toBe(true);
  });

  it("blocks needs-route boards without residentialOptIn", () => {
    expect(allowNeedsRouteSource("linkedin", false)).toBe(false);
    expect(allowNeedsRouteSource("indeed", false)).toBe(false);
    expect(needsRouteDeniedMessage("linkedin")).toBe("linkedin requires residentialOptIn");
  });

  it("allows needs-route boards only when opted in", () => {
    expect(allowNeedsRouteSource("linkedin", true)).toBe(true);
    expect(allowNeedsRouteSource("indeed", true)).toBe(true);
  });
});
