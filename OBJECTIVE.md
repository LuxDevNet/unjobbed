# Objective

Unjobbed is the Craw jobs plugin. `unjobbed scrape` runs through the local Craw host. The jobs pipeline (`unjobbed run`) defaults to the cold group of 13 public APIs and feeds. The pipeline normalizes, dedupes, and scores the jobs it collects. No third-party actors and no per-result fees. This Actor stays private. It is not a Store listing.

## Problems solved

- One input (`keywords`, `location`, salary, remote, recency) is translated into each board's native filters.
- Jobs are deduped by company, title, and city across boards. Salaries are annualized and relative dates become ISO.
- Needs-route boards (LinkedIn, Indeed, and similar) stay off the default list until `sources` names them and `residentialOptIn` is true. `APIFY_TOKEN` alone does not unlock them.

## Features

- `unjobbed scrape` over the local Craw host. Writes `stream.jsonl`, `CONTEXT.json`, and `CARD.json`. Scrape does not need Apify, Crawlee, or Playwright.
- `unjobbed run` on the cold group: RemoteOK, Remotive, Himalayas, We Work Remotely, Hacker News "Who is hiring", Greenhouse, Lever, Ashby, SmartRecruiters, Jobvite, Workable, Breezy, and Recruitee.
- Normalize, dedupe, and score. Each row has a 0–100 score and `scoreReasons`.
- Opt-in needs-route boards, including Dice, Wellfound, BuiltIn, LinkedIn, Indeed, Glassdoor, Upwork, ZipRecruiter, Monster, and SimplyHired. Those boards are planned, not the default.

Constraints and the publish block are in [docs/ISSUES.md](docs/ISSUES.md), [docs/TODO.md](docs/TODO.md), and [docs/PLAN.md](docs/PLAN.md). Hosting is [docs/hosting.md](docs/hosting.md). The changelog is [docs/CHANGELOG.csv](docs/CHANGELOG.csv). Theme tokens are [docs/ludvig.json](docs/ludvig.json). The map is [spine/SPINE.md](spine/SPINE.md).
