import { SOURCE_IDS, type SourceId } from "./model.ts";
import { SOURCES } from "./sources.ts";

export const COLD_SOURCE_IDS = [
  "remoteok",
  "remotive",
  "himalayas",
  "weworkremotely",
  "hackernews",
  "greenhouse",
  "lever",
  "ashby",
  "smartrecruiters",
  "jobvite",
  "workable",
  "breezy",
  "recruitee",
] as const satisfies readonly SourceId[];

export const NEEDS_ROUTE_SOURCE_IDS = [
  "linkedin",
  "indeed",
  "glassdoor",
  "upwork",
  "ziprecruiter",
  "simplyhired",
  "monster",
  "wellfound",
  "builtin",
  "dice",
  "workday",
] as const satisfies readonly SourceId[];

export type SourceGroup = "cold" | "needs-route" | "template";

export type SourceRoute = "direct" | "search" | "datacenter" | "residential" | "custom";

export type SourceTerm = "official-api" | "public-page" | "user-opt-in";

export interface SourceRow {
  id: SourceId;
  group: SourceGroup;
  vertical: "jobs" | "template";
  tier: "http" | "browser";
  route: SourceRoute;
  terms: SourceTerm[];
  rpm: number;
  retries: number;
  enabled: boolean;
  coldStart: boolean;
  owner: string;
}

const COLD_SET = new Set<string>(COLD_SOURCE_IDS);
export const NEEDS_ROUTE_SET = new Set<string>(NEEDS_ROUTE_SOURCE_IDS);

export function isNeedsRouteSource(id: string): boolean {
  return NEEDS_ROUTE_SET.has(id);
}

function groupFor(id: SourceId): SourceGroup {
  if (id === "generic") return "template";
  if (COLD_SET.has(id)) return "cold";
  if (NEEDS_ROUTE_SET.has(id)) return "needs-route";
  throw new Error(`Unknown source id for registry partition: ${id}`);
}

function routeFor(group: SourceGroup): SourceRoute {
  if (group === "needs-route") return "residential";
  return "direct";
}

function termsFor(id: SourceId, group: SourceGroup): SourceTerm[] {
  if (group === "template") return ["public-page"];
  if (group === "needs-route") return ["public-page", "user-opt-in"];
  const apiFeeds = new Set<SourceId>([
    "remoteok",
    "remotive",
    "himalayas",
    "weworkremotely",
    "hackernews",
    "greenhouse",
    "lever",
    "ashby",
    "smartrecruiters",
    "jobvite",
    "workable",
    "breezy",
    "recruitee",
  ]);
  if (apiFeeds.has(id)) return ["official-api", "public-page"];
  return ["public-page"];
}

function rowFor(id: SourceId): SourceRow {
  const group = groupFor(id);
  const tier = SOURCES[id]?.tier ?? "http";
  return {
    id,
    group,
    vertical: id === "generic" ? "template" : "jobs",
    tier,
    route: routeFor(group),
    terms: termsFor(id, group),
    rpm: group === "cold" ? 60 : 30,
    retries: group === "cold" ? 2 : 6,
    enabled: true,
    coldStart: group === "cold",
    owner: "unjobbed",
  };
}

export const SOURCE_ROWS: SourceRow[] = SOURCE_IDS.map(rowFor);
