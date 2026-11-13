import { isNeedsRouteSource } from "../registry.ts";

export function allowNeedsRouteSource(sourceId: string, residentialOptIn: boolean): boolean {
  if (!isNeedsRouteSource(sourceId)) return true;
  return residentialOptIn;
}

export function needsRouteDeniedMessage(sourceId: string): string {
  return `${sourceId} requires residentialOptIn`;
}
