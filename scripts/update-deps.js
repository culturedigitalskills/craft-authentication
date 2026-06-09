#!/usr/bin/env node
'use strict';

const { spawnSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

// ── Colors ────────────────────────────────────────────────────────────────────
const C = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  red:    '\x1b[31m',
  yellow: '\x1b[33m',
  green:  '\x1b[32m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
};
const col = (s, ...cc) => cc.join('') + s + C.reset;

// ── Helpers ───────────────────────────────────────────────────────────────────
const pkgJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'package.json'), 'utf8'));
const allDeps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };

function semverSpecifier(name, version) {
  const raw = allDeps[name] || '';
  const prefix = /^[\^~]/.test(raw) ? raw[0] : '';
  return `${name}@${prefix}${version}`;
}

function resolveLatestStable(name) {
  const r = spawnSync('pnpm', ['info', name, 'versions', '--json'], {
    encoding: 'utf8',
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  let versions = [];
  try { versions = JSON.parse((r.stdout || '').trim()); } catch {}
  if (!Array.isArray(versions)) versions = versions ? [String(versions)] : [];
  const stable = versions.filter(v => !v.includes('-'));
  stable.sort((a, b) => {
    const pa = parseSemver(a), pb = parseSemver(b);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] || 0) - (pb[i] || 0);
      if (diff !== 0) return diff;
    }
    return 0;
  });
  return stable[stable.length - 1] || null;
}

// ── Fetch outdated packages ───────────────────────────────────────────────────
process.stdout.write('Checking for outdated packages…\n');

const result = spawnSync('pnpm', ['outdated', '--json'], { encoding: 'utf8', shell: false });
let outdated = {};
const raw = (result.stdout || '').trim();
if (raw) {
  try { outdated = JSON.parse(raw); } catch {
    process.stderr.write('Failed to parse pnpm outdated output.\n');
    process.exit(1);
  }
}

// ── Pin @types/node to the installed Node.js major ───────────────────────────
const nodeMajor = parseInt(process.versions.node.split('.')[0], 10);

{
  const pinVersion = () => {
    const r = spawnSync('pnpm', ['info', `@types/node@${nodeMajor}`, 'version'], { encoding: 'utf8', shell: false });
    return (r.stdout || '').trim().split('\n')[0].trim() || null;
  };

  if ('@types/node' in outdated) {
    const pinned = pinVersion();
    if (pinned) outdated['@types/node'].latest = pinned;
  } else {
    const typesNodePkg = path.join(process.cwd(), 'node_modules', '@types', 'node', 'package.json');
    let installedVersion = null;
    try { installedVersion = JSON.parse(fs.readFileSync(typesNodePkg, 'utf8')).version; } catch {}
    if (installedVersion && parseInt(installedVersion.split('.')[0], 10) !== nodeMajor) {
      const pinned = pinVersion();
      if (pinned) {
        outdated['@types/node'] = { current: installedVersion, latest: pinned, dependencyType: 'devDependencies' };
      }
    }
  }
}

// ── Resolve latest stable for packages whose reported latest is a pre-release ─
const preReleaseNames = Object.keys(outdated).filter(
  name => name !== '@types/node' && outdated[name].latest && outdated[name].latest.includes('-')
);
if (preReleaseNames.length > 0) {
  process.stdout.write(`Resolving stable versions for ${preReleaseNames.length} package${preReleaseNames.length !== 1 ? 's' : ''}…\n`);
  for (const name of preReleaseNames) {
    const stable = resolveLatestStable(name);
    if (stable && versionGt(stable, outdated[name].current)) {
      outdated[name].latest = stable;
    } else {
      delete outdated[name];
    }
  }
}

// ── Build update list ─────────────────────────────────────────────────────────
function parseSemver(v) {
  return v.replace(/^[^\d]*/, '').split('.').map(x => parseInt(x, 10) || 0);
}

function versionGt(a, b) {
  const pa = parseSemver(a), pb = parseSemver(b);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    if ((pa[i] || 0) > (pb[i] || 0)) return true;
    if ((pa[i] || 0) < (pb[i] || 0)) return false;
  }
  return false;
}

function upgradeType(cur, lat) {
  const [cMaj, cMin] = parseSemver(cur);
  const [lMaj, lMin] = parseSemver(lat);
  if (lMaj > cMaj) return 'major';
  if (lMin > cMin) return 'minor';
  return 'patch';
}

const SORT_ORDER = { major: 0, minor: 1, patch: 2 };

const items = Object.entries(outdated)
  .filter(([, i]) => i.current && i.latest && versionGt(i.latest, i.current) && !i.latest.includes('-'))
  .map(([name, i]) => ({
    name,
    current: i.current,
    latest:  i.latest,
    type:    upgradeType(i.current, i.latest),
    isDev:   i.dependencyType === 'devDependencies',
    checked: true,
  }))
  .sort((a, b) => SORT_ORDER[a.type] - SORT_ORDER[b.type] || a.name.localeCompare(b.name));

