#!/usr/bin/env node
// tools/raw-fair.mjs — two fairer goes for the bigger model (glue, written 2026-11-16, AFTER both seals and after the
// held-out record; it never changes a sealed draft, the record, or any sealed claim, and nothing sealed reads it).
//
// Why. The sealed baseline (tools/raw.mjs) asked qwen2.5:7b with Ollama's JSON grammar on; 25 of 80 came back empty,
// 21 of them because Ollama aborted the model for repeating itself (data/raw-probe.json). A skeptic can fairly say the
// stack beat a baseline that crashed, and that a 7B was never going to know the statutes. So, on all 80 held-out
// complaints, the same model, temperature 0, seed 7, the same question:
//   nogrammar — the sealed prompt byte for byte, with the JSON grammar OFF (the cause of the aborts); the first JSON
//               object in the reply is taken, exactly as the sealed scorer does (stack/gate.mjs firstObject).
//   withlaw   — the same, plus the 15 verified provisions (citation + what each says) printed in the prompt: the law
//               handed to it. It still has to choose the claim and remedy, pick the provisions and compute every date;
//               it is not given the library's rules.
// Both get num_predict 600 (the sealed run had 400) — more room for the baseline, never less. Scored by the sealed
// scorer (stack/score.mjs rawCase) with the same context as tools/eval.mjs. Local only: the one address is this laptop's
// Ollama.
//   node tools/raw-fair.mjs            run (resumable)      node tools/raw-fair.mjs --score   write data/raw-fair.json
//   node tools/raw-fair.mjs --check    re-derive data/raw-fair.json byte for byte from the committed drafts (CI)
import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'node:fs';
import http from 'node:http';
import SC from '../stack/score.mjs';
import M from '../stack/memo.mjs';
import L from '../verticals/legal/library.mjs';
import V from '../verticals/legal/vertical.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const jl = (p) => read(p).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = jl('data/held.jsonl'), table = JSON.parse(read('verticals/legal/law.json')).provisions;
const MODES = { nogrammar: 'data/drafts-raw-nogrammar.jsonl', withlaw: 'data/drafts-raw-withlaw.jsonl' };
const OPTIONS = { temperature: 0, seed: 7, num_predict: 600, num_ctx: 4096 };
const LAW = 'The provisions you may cite are these, verified on legislation.gov.uk; cite them exactly as written:\n' +
  table.map((p) => '- ' + p.cite + ': ' + p.says).join('\n') + '\n\n';
export const promptFor = (row, mode) => (mode === 'withlaw' ? row.raw.replace('\nComplaint:\n', '\n' + LAW + 'Complaint:\n') : row.raw);

