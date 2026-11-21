# For AI agents

This repo helps you find what the Apps in Toss (앱인토스) mini-app review would reject before the user submits.

- Procedure: follow [`skills/apps-in-toss-rejections/SKILL.md`](skills/apps-in-toss-rejections/SKILL.md).
- Scanner: `node scripts/scan.mjs <built-web-folder>` (zero dependencies, read-only, exit 1 on a blocking candidate).
- Manual review items: [`GAPS.md`](GAPS.md). Real rejection messages and fixes: [`cases/README.md`](cases/README.md).
- Source of truth for review criteria: https://developers-apps-in-toss.toss.im/checklist/app-nongame and
  https://developers-apps-in-toss.toss.im/design/consumer-ux-guide. If the official `toss/apps-in-toss-harness`
  plugin is available, run its `launch` skill first.

Working on this repo itself: keep `scripts/scan.mjs` dependency-free, add a fixture and a test in `test/` for every
new rule (`npm test`), and summarise official guides in your own words with a link instead of copying them.