if (items.length === 0) {
  console.log(col('All packages are up to date!', C.green, C.bold));
  process.exit(0);
}

// ── Column widths ─────────────────────────────────────────────────────────────
const W = {
  name: Math.max(...items.map(i => i.name.length), 12),
  cur:  Math.max(...items.map(i => i.current.length), 7),
  lat:  Math.max(...items.map(i => i.latest.length), 6),
};

function typeColor(t) {
  if (t === 'major') return C.red + C.bold;
  if (t === 'minor') return C.yellow;
  return C.green;
}

function renderRow(item, active) {
  const cursor = active ? col('›', C.cyan, C.bold) : ' ';
  const check  = item.checked ? col('◉', C.cyan) : col('○', C.dim);
  const cur    = col(item.current.padEnd(W.cur), C.dim);
  const arrow  = col('→', C.dim);
  const lat    = col(item.latest.padEnd(W.lat), C.bold);
  const type   = col(item.type.padEnd(5), typeColor(item.type));
  const kind   = item.isDev ? col('dev', C.dim) : col('dep', C.blue);
  return ` ${cursor} ${check} ${item.name.padEnd(W.name)}  ${cur} ${arrow} ${lat}  [${type}]  ${kind}`;
}

// ── Interactive render ────────────────────────────────────────────────────────
let cursor = 0;
let linesRendered = 0;

function render() {
  const selected = items.filter(i => i.checked).length;
  const lines = [
    '',
    col(' Dependency Upgrades', C.bold),
    col(` Found ${items.length} outdated package${items.length !== 1 ? 's' : ''}.`, C.dim) +
      col('  ↑↓ move  space toggle  a all/none  enter confirm  q quit', C.dim),
    '',
    ...items.map((item, idx) => renderRow(item, idx === cursor)),
    '',
    selected === 0
      ? col(' Nothing selected — press q to quit.', C.dim)
      : col(` Press Enter to upgrade ${selected} package${selected !== 1 ? 's' : ''}.`, C.cyan, C.bold),
    '',
  ];

  if (linesRendered > 0) process.stdout.write(`\x1b[${linesRendered}A`);
  for (const line of lines) process.stdout.write(`\x1b[2K\r${line}\n`);
  linesRendered = lines.length;
}

// ── Key handling ──────────────────────────────────────────────────────────────
if (!process.stdin.isTTY) {
  process.stderr.write('Error: must be run in an interactive terminal.\n');
  process.exit(1);
}

readline.emitKeypressEvents(process.stdin);
process.stdin.setRawMode(true);

render();

process.stdin.on('keypress', (ch, key) => {
  if (!key) return;

  if (key.name === 'up' || (key.ctrl && key.name === 'k')) {
    cursor = (cursor - 1 + items.length) % items.length;
    render();
  } else if (key.name === 'down' || (key.ctrl && key.name === 'j')) {
    cursor = (cursor + 1) % items.length;
    render();
  } else if (key.name === 'space') {
    items[cursor].checked = !items[cursor].checked;
    render();
  } else if (ch === 'a' || ch === 'A') {
    const anyChecked = items.some(i => i.checked);
    items.forEach(i => { i.checked = !anyChecked; });
    render();
  } else if (key.name === 'return') {
    const selected = items.filter(i => i.checked);
    if (selected.length === 0) return;

    process.stdin.setRawMode(false);
    process.stdin.pause();
    process.stdout.write('\n');

    console.log(col(` Upgrading ${selected.length} package${selected.length !== 1 ? 's' : ''}…`, C.cyan, C.bold));
    console.log('');

    const deps    = selected.filter(i => !i.isDev).map(i => semverSpecifier(i.name, i.latest));
    const devDeps = selected.filter(i =>  i.isDev).map(i => semverSpecifier(i.name, i.latest));

    let exitCode = 0;
    if (deps.length) {
      const r = spawnSync('pnpm', ['add', ...deps], { stdio: 'inherit' });
      if (r.status) exitCode = r.status;
    }
    if (devDeps.length) {
      const r = spawnSync('pnpm', ['add', '-D', ...devDeps], { stdio: 'inherit' });
      if (r.status) exitCode = r.status;
    }

    console.log('');
    console.log(exitCode === 0
      ? col(' Done! Selected dependencies upgraded.', C.green, C.bold)
      : col(' Upgrade failed. Check output above for details.', C.red, C.bold)
    );
    process.exit(exitCode);
  } else if (key.name === 'q' || (key.ctrl && key.name === 'c')) {
    process.stdin.setRawMode(false);
    process.stdout.write('\n');
    process.exit(0);
  }
});
