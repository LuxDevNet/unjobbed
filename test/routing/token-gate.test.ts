import { describe, expect, it } from "vitest";
import { checkTokenGate, type TokenGatedRouteName } from "../../src/routing/token-gate.ts";

describe("checkTokenGate", () => {
  it.each<TokenGatedRouteName>(["residential", "datacenter", "delegate"])(
    "denies %s without an Apify token and does not retry",
    (route) => {
      expect(checkTokenGate(route, false)).toEqual({
        allowed: false,
        status: "denied",
        message: "missing APIFY_TOKEN",
        retry: false,
      });
    },
  );

  it.each<TokenGatedRouteName>(["direct", "search", "custom"])(
    "allows %s without an Apify token",
    (route) => {
      expect(checkTokenGate(route, false)).toEqual({
        allowed: true,
        retry: true,
      });
    },
  );

  it.each<TokenGatedRouteName>(["direct", "search", "datacenter", "residential", "custom", "delegate"])(
    "allows %s when the token is present",
    (route) => {
      expect(checkTokenGate(route, true)).toEqual({
        allowed: true,
        retry: true,
      });
    },
  );
});
