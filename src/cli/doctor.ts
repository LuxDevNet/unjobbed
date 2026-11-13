import { createRequire } from "node:module";
import path from "node:path";
import { readFileSync } from "node:fs";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import { isLocalUrl } from "../host/bind.ts";

export type DoctorStatus = "pass" | "warn" | "fail";

export type DoctorCheck = "node" | "storage" | "playwright" | "bind" | "token";

export type DoctorLine = {
  check: DoctorCheck;
  status: DoctorStatus;
  detail: string;
};

export type DoctorFs = {
  mkdir: typeof mkdir;
  writeFile: typeof writeFile;
  unlink: typeof unlink;
};

export type RunDoctorOptions = {
  fs?: DoctorFs;
  cwd?: string;
  env?: NodeJS.ProcessEnv;
  nodeVersion?: string;
  isPlaywrightPresent?: () => Promise<boolean>;
};

const DEFAULT_NODE_MIN = "20.12";
const SIDECAR_ENV_KEYS = ["SEARXNG_URL", "FIRECRAWL_URL"] as const;

function parseVersionTuple(version: string): [number, number, number] {
  const stripped = version.trim().replace(/^v/i, "");
  const parts = stripped.split(".").map((p) => Number.parseInt(p, 10));
  return [
    Number.isFinite(parts[0]) ? parts[0]! : 0,
    Number.isFinite(parts[1]) ? parts[1]! : 0,
    Number.isFinite(parts[2]) ? parts[2]! : 0,
  ];
}

function compareVersionTuples(a: [number, number, number], b: [number, number, number]): number {
  for (let i = 0; i < 3; i++) {
    if (a[i]! !== b[i]!) return a[i]! - b[i]!;
  }
  return 0;
}

function readMinNodeFromEngines(): string {
  try {
    const require = createRequire(import.meta.url);
    const pkgPath = require.resolve("../../package.json");
    const raw = readFileSync(pkgPath, "utf8");
    const pkg = JSON.parse(raw) as { engines?: { node?: string } };
    const spec = pkg.engines?.node;
    if (typeof spec === "string") {
      const match = spec.match(/>=?\s*(\d+\.\d+(?:\.\d+)?)/);
      if (match?.[1]) return match[1];
    }
  } catch {
    // fall through
  }
  return DEFAULT_NODE_MIN;
}

function checkNode(nodeVersion: string): DoctorLine {
  const min = readMinNodeFromEngines();
  const current = parseVersionTuple(nodeVersion);
  const minimum = parseVersionTuple(min);
  if (compareVersionTuples(current, minimum) >= 0) {
    return { check: "node", status: "pass", detail: `>=${min}` };
  }
  return { check: "node", status: "fail", detail: nodeVersion.startsWith("v") ? nodeVersion : `v${nodeVersion}` };
}

async function checkStorage(fs: DoctorFs, cwd: string): Promise<DoctorLine> {
  const storageDir = path.join(cwd, "storage");
  const probe = path.join(storageDir, ".doctor-write-probe");
  try {
    await fs.mkdir(storageDir, { recursive: true });
    await fs.writeFile(probe, "ok", "utf8");
    await fs.unlink(probe);
    return { check: "storage", status: "pass", detail: "writable" };
  } catch {
    return { check: "storage", status: "fail", detail: "not writable" };
  }
}

async function defaultPlaywrightPresent(): Promise<boolean> {
  try {
    await import("playwright");
    return true;
  } catch {
    return false;
  }
}

async function checkPlaywright(isPresent: () => Promise<boolean>): Promise<DoctorLine> {
  if (await isPresent()) {
    return { check: "playwright", status: "pass", detail: "optional" };
  }
  return { check: "playwright", status: "warn", detail: "not required" };
}

function checkBind(env: NodeJS.ProcessEnv): DoctorLine {
  for (const key of SIDECAR_ENV_KEYS) {
    const raw = env[key]?.trim();
    if (!raw) continue;
    if (!isLocalUrl(raw)) {
      return { check: "bind", status: "fail", detail: "public sidecar url" };
    }
  }
  return { check: "bind", status: "pass", detail: "no public sidecar url" };
}

function checkToken(env: NodeJS.ProcessEnv): DoctorLine {
  const token = env.APIFY_TOKEN?.trim();
  const detail = token ? "set" : "missing";
  return { check: "token", status: "pass", detail };
}

export async function runDoctor(options: RunDoctorOptions = {}): Promise<DoctorLine[]> {
  const fs = options.fs ?? { mkdir, writeFile, unlink };
  const cwd = options.cwd ?? process.cwd();
  const env = options.env ?? process.env;
  const nodeVersion = options.nodeVersion ?? process.version;
  const isPlaywrightPresent = options.isPlaywrightPresent ?? defaultPlaywrightPresent;

  return [
    checkNode(nodeVersion),
    await checkStorage(fs, cwd),
    await checkPlaywright(isPlaywrightPresent),
    checkBind(env),
    checkToken(env),
  ];
}

export function formatDoctorLine(line: DoctorLine): string {
  return `${line.check} ${line.status} ${line.detail}`;
}

export function formatDoctorOutput(lines: DoctorLine[]): string {
  if (lines.length === 0) return "";
  return `${lines.map(formatDoctorLine).join("\n")}\n`;
}

/** Exit 0 when the cold path is possible; warnings do not fail. */
export function doctorExitCode(lines: DoctorLine[]): number {
  for (const line of lines) {
    if (line.status === "fail") return 1;
  }
  return 0;
}
