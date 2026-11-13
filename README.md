# Unjobbed — Craw jobs plugin

```bash
node bin/unjobbed.js scrape https://example.com
```

`unjobbed scrape` runs through the local Craw host and writes `stream.jsonl`, `CONTEXT.json`, and `CARD.json`. Scrape does not need Apify, Crawlee, or Playwright.

The jobs pipeline (`unjobbed run`) defaults to the cold group (13 public APIs/feeds): RemoteOK, Remotive, Himalayas, We Work Remotely, Hacker News "Who is hiring", Greenhouse, Lever, Ashby, SmartRecruiters, Jobvite, Workable, Breezy, and Recruitee. Needs-route boards (LinkedIn, Indeed, and similar) are opt-in behind `residentialOptIn` and are not the advertised default.

The pipeline normalizes, dedupes, and scores the jobs it collects. No third-party actors and no per-result fees. This Actor stays private; it is not a Store listing.

## Sources and how each one is scraped

| Board | Method | Tier | Default |
|---|---|---|---|
| RemoteOK / Remotive / Himalayas | Public JSON APIs | HTTP | cold |
| We Work Remotely | RSS | HTTP | cold |
| HN "Who is hiring" | Latest thread via Algolia API | HTTP | cold |
| Greenhouse / Lever / Ashby / SmartRecruiters / Jobvite / Workable / Breezy / Recruitee | Company ATS APIs | HTTP | cold |
| Dice | Dice search API | HTTP | needs-route, opt-in |
| Wellfound | Server-rendered Apollo cache; browser only after opt-in | HTTP | needs-route, opt-in |
| BuiltIn | List cards + JSON-LD `JobPosting` | HTTP | needs-route, opt-in |
| LinkedIn | Public guest API + detail pages | HTTP | needs-route, opt-in |
| Indeed / Glassdoor / Upwork / ZipRecruiter / Monster / SimplyHired | Playwright + captured JSON | Browser | needs-route, opt-in |
| Any other URL | JSON-LD / embedded JSON auto-extraction | Browser | template |

The table is the method reference. Needs-route boards stay off the default list until `sources` names them **and** `residentialOptIn` is true. `APIFY_TOKEN` alone does not unlock them.

## Run locally

```bash
npm install
node bin/unjobbed.js scrape https://example.com
node bin/unjobbed.js doctor
node bin/unjobbed.js run
# results: storage/datasets/default/, summary: storage/key_value_stores/default/SUMMARY.json
```

Local scrape needs the Craw host plus `cheerio` / `tsx` / `zod`. Jobs `run` uses optional peers `crawlee`, `apify`, and `playwright` when those packages are installed. `unjobbed scrape` stays on the HTTP template.

## Optional private Actor

The Apify Actor is owner-only convenience, not a Store product. Do not Store-list it or set it public. Local scrape and local `run` do not require a platform push.

```bash
node bin/unjobbed.js run
```

## Input highlights

- `keywords`, `location`, `radiusMiles`, `postedWithinDays`, `remoteOnly`, `minSalary`, `employmentTypes`: set once and translated into each board's native filters.
- `sources`: default run source list is the cold group (13 public APIs/feeds). Needs-route boards are opt-in and also require `residentialOptIn`.
- `startUrls`: paste any board's search URL from your browser. unjobbed detects the board, strips tracking params, and uses that URL instead of the generated search. Needs-route URLs still require `residentialOptIn`.
- `companyBoards`: `greenhouse:stripe`, `lever:palantir`, `ashby:ramp` (or paste the board URL).
- `onlyNew` + `stateKey`: remembers which jobs you've already seen.
- `titleInclude` / `titleExclude` (regex) and `excludeCompanies`.
- `webhookUrl`: HTTPS only; RFC1918, link-local, loopback, and metadata hosts are rejected.

## Output (one row per unique job)

`id` (cross-board fingerprint), `title`, `company`, `location`, `workMode`, `employmentType`, `salary{min,max,period,currency,annualMin,annualMax,raw}`, `postedAt` (ISO), `url`, `applyUrl`, `description`, `skills`, `seniority`, `applicants`, `seenOn[]`, `urls{board:url}`, `score` (0–100) + `scoreReasons`, `isNew`.

Salaries are annualized: hourly ×2080, monthly ×12, and so on. Relative dates ("3 days ago", "30+ days") are converted to ISO. Jobs are deduped by company + title + city across boards and merged to fill gaps from each copy.

## Layout

```
.actor/            actor.json, input_schema.json, Dockerfile
src/main.ts        Apify Actor entry (Actor.init → jobs pipeline → Actor.exit)
src/pipeline.ts    local jobs pipeline without top-level Actor.init
src/cli.ts         scrape / doctor / run dispatch
src/registry.ts    cold group (default run) and needs-route (opt-in) source ids
src/sources.ts     one adapter per board (plan, fromUrl, handlers)
src/extractors.ts  universal JSON-LD / embedded-JSON / network-JSON job finder
src/lib/           salary, dates, text normalization, URL cleaning
```

## Adding a board

Add an id in `src/model.ts` and a `Source` in `src/sources.ts` with `plan()` and a handler. Set `tier: "browser"` if the site uses anti-bot protection. Put public APIs and feeds in the cold group; put boards that need residential routing in needs-route so they stay off the default list.

Note: respect each site's terms of service and rate limits. Needs-route boards are not on the default list. When you opt in, some guest endpoints return 429 errors at high volume; add a proxy if you plan to pull thousands of results.
