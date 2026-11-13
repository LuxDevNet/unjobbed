import { describe, expect, it } from "vitest";
import {
  redactFieldValue,
  redactStringFields,
  stripEmails,
  stripEmailsAndPhones,
  stripPhoneNumbers,
} from "../../src/template/redact.ts";

describe("redact.ts", () => {
  const sample = "Reach us at help@example.com or 415-555-0100 today.";

  it("strips emails and phones from plain text", () => {
    expect(stripEmails(sample)).not.toContain("help@example.com");
    expect(stripPhoneNumbers(sample)).not.toMatch(/415-555-0100/);
    expect(stripEmailsAndPhones(sample)).not.toContain("help@example.com");
    expect(stripEmailsAndPhones(sample)).not.toMatch(/415-555-0100/);
  });

  it("redactFieldValue strips PII unless the schema lists the field", () => {
    expect(redactFieldValue("bio", sample, [])).not.toContain("help@example.com");
    expect(redactFieldValue("email", sample, ["email"])).toContain("help@example.com");
    expect(redactFieldValue("phone", sample, ["phone"])).toMatch(/415-555-0100/);
    expect(redactFieldValue("bio", sample, ["phone"])).not.toMatch(/415-555-0100/);
  });

  it("redactStringFields applies per-field schema allowances", () => {
    const fields = {
      bio: sample,
      email: "owner@corp.test",
      phone: "800-555-1212",
    };
    const redacted = redactStringFields(fields, ["email", "phone"]);
    expect(redacted.bio).not.toContain("help@example.com");
    expect(redacted.email).toBe("owner@corp.test");
    expect(redacted.phone).toBe("800-555-1212");
  });
});
