import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { InputSchema } from "../src/input.ts";

const fixturesDir = path.join(process.cwd(), "test/fixtures");

describe("InputSchema modes (current schema)", () => {
  it("accepts startUrls with no keywords", () => {
    const raw = JSON.parse(readFileSync(path.join(fixturesDir, "input-scrape-minimal.json"), "utf-8"));
    const parsed = InputSchema.parse(raw);
    expect(parsed.startUrls).toEqual(["https://example.com"]);
    expect(parsed.keywords).toBe("");
  });

  it("accepts a jobs run payload like searches/san-diego-120k.json", () => {
    const raw = JSON.parse(readFileSync(path.join(fixturesDir, "input-jobs-run.json"), "utf-8"));
    const parsed = InputSchema.parse(raw);
    expect(parsed.keywords).toBe("software engineer");
    expect(parsed.location).toBe("San Diego, CA");
    expect(parsed.minSalary).toBe(120000);
    expect(parsed.sources).toEqual([
      "linkedin",
      "indeed",
      "glassdoor",
      "wellfound",
      "dice",
      "builtin",
    ]);
  });
});
