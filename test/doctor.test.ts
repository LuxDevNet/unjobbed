import { describe, it, expect, vi } from "vitest";
import {
  runDoctor,
  formatDoctorLine,
  formatDoctorOutput,
  doctorExitCode,
  type DoctorFs,
  type DoctorLine,
} from "../src/cli/doctor.ts";

function makeFs(writable: boolean): DoctorFs {
  return {
    mkdir: vi.fn(async () => undefined),
    writeFile: writable
      ? vi.fn(async () => undefined)
      : vi.fn(async () => {
          throw new Error("EACCES");
        }),
    unlink: vi.fn(async () => undefined),
  };
}

const baseEnv: NodeJS.ProcessEnv = {};

describe("doctor", () => {
  describe("runDoctor", () => {
    it("returns five checks in order with cold-path defaults", async () => {
      const lines = await runDoctor({
        nodeVersion: "v20.12.0",
        fs: makeFs(true),
        cwd: "/tmp/unjobbed-test",
        env: baseEnv,
        isPlaywrightPresent: async () => false,
      });

      expect(lines.map((l) => l.check)).toEqual(["node", "storage", "playwright", "bind", "token"]);
      expect(lines[0]).toEqual({ check: "node", status: "pass", detail: ">=20.12" });
      expect(lines[1]).toEqual({ check: "storage", status: "pass", detail: "writable" });
      expect(lines[2]).toEqual({ check: "playwright", status: "warn", detail: "not required" });
      expect(lines[3]).toEqual({ check: "bind", status: "pass", detail: "no public sidecar url" });
      expect(lines[4]).toEqual({ check: "token", status: "pass", detail: "missing" });
    });

    it("fails node below engines minimum", async () => {
      const lines = await runDoctor({
        nodeVersion: "v20.11.0",
        fs: makeFs(true),
        env: baseEnv,
        isPlaywrightPresent: async () => false,
      });
      expect(lines[0]).toEqual({ check: "node", status: "fail", detail: "v20.11.0" });
    });

    it("fails storage when write probe fails", async () => {
      const lines = await runDoctor({
        nodeVersion: "v22.0.0",
        fs: makeFs(false),
        env: baseEnv,
        isPlaywrightPresent: async () => false,
      });
      expect(lines[1]).toEqual({ check: "storage", status: "fail", detail: "not writable" });
    });

    it("passes playwright when present", async () => {
      const lines = await runDoctor({
        nodeVersion: "v22.0.0",
        fs: makeFs(true),
        env: baseEnv,
        isPlaywrightPresent: async () => true,
      });
      expect(lines[2]).toEqual({ check: "playwright", status: "pass", detail: "optional" });
    });

    it("fails bind when a sidecar URL is public", async () => {
      const lines = await runDoctor({
        nodeVersion: "v22.0.0",
        fs: makeFs(true),
        env: { SEARXNG_URL: "https://example.com/search" },
        isPlaywrightPresent: async () => false,
      });
      expect(lines[3]).toEqual({ check: "bind", status: "fail", detail: "public sidecar url" });
    });

    it("passes bind for localhost sidecar URLs", async () => {
      const lines = await runDoctor({
        nodeVersion: "v22.0.0",
        fs: makeFs(true),
        env: {
          SEARXNG_URL: "http://127.0.0.1:8888",
          FIRECRAWL_URL: "http://localhost:3002",
        },
        isPlaywrightPresent: async () => false,
      });
      expect(lines[3]).toEqual({ check: "bind", status: "pass", detail: "no public sidecar url" });
    });

    it("reports token as set without exposing the value", async () => {
      const secret = "apify_api_super_secret_value";
      const lines = await runDoctor({
        nodeVersion: "v22.0.0",
        fs: makeFs(true),
        env: { APIFY_TOKEN: secret },
        isPlaywrightPresent: async () => false,
      });
      expect(lines[4]).toEqual({ check: "token", status: "pass", detail: "set" });
      const serialized = JSON.stringify(lines);
      expect(serialized).not.toContain(secret);
    });
  });

  describe("formatDoctorOutput", () => {
    it("prints check status detail lines", () => {
      const lines: DoctorLine[] = [
        { check: "node", status: "pass", detail: ">=20.12" },
        { check: "token", status: "pass", detail: "missing" },
      ];
      expect(formatDoctorLine(lines[0]!)).toBe("node pass >=20.12");
      expect(formatDoctorOutput(lines)).toBe("node pass >=20.12\ntoken pass missing\n");
    });
  });

  describe("doctorExitCode", () => {
    it("returns 0 when only warnings or token missing", () => {
      const lines: DoctorLine[] = [
        { check: "node", status: "pass", detail: ">=20.12" },
        { check: "storage", status: "pass", detail: "writable" },
        { check: "playwright", status: "warn", detail: "not required" },
        { check: "bind", status: "pass", detail: "no public sidecar url" },
        { check: "token", status: "pass", detail: "missing" },
      ];
      expect(doctorExitCode(lines)).toBe(0);
    });

    it("returns 1 on any fail status", () => {
      expect(
        doctorExitCode([
          { check: "node", status: "fail", detail: "v18.0.0" },
          { check: "storage", status: "pass", detail: "writable" },
          { check: "playwright", status: "warn", detail: "not required" },
          { check: "bind", status: "pass", detail: "no public sidecar url" },
          { check: "token", status: "pass", detail: "missing" },
        ]),
      ).toBe(1);

      expect(
        doctorExitCode([
          { check: "node", status: "pass", detail: ">=20.12" },
          { check: "storage", status: "pass", detail: "writable" },
          { check: "playwright", status: "warn", detail: "not required" },
          { check: "bind", status: "fail", detail: "public sidecar url" },
          { check: "token", status: "pass", detail: "set" },
        ]),
      ).toBe(1);
    });
  });
});
