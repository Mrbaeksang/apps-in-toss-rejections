#!/usr/bin/env node
// apps-in-toss-rejections scan — read-only, zero-dependency.
//
// Scans a built Apps in Toss web bundle (the folder you pass to `ait build`, e.g. dist/) for things the
// review rejects that the official toss/apps-in-toss-harness `launch-scan.sh` does not look for:
// third-party payment/ad/login SDKs, iframes, eval, leaving the Toss domain, store install links and
// intoss-private:// share links. Output lines are candidates; open the file and judge each one.
//
// Usage: node scripts/scan.mjs <build-dir> [--json]
// Exit:  0 no blocking candidate, 1 at least one blocking candidate, 2 bad usage.

import { readdirSync, readFileSync, realpathSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { extname, join, relative } from 'node:path';

const RULES = [
  {
    id: 'third-party-payment', level: 'blocking',
    why: 'Mini-apps may only use Toss Pay and in-app purchase (IAP). Another payment SDK in the bundle is rejected automatically, even if the code is never reached.',
    patterns: [/cdn\.portone\.io/i, /api\.portone\.io/i, /\.iamport\.(?:kr|co)/i, /js\.tosspayments\.com/i, /stdpay\.inicis\.com/i, /js\.stripe\.com/i, /paypal\.com\/sdk/i, /pay\.naver\.com/i, /kakaopay\.com/i, /nicepay\.co\.kr/i, /pay\.danal/i],
  },
  {
    id: 'third-party-ads', level: 'blocking',
    why: 'Only Apps in Toss in-app ads are allowed. Google Ad Manager/AdSense, Kakao AdFit and similar tags are out.',
    patterns: [/securepubads\.g\.doubleclick\.net/i, /pagead2\.googlesyndication\.com/i, /adsbygoogle/i, /googletag\.pubads/i, /t1\.daumcdn\.net\/kas/i, /ad\.adfit/i, /connect\.facebook\.net\/[^"'`\s]*\/sdk\/xfbml/i],
  },
  {
    id: 'other-login', level: 'blocking',
    why: 'With Toss login, no other login (own ID/password, Kakao, Google, Apple) may be offered.',
    patterns: [/accounts\.google\.com\/gsi/i, /developers\.kakao\.com\/sdk/i, /t1\.kakaocdn\.net\/kakao_js_sdk/i, /kauth\.kakao\.com\/oauth\/authorize/i, /appleid\.cdn-apple\.com/i, /nid\.naver\.com\/oauth2/i],
  },
  {
    id: 'iframe', level: 'blocking',
    why: 'iframes are not allowed (maps and YouTube playback are the only exceptions).',
    patterns: [/createElement\(\s*["'`]iframe["'`]\s*\)/, /<iframe[\s>]/i],
  },
  {
    id: 'eval', level: 'blocking',
    why: 'Running code received from outside (eval, new Function) is not allowed.',
    patterns: [/(?<![\w$.])eval\s*\(/, /new\s+Function\s*\(/],
  },
  {
    id: 'intoss-private-share', level: 'blocking',
    why: 'Shares must use intoss:// links (e.g. from getTossShareLink), never the intoss-private:// test link.',
    patterns: [/intoss-private:\/\//],
  },
  {
    id: 'leave-toss-domain', level: 'review',
    why: 'Navigating the mini-app itself to your own site (location.replace/assign/href to http) is rejected; content must render inside the Toss domain. External links a user needs should open with openURL.',
    patterns: [/location\.(?:replace|assign)\(\s*["'`]https?:/, /location\.href\s*=\s*["'`]https?:/],
  },
  {
    id: 'app-install-link', level: 'review',
    why: 'Do not steer users to install your own app or move to your own service. Store links are candidates.',
    patterns: [/play\.google\.com\/store\/apps/i, /apps\.apple\.com\//i, /itms-apps:\/\//i, /market:\/\/details/i],
  },
  {
    id: 'dark-theme', level: 'review',
    why: 'Mini-apps are implemented in light mode.',
    patterns: [/prefers-color-scheme\s*:\s*dark/i, /color-scheme\s*:\s*(?:light\s+)?dark/i],
  },
];

const TEXT = new Set(['.js', '.mjs', '.cjs', '.html', '.htm', '.css', '.json', '.map', '.txt', '.svg']);
const SKIP = new Set(['node_modules', '.git']);
const MAX_BYTES = 8 * 1024 * 1024;

function files(dir) {
  const out = [];
  const walk = path => {
    for (const name of readdirSync(path)) {
      if (SKIP.has(name)) continue;
      const full = join(path, name), info = statSync(full);
      if (info.isDirectory()) walk(full);
      else if (TEXT.has(extname(name).toLowerCase()) && !name.endsWith('.map') && info.size <= MAX_BYTES) out.push(full);
    }
  };
  walk(dir);
  return out;
}

function snippet(text, index, length) {
  const start = Math.max(0, index - 40), end = Math.min(text.length, index + length + 40);
  return text.slice(start, end).replace(/\s+/g, ' ');
}

function line(text, index) {
  let n = 1;
  for (let i = 0; i < index; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

export function scan(dir) {
  const findings = [];
  const hosts = new Map();
  for (const file of files(dir)) {
    const text = readFileSync(file, 'utf8');
    const rel = relative(dir, file).replaceAll('\\', '/');
    for (const rule of RULES) {
      for (const pattern of rule.patterns) {
        const global = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : pattern.flags + 'g');
        for (const match of text.matchAll(global)) {
          findings.push({ rule: rule.id, level: rule.level, file: rel, line: line(text, match.index), match: match[0], context: snippet(text, match.index, match[0].length) });
          if (findings.filter(f => f.rule === rule.id && f.file === rel).length >= 5) break;
        }
      }
    }
    if (/\.(?:m?js|cjs|html?)$/i.test(file)) {
      for (const match of text.matchAll(/https:\/\/([a-z0-9.-]+\.[a-z]{2,})/gi)) {
        const host = match[1].toLowerCase();
        hosts.set(host, (hosts.get(host) ?? 0) + 1);
      }
    }
  }
  return { findings, hosts: [...hosts.entries()].sort((a, b) => b[1] - a[1]) };
}

// Run directly, through an npm bin link, or via npx: compare real paths, not file names.
const isMain = (() => {
  try { return !!process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url)); } catch { return false; }
})();
if (isMain) {
  const args = process.argv.slice(2);
  const dir = args.find(arg => !arg.startsWith('--'));
  if (!dir) { console.error('usage: node scripts/scan.mjs <build-dir> [--json]'); process.exit(2); }
  let info;
  try { info = statSync(dir); } catch { console.error(`not found: ${dir}`); process.exit(2); }
  if (!info.isDirectory()) { console.error(`pass the build folder (e.g. dist/), not a file. An .ait bundle is not a plain zip; scan the folder it was built from.`); process.exit(2); }
  const result = scan(dir);
  const blocking = result.findings.filter(f => f.level === 'blocking');
  if (args.includes('--json')) {
    console.log(JSON.stringify({ blocking: blocking.length, ...result }, null, 2));
  } else {
    for (const rule of RULES) {
      const found = result.findings.filter(f => f.rule === rule.id);
      if (!found.length) continue;
      console.log(`\n[${rule.level}] ${rule.id} — ${rule.why}`);
      for (const f of found) console.log(`  ${f.file}:${f.line}  ${f.match}\n    … ${f.context}`);
    }
    console.log('\nExternal https hosts in scripts/HTML (check each is needed and is not your own site to navigate to):');
    for (const [host, count] of result.hosts) console.log(`  ${host} (${count})`);
    console.log(`\nscan: blocking=${blocking.length} review=${result.findings.length - blocking.length} files=${files(dir).length}`);
  }
  process.exit(blocking.length ? 1 : 0);
}
