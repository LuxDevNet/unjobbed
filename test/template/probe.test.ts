import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { isChallengeHtml } from "../../src/template/probe.ts";

const fixtureDir = dirname(fileURLToPath(import.meta.url));
const challengeHtml = readFileSync(join(fixtureDir, "../fixtures/probe-challenge.html"), "utf8");

describe("probe.ts", () => {
  it("isChallengeHtml returns false for short or normal content", () => {
    expect(isChallengeHtml("")).toBe(false);
    expect(isChallengeHtml("<html><title>Hello</title><body>ok</body></html>")).toBe(false);
  });

  it("isChallengeHtml detects block-page HTML from fixture", () => {
    expect(isChallengeHtml(challengeHtml)).toBe(true);
  });

  it("isChallengeHtml matches known challenge markers", () => {
    const body = "x".repeat(60) + " verify you are human " + "y".repeat(10);
    expect(isChallengeHtml(body)).toBe(true);
  });
});