function ask(prompt) {
  return new Promise((resolve) => {
    const body = JSON.stringify({ model: 'qwen2.5:7b', prompt, stream: false, options: OPTIONS }); // no `format`: grammar off
    const req = http.request({ host: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (res) => {
      let s = ''; res.on('data', (d) => (s += d)); res.on('end', () => { let j = {}; try { j = JSON.parse(s); } catch { j = { error: 'unreadable reply' }; } resolve({ status: res.statusCode, j }); });
    });
    req.on('error', (e) => resolve({ status: 0, j: { error: String(e.message) } }));
    req.setTimeout(15 * 60 * 1000, () => { req.destroy(); resolve({ status: 0, j: { error: 'timeout after 15 min' } }); });
    req.end(body);
  });
}

const ctx = { schema: V.SCHEMA, factKeys: V.FACT_KEYS, answer: L.answer, table, patterns: V.PATTERNS, words: V.WORDS, render: M.render, label: M.LABEL, proposal: M.PROPOSAL, angle: 'cca-s75' };
function score() {
  const rec = JSON.parse(read('data/record.json'));
  const stackBits = rec.cases.tuned.map((c) => (c.correct ? 1 : 0));
  const sealed = new Map(jl('data/drafts-raw.jsonl').map((d) => [d.id, d.output]));
  const sets = { sealed: (id) => sealed.get(id) };
  for (const [m, f] of Object.entries(MODES)) { const mm = new Map(jl(f).map((d) => [d.id, d])); if (mm.size !== rows.length) throw new Error(f + ' has ' + mm.size + ' of ' + rows.length); sets[m] = (id) => mm.get(id).output; }
  const out = { what: 'post-seal fairer baselines for qwen2.5:7b on the 80 held-out complaints (tools/raw-fair.mjs); never read by the sealed record', options: OPTIONS, stackCorrect: rec.record.correct.stack, n: rows.length, baselines: {} };
  for (const [m, get] of Object.entries(sets)) {
    const cases = rows.map((r) => SC.rawCase(r, get(r.id), ctx));
    const bits = cases.map((c) => (c.correct ? 1 : 0));
    out.baselines[m] = { correct: bits.reduce((a, b) => a + b, 0), parsed: cases.filter((c) => c.parsed).length, empty: rows.filter((r) => (get(r.id) || '') === '').length,
      outsideTable: cases.reduce((s, c) => s + c.outsideTable, 0), notApplicable: cases.reduce((s, c) => s + c.notApplicable, 0),
      stackMinusThisLow: SC.pairedLow(stackBits, bits), correctIds: cases.filter((c) => c.correct).map((c) => c.id) };
  }
  const meta = {}; for (const [m, f] of Object.entries(MODES)) { const ds = jl(f); meta[m] = { errors: ds.filter((d) => d.error).length, doneReasons: [...new Set(ds.map((d) => d.doneReason))].sort(), medianSeconds: ds.map((d) => d.seconds).sort((a, b) => a - b)[ds.length >> 1] }; }
  out.runs = meta;
  return JSON.stringify(out, null, 1) + '\n';
}

if (process.argv.includes('--check')) { const same = read('data/raw-fair.json') === score(); console.log(same ? 'RAW-FAIR REPRODUCED' : 'RAW-FAIR DIFFERS'); process.exit(same ? 0 : 1); }
if (process.argv.includes('--score')) { const s = score(); writeFileSync(new URL('data/raw-fair.json', ROOT), s); const o = JSON.parse(s); for (const [m, b] of Object.entries(o.baselines)) console.log(m.padEnd(10), b.correct + '/' + o.n, 'right · parsed', b.parsed, '· empty', b.empty, '· outside table', b.outsideTable, '· stack−this lower bound', b.stackMinusThisLow); process.exit(0); }

// --quiet HH:MM-HH:MM (local time): make no call inside that window — the laptop's night organs need the same local
// model — and carry on when it ends. The run is resumable either way.
const q = (() => { const i = process.argv.indexOf('--quiet'); const m = i > 0 && /^(\d\d):(\d\d)-(\d\d):(\d\d)$/.exec(process.argv[i + 1] || ''); return m ? [60 * +m[1] + +m[2], 60 * +m[3] + +m[4]] : null; })();
const quietNow = () => { if (!q) return false; const d = new Date(), t = 60 * d.getHours() + d.getMinutes(); return q[0] <= q[1] ? t >= q[0] && t < q[1] : t >= q[0] || t < q[1]; };
const done = {}; for (const [m, f] of Object.entries(MODES)) done[m] = new Set(existsSync(new URL(f, ROOT)) ? jl(f).map((d) => d.id) : []);
for (const r of rows) for (const m of Object.keys(MODES)) {
  if (done[m].has(r.id)) continue;
  if (quietNow()) { console.log('quiet window: pausing at', new Date().toTimeString().slice(0, 5)); while (quietNow()) await new Promise((ok) => setTimeout(ok, 60 * 1000)); console.log('resuming at', new Date().toTimeString().slice(0, 5)); }
  const t = Date.now(), { status, j } = await ask(promptFor(r, m));
  const rec = { id: r.id, output: typeof j.response === 'string' ? j.response : '', status, doneReason: j.done_reason ?? null, error: j.error ?? null, evalCount: j.eval_count ?? null, seconds: Math.round((Date.now() - t) / 1000) };
  appendFileSync(new URL(MODES[m], ROOT), JSON.stringify(rec) + '\n');
  console.log(r.id, m, status, rec.error || rec.doneReason, rec.seconds + ' s');
}
console.log('done — now: node tools/raw-fair.mjs --score');
