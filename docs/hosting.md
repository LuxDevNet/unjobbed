# Hosting

Unjobbed ships the smallest host that passes the cold start: Node on a laptop, optional Docker sidecars on localhost, and a separate compose file for sharded job runs.

## Laptop (no Docker)

Install dependencies, then use the HTTP template before the full jobs pipeline.

```bash
npm install
node bin/unjobbed.js scrape https://example.com
node bin/unjobbed.js doctor
```

**`scrape`** fetches ordinary public pages over HTTP (no Playwright on the template path). It writes streaming output under `storage/` (including `INPUT.json`, `CONTEXT.json`, and the jsonl stream path the CLI prints).

**`doctor`** checks cold-start readiness without printing secrets:

| Check       | Meaning |
|------------|---------|
| `node`     | Node meets `engines.node` (>=20.12) |
| `storage`  | `./storage` is writable |
| `playwright` | Optional; warn if missing when you only need `scrape` |
| `bind`     | `SEARXNG_URL` / `FIRECRAWL_URL`, if set, must be `localhost` or `127.0.0.1` only |
| `token`    | `APIFY_TOKEN` reported as `set` or `missing` (never the value) |

Exit code is `0` when nothing fails; warnings do not fail the run.

For multi-board **`run`**, install the optional peers `crawlee`, `apify`, and `playwright` when `doctor` shows you enabled sources that need a browser. The private Actor image in `.actor/Dockerfile` is optional convenience; do not Store-list it.

## `docker-compose.tools.yml` (profiles `core` and `tools`)

This file is the local scraper image plus optional tool sidecars. It does **not** replace the jobs shard compose file.

| Profile | Services | Purpose |
|---------|----------|---------|
| `core`  | `core`   | Build from `.actor/Dockerfile`, mount `./storage` → `/storage`, `CRAWLEE_STORAGE_DIR=/storage` |
| `tools` | `searxng`, `firecrawl` | Optional localhost sidecars for later verticals (W1 does not call them from code yet) |

```bash
# Scraper container only
docker compose -f docker-compose.tools.yml --profile core up --build

# Sidecars only (or add --profile core to run both profiles)
docker compose -f docker-compose.tools.yml --profile tools up
```

The scraper process should treat tools as optional: run **`doctor`** and skip missing sidecars rather than refusing to start when `tools` is stopped.

### Published ports (localhost only)

Only these host ports are defined in compose:

| Service   | Host bind | Container | Use |
|-----------|-----------|-----------|-----|
| SearXNG   | `127.0.0.1:8888` | `8080` | Set `SEARXNG_URL=http://127.0.0.1:8888` when wired |
| Firecrawl | `127.0.0.1:3002` | `3002` | Set `FIRECRAWL_URL=http://127.0.0.1:3002` when wired |

Do not expose SearXNG or Firecrawl on `0.0.0.0` or a LAN IP; `doctor` fails with `bind public sidecar url` if those env vars point off localhost.

### SearXNG JSON format

SearXNG must have **JSON** enabled in `search.formats` (include `json`). Without it, API-style search responses will not work when client code is added.

Configuration lives in the container volume `searxng-data` mounted at `/etc/searxng`. After first start, edit settings there (or seed settings before boot) so `search.formats` lists `json` alongside your HTML format.

## `docker-compose.distributed.yml` (jobs shard only)

Keep **[docker-compose.distributed.yml](../docker-compose.distributed.yml)** as the **jobs-only** five-worker shard file. It is not merged into `docker-compose.tools.yml`.

```bash
docker compose -f docker-compose.distributed.yml up --build
```

Each worker runs `node bin/unjobbed.js run` with `--shards 5` and a distinct `--shard` index, with per-shard storage under `./storage/distributed/shard-*`. Override `KEYWORDS` and `LOCATION` via environment variables. Prefer the cold default source list unless you explicitly opt into boards that need residential routing; five workers hammering protected boards by default is the opposite of a smooth shard run.

Use **`unjobbed merge`** locally to combine shard outputs after a distributed run.

## Quick reference

| Goal | Command / file |
|------|----------------|
| Cold HTTP scrape on laptop | `node bin/unjobbed.js scrape <url>` |
| Preflight | `node bin/unjobbed.js doctor` |
| Local actor + storage volume | `docker compose -f docker-compose.tools.yml --profile core up --build` |
| SearXNG + Firecrawl on laptop | `docker compose -f docker-compose.tools.yml --profile tools up` |
| Sharded job crawl | `docker compose -f docker-compose.distributed.yml up --build` |
