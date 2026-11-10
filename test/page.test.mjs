// The page and the files, held to CLAIMS.md: S9 (no measured number typed into the page), S10 (licences: every provision
// with its legislation.gov.uk address and the OGL; the base model's Apache-2.0 licence beside the adapter), the pins, seal
// 2 naming what the held-out set was read with, the human contract on the page, and the credits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import M from '../stack/memo.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const sha = (p) => createHash('sha256').update(readFileSync(new URL(p, ROOT))).digest('hex');
const html = read('index.html'), app = read('app.mjs');

test('S10: every provision carries its legislation.gov.uk address and the OGL; the base model\'s licence ships with the adapter', () => {
  const law = JSON.parse(read('verticals/legal/law.json'));
  assert.match(law.licence, /Open Government Licence v3\.0/);
  assert.equal(law.verified, '2026-11-09');
  for (const p of law.provisions) { assert.match(p.url, /^https:\/\/www\.legislation\.gov\.uk\/(ukpga|uksi)\/\d{4}\/\d+\/(section|regulation)\/\d+$/, p.id); assert.ok(p.cite && p.says, p.id); }
  assert.equal(new Set(law.provisions.map((p) => p.id)).size, law.provisions.length);
  assert.match(read('adapter/legal/LICENSE-Qwen2.5'), /Apache License\s+Version 2\.0/);
  assert.match(html, /Open Government Licence v3\.0/);
  assert.match(html, /Qwen2\.5-0\.5B-Instruct, the Qwen team, Apache-2\.0/);
});
test('the pins: every vendored file is the bytes it came as', () => {
  const pinned = new Map();
  for (const s of JSON.parse(read('vendor/SOURCES.json')).sources) for (const f of s.files) pinned.set(f.path, f.sha256);
  const files = [];
  (function walk(d) { for (const n of readdirSync(new URL(d, ROOT))) { const p = d + '/' + n; if (statSync(new URL(p, ROOT)).isDirectory()) walk(p); else files.push(p); } })('vendor');
  for (const f of files.filter((x) => x !== 'vendor/SOURCES.json')) { assert.ok(pinned.has(f), f + ' is not pinned'); assert.equal(sha(f), pinned.get(f), f + ' changed'); }
});
test('seal 2 names the adapter, the data and the code the held-out set was read with', () => {
  const seal = read('SEAL2.md');
  for (const f of ['adapter/legal/adapter_model.safetensors', 'data/train.jsonl', 'data/held.jsonl', 'stack/gate.mjs', 'stack/memo.mjs', 'stack/score.mjs', 'verticals/legal/library.mjs', 'verticals/legal/vertical.mjs', 'verticals/legal/law.json', 'tools/infer.py'])
    assert.ok(seal.includes(sha(f)), f);
});
test('S9: no measured number is typed into the page', () => {
  const r = JSON.parse(read('data/record.json')).record, forms = new Set();
  const pct = (a, n) => Math.round((1000 * a) / n) / 10 + '%';
  for (const [a, n] of [[r.correct.stack, r.n], [r.correct.raw, r.n], [r.correct.baseStack, r.n], [r.facts.tuned, r.n], [r.facts.base, r.n]]) if (a > 0 && a < n) forms.add(pct(a, n));
  for (const [a, n] of [[r.abstain.abstainedOnIncomplete, r.abstain.incomplete], [r.s75.proposedWhereApplies, r.s75.applies]]) if (a > 9) forms.add(a + ' of the ' + n);
  const visible = html.replace(/<style>[\s\S]*?<\/style>/, '').replace(/style="[^"]*"/g, '');
  for (const s of forms) assert.equal(visible.includes(s), false, 'the page has "' + s + '" typed in; it must come from the record');
  assert.match(app, /pct\(r\.correct\.stack, r\.n\)/);
});
test('the page explains itself, keeps the human contract, talks only to itself, and carries its credits', () => {
  for (const id of ['result', 'watch', 'try', 'what', 'words', 'start', 'how', 'blueprint', 'contract', 'adoption', 'paper', 'business']) assert.match(html, new RegExp('<section id="' + id + '"'), id);
  assert.match(html, /It does not give legal advice, decide anything, file anything or send anything\./);
  assert.match(html, /A claim that misses its bar is kept and shown as failed\./);
  assert.match(app, /pass \? 'HELD' : 'FAILED'/);
  assert.match(M.LABEL, /^ASSISTS ONLY\. A qualified human must review this/);
  assert.match(html, /connect-src 'self'/);
  assert.match(html, /Powered by the Konomi architecture, created by Thomas Frumkin/);
  assert.equal(/£\s?\d|\$\s?\d|per seat|\/mo\b/i.test(html), false, 'no price of ours on the page');
  assert.equal(/my-estate-graph/.test(html + app), false);
  for (const f of ['CLAIMS.md', 'SEAL2.md', 'LICENSE', 'NOTICE', 'verticals/legal/law.json']) assert.ok(existsSync(new URL(f, ROOT)), f);
});

test('the raw model\'s empty answers: the probe re-asked exactly the empty ones, and the page reads it', () => {
  const app = readFileSync(new URL('app.mjs', ROOT), 'utf8');
  assert.match(app, /json\('data\/raw-probe\.json'\)/);
  assert.match(app, /PROBE\.empty === empties\.length/, 'the reason is shown only when the probe covers every empty answer');
  if (!existsSync(new URL('data/drafts-raw.jsonl', ROOT))) return;
  const empty = readFileSync(new URL('data/drafts-raw.jsonl', ROOT), 'utf8').trim().split('\n').map((l) => JSON.parse(l)).filter((d) => d.output === '').map((d) => d.id);
  if (!empty.length) return;
  const probe = JSON.parse(readFileSync(new URL('data/raw-probe.json', ROOT), 'utf8'));
  assert.equal(probe.empty, empty.length);
  assert.deepEqual(probe.probes.map((p) => p.id), empty);
  assert.equal(Object.values(probe.errors).reduce((a, b) => a + b, 0), empty.length);
});
