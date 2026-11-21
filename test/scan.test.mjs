import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { scan } from '../scripts/scan.mjs';

const fixture = name => fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url));
const rules = result => [...new Set(result.findings.map(f => f.rule))].sort();

test('a bundle with the rejected patterns is flagged rule by rule', () => {
  assert.deepEqual(rules(scan(fixture('rejected'))), ['app-install-link', 'eval', 'iframe', 'intoss-private-share', 'leave-toss-domain', 'third-party-ads', 'third-party-payment']);
});

test('a clean bundle has no candidates; onDoubleClick and evaluate are not eval or ads', () => {
  const result = scan(fixture('clean'));
  assert.deepEqual(result.findings, []);
  assert.deepEqual(result.hosts.map(([host]) => host), ['api.my-app.example']);
});
