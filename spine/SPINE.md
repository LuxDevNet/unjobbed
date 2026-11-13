# unjobbed spine

Canonical map for this package. The same lists are in `spine.json` and `spine.yaml`.

## Platforms

- Node >=20.12

## Features

- unjobbed scrape through the local Craw host (in-progress). Dirty tree, not the published tarball.
- unjobbed doctor (in-progress). Dirty tree, not the published tarball.
- unjobbed run on the cold group of 13 public APIs and feeds (in-progress). Dirty tree, not the published tarball.
- Normalize, dedupe, and score
- Needs-route boards behind residentialOptIn (planned). Not the default.
- Optional private Apify Actor, not a Store listing

## Functions

- unjobbed scrape (in-progress). Dirty working tree. This is not the published 1.1.0 tarball.
- unjobbed doctor (in-progress). Dirty working tree. This is not the published 1.1.0 tarball.
- unjobbed run (in-progress). Dirty working tree. This is not the published 1.1.0 tarball.

## Objects

- stream.jsonl, CONTEXT.json, and CARD.json
- Job row: id, title, company, location, salary, postedAt, url, score, seenOn, isNew
- Cold-group source id
- Needs-route source id gated by residentialOptIn (planned)
- Platforms: Node >=20.12
- docs/ludvig.json: strict Ludvig theme; color and font strings empty

## Connections

- unjobbed scrape → @agnamo/craw. Local host. No Apify, Crawlee, or Playwright on that path.
- unjobbed run → 13 public boards. HTTP and RSS by default. Cold-group run is in-progress in this dirty tree, not the published tarball.
- needs-route boards → Playwright or guest APIs. Planned. Off until sources and residentialOptIn are both set. Not the default.
- webhookUrl → an HTTPS endpoint. RFC1918, link-local, loopback, and metadata hosts are rejected.
- package.json → @agnamo/craw. file:../../Dev/004 Tier Four Projects/craw. Not installable off this machine. Do not publish this tree as 1.1.0.
- local bin → published 1.1.0 bin. Local bin is bin/unjobbed.js. The published tarball bin is src/cli.ts. This working tree is not that tarball.
- unjobbed → docs/ludvig.json. Strict theme file. No CSS in this repo defines colors, so the theme strings are empty.
