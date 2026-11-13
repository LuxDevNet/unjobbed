import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { SOURCE_IDS, type SourceId } from "../src/model.ts";
import {
  COLD_SOURCE_IDS,
  NEEDS_ROUTE_SOURCE_IDS,
  SOURCE_ROWS,
} from "../src/registry.ts";

const schemaPath = path.join(process.cwd(), ".actor/input_schema.json");
const actorSchema = JSON.parse(readFileSync(schemaPath, "utf-8")) as {
  properties: { sources: { items: { enum: string[] } } };
};

describe("registry.ts", () => {
  it("matches Apify sources enum to SOURCE_IDS", () => {
    const enumIds = actorSchema.properties.sources.items.enum;
    expect(enumIds).toEqual([...SOURCE_IDS]);
  });

  it("partitions every SOURCE_IDS entry exactly once (cold, needs-route, generic)", () => {
    const cold = new Set<string>(COLD_SOURCE_IDS);
    const needsRoute = new Set<string>(NEEDS_ROUTE_SOURCE_IDS);

    expect(cold.size).toBe(13);
    expect(needsRoute.size).toBe(11);

    for (const id of COLD_SOURCE_IDS) {
      expect(needsRoute.has(id)).toBe(false);
      expect(id).not.toBe("generic");
    }
    for (const id of NEEDS_ROUTE_SOURCE_IDS) {
      expect(cold.has(id)).toBe(false);
      expect(id).not.toBe("generic");
    }

    const union = new Set<string>([...COLD_SOURCE_IDS, ...NEEDS_ROUTE_SOURCE_IDS, "generic"]);
    expect(union.size).toBe(SOURCE_IDS.length);
    for (const id of SOURCE_IDS) {
      expect(union.has(id)).toBe(true);
    }
  });

  it("SOURCE_ROWS covers every id with matching group", () => {
    expect(SOURCE_ROWS).toHaveLength(SOURCE_IDS.length);
    const byId = new Map(SOURCE_ROWS.map((r) => [r.id, r]));

    for (const id of SOURCE_IDS) {
      const row = byId.get(id);
      expect(row, id).toBeDefined();
      if (COLD_SOURCE_IDS.includes(id as (typeof COLD_SOURCE_IDS)[number])) {
        expect(row!.group).toBe("cold");
        expect(row!.coldStart).toBe(true);
      } else if (NEEDS_ROUTE_SOURCE_IDS.includes(id as (typeof NEEDS_ROUTE_SOURCE_IDS)[number])) {
        expect(row!.group).toBe("needs-route");
        expect(row!.coldStart).toBe(false);
      } else if (id === "generic") {
        expect(row!.group).toBe("template");
        expect(row!.coldStart).toBe(false);
      }
    }

    const ids: SourceId[] = SOURCE_ROWS.map((r) => r.id);
    expect(new Set(ids).size).toBe(SOURCE_IDS.length);
  });
});
