import { describe, it, expect, vi } from "vitest";
import { applyCliFlags } from "../src/cli/flags.ts";

describe("applyCliFlags", () => {
  it("maps --proxy to proxyConfiguration", () => {
    const out = applyCliFlags({}, { proxy: "http://127.0.0.1:8888" });
    expect(out.proxyConfiguration).toEqual({ proxyUrls: ["http://127.0.0.1:8888"] });
  });

  it("maps --residential to residentialOptIn", () => {
    const out = applyCliFlags({}, { residential: true });
    expect(out.residentialOptIn).toBe(true);
  });

  it("maps --dry-run to dryRun", () => {
    const out = applyCliFlags({}, { "dry-run": true });
    expect(out.dryRun).toBe(true);
  });

  it("sets scrapling boolean only without logging", () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    const out = applyCliFlags({}, { scrapling: true });
    expect(out.scrapling).toBe(true);
    expect(logSpy).not.toHaveBeenCalled();
    logSpy.mockRestore();
  });
});
