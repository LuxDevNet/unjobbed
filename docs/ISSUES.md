# ISSUES

This package had no issue list. The lines below are constraints its docs already state.

- Local version is 1.2.0. `@agnamo/craw` is still `file:../../Dev/004 Tier Four Projects/craw`. That path is not installable off this machine. Do not publish until craw 0.1.0 is on npm.
- The published 1.1.0 tarball bin is `src/cli.ts`. This working tree bin is `bin/unjobbed.js`. `.actor` is out of `files` and remains on disk.
- [Dependabot PR #1](https://github.com/LuxDevNet/unjobbed/pull/1) (`@vitest/mocker` 3.2.7 to 5.0.2, base `main`) stays a separate pull request. Do not merge it here. Do not retarget `origin` (`https://github.com/LuxDevNet/jobhound.git`, also named unjobbed).
- `scrape`, `doctor`, and cold-group `run` are in-progress because this dirty tree is not the published tarball.
- Needs-route boards are planned. They stay off unless sources names them and residentialOptIn is true.
- APIFY_TOKEN alone does not unlock those boards.
- docs/hosting.md says the tools sidecars are not called from code yet.
