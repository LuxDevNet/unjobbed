import { describe, expect, it } from "vitest";
import { validateWebhookUrl } from "../../src/lib/webhook.ts";
import { sendWebhook } from "../../src/lib/export.ts";

describe("validateWebhookUrl", () => {
  it("accepts public HTTPS URLs", () => {
    const result = validateWebhookUrl("https://hooks.example.com/jobs");
    expect(result.ok).toBe(true);
  });

  it("rejects HTTP", () => {
    const result = validateWebhookUrl("http://hooks.example.com/jobs");
    expect(result).toEqual({ ok: false, error: "webhookUrl must be HTTPS" });
  });

  it("rejects RFC1918, link-local, loopback, and metadata hosts", () => {
    expect(validateWebhookUrl("https://192.168.1.10/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://10.0.0.8/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://172.16.0.1/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://169.254.169.254/latest/meta-data").ok).toBe(false);
    expect(validateWebhookUrl("https://127.0.0.1/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://localhost/hook").ok).toBe(false);
    expect(validateWebhookUrl("https://metadata.google.internal/").ok).toBe(false);
  });
});

describe("sendWebhook", () => {
  it("does not fetch blocked webhook hosts", async () => {
    const result = await sendWebhook("https://192.168.0.5/exfil", { summary: {}, jobs: [] });
    expect(result.success).toBe(false);
    expect(result.error).toBe("webhookUrl host is blocked");
  });
});
