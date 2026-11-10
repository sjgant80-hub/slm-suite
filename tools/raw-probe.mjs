#!/usr/bin/env node
// tools/raw-probe.mjs — why some raw answers are empty (glue, written after the raw pass, outside both seals).
// tools/raw.mjs (sealed) writes Ollama's `response`, or '' when there is none. This re-asks qwen2.5:7b every complaint
// whose committed raw draft is empty, with byte-for-byte the request raw.mjs sends, and records what Ollama said back:
// the HTTP status, the error and the token counts. It never changes a draft and the record does not read it.
// Writes data/raw-probe.json. Local only: the one address is this laptop's Ollama.
import { readFileSync, writeFileSync } from 'node:fs';
import http from 'node:http';

const ROOT = new URL('../', import.meta.url);
const jl = (p) => readFileSync(new URL(p, ROOT), 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = new Map(jl('data/held.jsonl').map((r) => [r.id, r]));
const empty = jl('data/drafts-raw.jsonl').filter((d) => d.output === '').map((d) => d.id);
function ask(prompt) {   // the same body, options and address as tools/raw.mjs
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'qwen2.5:7b', prompt, format: 'json', stream: false, options: { temperature: 0, seed: 7, num_predict: 400, num_ctx: 4096 } });
    const req = http.request({ host: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (res) => {
      let s = ''; res.on('data', (d) => (s += d)); res.on('end', () => { let j = {}; try { j = JSON.parse(s); } catch { j = { unreadable: s.slice(0, 200) }; } resolve({ status: res.statusCode, j }); });
    });
    req.on('error', reject); req.setTimeout(0); req.end(body);
  });
}
const probes = [];
for (const id of empty) {
  const t = Date.now(), { status, j } = await ask(rows.get(id).raw);
  probes.push({ id, status, error: j.error ?? null, doneReason: j.done_reason ?? null, evalCount: j.eval_count ?? null, responseChars: typeof j.response === 'string' ? j.response.length : null, seconds: Math.round((Date.now() - t) / 1000) });
  console.log(id + ' ' + status + ' ' + (j.error || j.done_reason || '') + ' ' + Math.round((Date.now() - t) / 1000) + ' s');
}
const errors = {};
for (const p of probes) errors[p.error || 'no error'] = (errors[p.error || 'no error'] || 0) + 1;
writeFileSync(new URL('data/raw-probe.json', ROOT), JSON.stringify({ at: new Date().toISOString(), model: 'qwen2.5:7b', request: 'the same as tools/raw.mjs', empty: empty.length, errors, probes }, null, 1) + '\n');
console.log(JSON.stringify(errors));
