import { promises as fs } from "node:fs";
import path from "node:path";

export type LogFn = (message: string, data?: Record<string, unknown>) => void;

export type JobsLog = {
  info: LogFn;
  warning: LogFn;
  error: LogFn;
  debug: LogFn;
  setLevel: (level?: number | string) => void;
  LEVELS?: { DEBUG?: number | string };
};

export type KeyValueStoreLike = {
  getValue: <T>(key: string) => Promise<T | null>;
  setValue: (key: string, value: unknown) => Promise<void>;
};

export type JobsRuntime = {
  log: JobsLog;
  createProxyConfiguration: (config: unknown) => Promise<unknown>;
  openKeyValueStore: (name: string) => Promise<KeyValueStoreLike>;
  pushData: (data: unknown) => Promise<void>;
  setValue: (key: string, value: unknown) => Promise<void>;
};

function consoleLog(): JobsLog {
  return {
    info: (message, data) => (data ? console.log(message, data) : console.log(message)),
    warning: (message, data) => (data ? console.warn(message, data) : console.warn(message)),
    error: (message, data) => (data ? console.error(message, data) : console.error(message)),
    debug: (message, data) => (data ? console.debug(message, data) : console.debug(message)),
    setLevel: () => {},
    LEVELS: { DEBUG: "DEBUG" },
  };
}

async function writeJson(filePath: string, value: unknown): Promise<void> {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf-8");
}

export async function createLocalRuntime(): Promise<JobsRuntime> {
  const kvRoot = path.resolve(process.cwd(), "storage/key_value_stores");
  const datasetDir = path.resolve(process.cwd(), "storage/datasets/default");
  let datasetIndex = 0;

  return {
    log: consoleLog(),
    async createProxyConfiguration(config) {
      if (!config || typeof config !== "object") return undefined;
      const proxyUrls = (config as { proxyUrls?: unknown }).proxyUrls;
      if (!Array.isArray(proxyUrls) || proxyUrls.length === 0) return undefined;
      const { ProxyConfiguration } = await import("crawlee");
      return new ProxyConfiguration({ proxyUrls: proxyUrls.map(String) });
    },
    async openKeyValueStore(name) {
      const dir = path.join(kvRoot, name);
      await fs.mkdir(dir, { recursive: true });
      return {
        async getValue<T>(key: string) {
          try {
            const raw = await fs.readFile(path.join(dir, `${key}.json`), "utf-8");
            return JSON.parse(raw) as T;
          } catch {
            return null;
          }
        },
        async setValue(key, value) {
          await writeJson(path.join(dir, `${key}.json`), value);
        },
      };
    },
    async pushData(data) {
      await fs.mkdir(datasetDir, { recursive: true });
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        datasetIndex += 1;
        const name = `${String(datasetIndex).padStart(9, "0")}.json`;
        await writeJson(path.join(datasetDir, name), item);
      }
    },
    async setValue(key, value) {
      await writeJson(path.join(kvRoot, "default", `${key}.json`), value);
    },
  };
}

export async function createActorRuntime(): Promise<JobsRuntime> {
  const { Actor, log } = await import("apify");
  return {
    log: {
      info: (message, data) => log.info(message, data),
      warning: (message, data) => log.warning(message, data),
      error: (message, data) => log.error(message, data),
      debug: (message, data) => log.debug(message, data),
      setLevel: (level) => {
        if (typeof level === "number") log.setLevel(level);
      },
      LEVELS: { DEBUG: log.LEVELS.DEBUG },
    },
    createProxyConfiguration: (config) => Actor.createProxyConfiguration(config as never),
    openKeyValueStore: (name) => Actor.openKeyValueStore(name) as Promise<KeyValueStoreLike>,
    pushData: (data) => Actor.pushData(data as never),
    setValue: (key, value) => Actor.setValue(key, value),
  };
}
