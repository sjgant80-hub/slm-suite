#!/usr/bin/env node
// tools/witness-audit-check.mjs — CI's check on the post-seal summary-audit kernel's mutation gate: the verdict witness
// (pinned v0.6) just wrote must be clean, uncapped, and re-derive exactly the counts in data/witness-audit.json. Separate
// from tools/witness-check.mjs and data/witness.json, which seal 2 freezes.
//   node tools/witness-audit-check.mjs <witness-output.json>
import { readFileSync } from 'node:fs';
const want = JSON.parse(readFileSync(new URL('../data/witness-audit.json', import.meta.url), 'utf8'));
let got; try { const b = readFileSync(process.argv[2], 'utf8'); got = JSON.parse(b.slice(b.indexOf('{'), b.lastIndexOf('}') + 1)); } catch (e) { console.error('::error::no verdict from witness: ' + e.message); process.exit(1); }
const ignored = Array.isArray(got.ignored) ? got.ignored.length : 0, problems = [];
for (const s of got.survived || []) console.error('  survived: line ' + s.line + ' ' + s.mutation + ' :: ' + s.snippet);
if (got.clean !== true) problems.push('not clean');
if (got.capped !== false) problems.push('capped');
if (got.total !== want.total) problems.push('total ' + got.total + ' here, ' + want.total + ' committed');
if (got.killed !== want.killed) problems.push('killed ' + got.killed + ' here, ' + want.killed + ' committed');
if (ignored !== want.ignored) problems.push('reviewed-equivalent ' + ignored + ' here, ' + want.ignored + ' committed');
if (problems.length) { console.error('::error::witness audit/summary: ' + problems.join('; ')); process.exit(1); }
console.log('witness audit/summary: ' + got.killed + '/' + got.total + ' killed on this runner — clean, and the committed receipt re-derived exactly');
