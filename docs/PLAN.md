# PLAN

No separate roadmap ships needs-route boards. They stay planned and opt-in, not the default. `scrape`, `doctor`, and cold-group `run` are in-progress in this dirty tree, described in `../OBJECTIVE.md`. That tree is not a release.

Local version is 1.2.0. The published tarball is still 1.1.0 with bin `src/cli.ts`. This tree's bin is `bin/unjobbed.js`. Publish only after `@agnamo/craw@0.1.0` is on npm and this dependency no longer uses `file:`.

[Dependabot PR #1](https://github.com/LuxDevNet/unjobbed/pull/1) stays on its own branch against `main`. Do not merge it into this work. Do not retarget `origin` (`https://github.com/LuxDevNet/jobhound.git`, also named unjobbed). `NO-5` remains the branch that matches `main` at `c9aa953`.
