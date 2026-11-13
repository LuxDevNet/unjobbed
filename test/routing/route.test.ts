import { describe, expect, it } from "vitest";
import { ROUTE_NAMES, resolveRoute, type RouteName } from "../../src/routing/route.ts";

describe("resolveRoute", () => {
  it("exposes the supported route names", () => {
    expect(ROUTE_NAMES).toEqual(["direct", "search", "datacenter", "residential", "custom"]);
  });

  it.each<RouteName>(["direct", "search", "datacenter", "residential", "custom"])(
    "keeps %s unchanged when the page is challenged",
    (route) => {
      expect(resolveRoute({ route, challenged: true })).toBe(route);
    },
  );

  it("defaults ordinary sources to direct", () => {
    expect(resolveRoute({ challenged: false })).toBe("direct");
  });

  it.each<RouteName>(["direct", "search", "datacenter", "residential", "custom"])(
    "keeps explicit %s route when not challenged",
    (route) => {
      expect(resolveRoute({ route, challenged: false })).toBe(route);
    },
  );

  it("always routes template scrapes direct", () => {
    expect(resolveRoute({ route: "residential", template: true, challenged: false })).toBe("direct");
    expect(resolveRoute({ route: "custom", template: true, challenged: true })).toBe("direct");
  });
});
