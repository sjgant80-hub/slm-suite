#!/usr/bin/env node
// tools/eval.mjs — the held-out judgement (glue). Refuses to run unless SEAL2.md names the adapter, the data and the
// code by their SHA-256. Scores the three sets of committed drafts with stack/score.mjs and writes data/record.json;
// `--check` re-derives it byte for byte from the committed drafts (S8, CI).
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import SC from '../stack/score.mjs';
import M from '../stack/memo.mjs';
import L from '../verticals/legal/library.mjs';
import V from '../verticals/legal/vertical.mjs';

const ROOT = new URL('../', import.meta.url);
const raw = (p) => readFileSync(new URL(p, ROOT));
const read = (p) => raw(p).toString('utf8');
const sha = (p) => createHash('sha256').update(raw(p)).digest('hex');
const stop = (why) => { console.error('eval: ' + why); process.exit(1); };
if (!existsSync(new URL('SEAL2.md', ROOT))) stop('no SEAL2.md: nothing is frozen, so the held-out drafts may not be judged');
const seal = read('SEAL2.md');
for (const f of ['adapter/legal/adapter_model.safetensors', 'data/train.jsonl', 'data/held.jsonl', 'stack/gate.mjs', 'stack/memo.mjs', 'stack/score.mjs', 'verticals/legal/library.mjs', 'verticals/legal/vertical.mjs', 'verticals/legal/law.json', 'tools/infer.py'])
  if (!seal.includes(sha(f))) stop(f + ' is not what seal 2 names');
const jl = (p) => read(p).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = jl('data/held.jsonl'), table = JSON.parse(read('verticals/legal/law.json')).provisions;
const ctx = { schema: V.SCHEMA, factKeys: V.FACT_KEYS, answer: L.answer, table, patterns: V.PATTERNS, words: V.WORDS, render: M.render, label: M.LABEL, proposal: M.PROPOSAL };
const by = (p) => { const m = new Map(jl(p).map((d) => [d.id, d.output])); if (m.size !== rows.length) stop(p + ' has ' + m.size + ' drafts for ' + rows.length + ' complaints'); return m; };
const tuned = by('data/drafts-tuned.jsonl'), base = by('data/drafts-base.jsonl'), rawm = by('data/drafts-raw.jsonl');
const meta = JSON.parse(read('data/drafts-tuned.jsonl.meta.json')), tlog = JSON.parse(read('data/train-log.json'));
const local = { device: tlog.device === 'cpu' && meta.device === 'cpu' ? 'cpu' : 'not cpu', networkDisabled: meta.networkDisabled === true && meta.blockedConnects === 0, adapterBytes: Object.values(tlog.adapter).reduce((n, f) => n + f.bytes, 0) };
const cases = { tuned: rows.map((r) => SC.stackCase(r, tuned.get(r.id), ctx)), base: rows.map((r) => SC.stackCase(r, base.get(r.id), ctx)), raw: rows.map((r) => SC.rawCase(r, rawm.get(r.id), ctx)) };
const rec = SC.record(cases, local);
const out = JSON.stringify({ record: rec, verdicts: SC.verdicts(rec), cases }, null, 1) + '\n';
if (process.argv.includes('--check')) { const same = read('data/record.json') === out; console.log(same ? 'RECORD REPRODUCED' : 'RECORD DIFFERS'); process.exit(same ? 0 : 1); }
writeFileSync(new URL('data/record.json', ROOT), out);
for (const v of SC.verdicts(rec)) console.log((v.pass ? '  held   ' : '  FAILED ') + v.id + ' · ' + v.what + ' · ' + JSON.stringify(v.measured) + ' (bar ' + v.bar + ')');
