#!/usr/bin/env node
// tools/raw.mjs — the raw baseline (glue): qwen2.5:7b through the local Ollama, temperature 0, JSON output, asked the
// whole question at once with no library and no gate. Writes data/drafts-raw.jsonl (resumable). Local only: the one
// address it talks to is this laptop's Ollama.
import { readFileSync, existsSync, appendFileSync } from 'node:fs';
import http from 'node:http';

const ROOT = new URL('../', import.meta.url), OUT = new URL('data/drafts-raw.jsonl', ROOT);
const rows = readFileSync(new URL('data/held.jsonl', ROOT), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
const done = new Set(existsSync(OUT) ? readFileSync(OUT, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l).id) : []);
function ask(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'qwen2.5:7b', prompt, format: 'json', stream: false, options: { temperature: 0, seed: 7, num_predict: 400, num_ctx: 4096 } });
    const req = http.request({ host: '127.0.0.1', port: 11434, path: '/api/generate', method: 'POST', headers: { 'content-type': 'application/json', 'content-length': Buffer.byteLength(body) } }, (res) => {
      let s = ''; res.on('data', (d) => (s += d)); res.on('end', () => { try { resolve(JSON.parse(s).response || ''); } catch (e) { reject(e); } });
    });
    req.on('error', reject); req.setTimeout(0); req.end(body);
  });
}
for (const r of rows) {
  if (done.has(r.id)) continue;
  const t = Date.now(), output = await ask(r.raw);
  appendFileSync(OUT, JSON.stringify({ id: r.id, output }) + '\n');
  console.log(r.id + ' ' + Math.round((Date.now() - t) / 1000) + ' s');
}
