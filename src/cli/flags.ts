/** Merge run-command CLI flags into an input object (pure; no side effects). */
export function applyCliFlags(
  input: Record<string, unknown>,
  flags: Record<string, unknown>,
): Record<string, unknown> {
  const out = { ...input };

  if (flags.proxy != null && flags.proxy !== true) {
    out.proxyConfiguration = { proxyUrls: [String(flags.proxy)] };
  }

  if (flags.residential) {
    out.residentialOptIn = true;
  }

  if (flags["dry-run"]) {
    out.dryRun = true;
  }

  if (flags.scrapling) {
    out.scrapling = true;
  }

  return out;
}
