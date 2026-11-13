const METADATA_HOSTS = new Set([
  "metadata.google.internal",
  "metadata.goog",
  "metadata.internal",
  "instance-data",
  "kubernetes.default.svc",
]);

function ipv4Parts(hostname: string): [number, number, number, number] | null {
  const match = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/.exec(hostname);
  if (!match) return null;
  const parts = match.slice(1).map(Number);
  if (parts.length !== 4 || parts.some((part) => part === undefined || part > 255)) return null;
  return parts as [number, number, number, number];
}

function isBlockedIpv4(hostname: string): boolean {
  const parts = ipv4Parts(hostname);
  if (!parts) return false;
  const [a, b] = parts;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  return false;
}

function isBlockedIpv6(hostname: string): boolean {
  const host = hostname.replace(/^\[|\]$/g, "").toLowerCase();
  if (host === "::1" || host === "0:0:0:0:0:0:0:1") return true;
  if (host.startsWith("fe80:")) return true;
  if (host.startsWith("fc") || host.startsWith("fd")) return true;
  if (host === "::ffff:127.0.0.1") return true;
  const v4Mapped = host.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (v4Mapped?.[1] && isBlockedIpv4(v4Mapped[1])) return true;
  return false;
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  if (host === "localhost" || host.endsWith(".localhost")) return true;
  if (METADATA_HOSTS.has(host)) return true;
  if (isBlockedIpv4(host) || isBlockedIpv6(host)) return true;
  return false;
}

export function validateWebhookUrl(value: string): { ok: true; url: URL } | { ok: false; error: string } {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return { ok: false, error: "invalid webhook URL" };
  }
  if (url.protocol !== "https:") {
    return { ok: false, error: "webhookUrl must be HTTPS" };
  }
  if (url.username || url.password) {
    return { ok: false, error: "webhookUrl must not include credentials" };
  }
  if (isBlockedHostname(url.hostname)) {
    return { ok: false, error: "webhookUrl host is blocked" };
  }
  return { ok: true, url };
}
