import { describe, expect, it } from "vitest";
import { isLocalUrl } from "../../src/host/bind.ts";

describe("isLocalUrl", () => {
  it("allows localhost URLs", () => {
    expect(isLocalUrl("http://localhost:8888")).toBe(true);
    expect(isLocalUrl("http://LOCALHOST:3002/health")).toBe(true);
  });

  it("allows 127.0.0.1 URLs", () => {
    expect(isLocalUrl("http://127.0.0.1:8888")).toBe(true);
    expect(isLocalUrl(new URL("http://127.0.0.1:3002/v1"))).toBe(true);
  });

  it("rejects every other host", () => {
    expect(isLocalUrl("http://0.0.0.0:8888")).toBe(false);
    expect(isLocalUrl("http://192.168.1.10:8888")).toBe(false);
    expect(isLocalUrl("https://example.com")).toBe(false);
    expect(isLocalUrl("http://localhost.example.com")).toBe(false);
  });

  it("rejects invalid URL strings", () => {
    expect(isLocalUrl("localhost:8888")).toBe(false);
    expect(isLocalUrl("not a url")).toBe(false);
  });
});
