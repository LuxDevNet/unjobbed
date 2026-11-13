const EMAIL_PATTERN =
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+/g;

/** Common phone shapes (US/international), kept conservative to limit false positives. */
const PHONE_PATTERN =
  /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}\b|\b\d{3}[\s.-]\d{3}[\s.-]\d{4}\b/g;

const REDACTED = "[redacted]";

export function stripEmails(text: string): string {
  return text.replace(EMAIL_PATTERN, REDACTED);
}

export function stripPhoneNumbers(text: string): string {
  return text.replace(PHONE_PATTERN, REDACTED);
}

/**
 * Remove emails and phone numbers from free text.
 */
export function stripEmailsAndPhones(text: string): string {
  return stripPhoneNumbers(stripEmails(text));
}

function fieldAllowsEmail(fieldName: string, schemaFields: readonly string[]): boolean {
  return schemaFields.includes(fieldName);
}

function fieldAllowsPhone(fieldName: string, schemaFields: readonly string[]): boolean {
  return schemaFields.includes(fieldName);
}

/**
 * Redact one string field. When the caller's schema lists the field (or a matching PII key),
 * that category of PII is left intact for this field.
 */
export function redactFieldValue(
  fieldName: string,
  text: string,
  schemaFields: readonly string[] = [],
): string {
  let out = text;
  if (!fieldAllowsEmail(fieldName, schemaFields)) {
    out = stripEmails(out);
  }
  if (!fieldAllowsPhone(fieldName, schemaFields)) {
    out = stripPhoneNumbers(out);
  }
  return out;
}

/** Redact all string entries; schema field names opt out of stripping for that row. */
export function redactStringFields(
  fields: Record<string, string>,
  schemaFields: readonly string[] = [],
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(fields)) {
    out[key] = redactFieldValue(key, value, schemaFields);
  }
  return out;
}
