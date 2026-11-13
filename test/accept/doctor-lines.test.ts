import { describe, it, expect, vi } from "vitest";
import { runDoctor, type DoctorCheck, type DoctorFs } from "../../src/cli/doctor.ts";

const REQUIRED_CHECKS: DoctorCheck[] = ["node", "storage", "playwright", "bind", "token"];

function writableFs(): DoctorFs {
  return {
    mkdir: vi.fn(async () => undefined),
    writeFile: vi.fn(async () => undefined),
    unlink: vi.fn(async () => undefined),
  };
}

describe("accept: doctor lines", () => {
  it("runDoctor returns five DoctorLine values with the required check set", async () => {
    const lines = await runDoctor({
      nodeVersion: "v20.12.0",
      fs: writableFs(),
      cwd: "/tmp/unjobbed-accept-doctor",
      env: {},
      isPlaywrightPresent: async () => false,
    });

    expect(lines).toHaveLength(5);
    expect(lines.map((line) => line.check)).toEqual(REQUIRED_CHECKS);
    expect(new Set(lines.map((line) => line.check))).toEqual(new Set(REQUIRED_CHECKS));
  });

  it("token line detail is only set or missing and never exposes the token", async () => {
    const missing = await runDoctor({
      nodeVersion: "v22.0.0",
      fs: writableFs(),
      env: {},
      isPlaywrightPresent: async () => false,
    });
    const missingToken = missing.find((line) => line.check === "token");
    expect(missingToken?.detail).toBe("missing");

    const placeholder = "accept-test-apify-token-placeholder";
    const set = await runDoctor({
      nodeVersion: "v22.0.0",
      fs: writableFs(),
      env: { APIFY_TOKEN: placeholder },
      isPlaywrightPresent: async () => false,
    });
    const setToken = set.find((line) => line.check === "token");
    expect(setToken?.detail).toBe("set");
    expect(JSON.stringify(set)).not.toContain(placeholder);

    for (const line of [...missing, ...set]) {
      if (line.check === "token") {
        expect(["set", "missing"]).toContain(line.detail);
      }
    }
  });
});
