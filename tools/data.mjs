#!/usr/bin/env node
// tools/data.mjs — writes the legal vertical's complaints (glue). data/train.jsonl: 360 training pairs (the prompt and
// the target JSON) from the TRAIN bank, seed 11. data/held.jsonl: 80 held-out complaints from the HELD bank, seed 23,
// each with the prompt the models will see and the facts it was written from (the truth, read only by the evaluation).
// `--check` re-derives both files byte for byte (CI).
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import S from '../verticals/legal/scenarios.mjs';
import V from '../verticals/legal/vertical.mjs';

export const TRAIN = { n: 360, seed: 11 }, HELD = { n: 80, seed: 23 };
const OUT = new URL('../data/', import.meta.url);
const sha = (s) => createHash('sha256').update(s).digest('hex');
const lines = (rows) => rows.map((r) => JSON.stringify(r)).join('\n') + '\n';
const train = lines(S.make(TRAIN.n, TRAIN.seed, 'train', V.TODAY).map((x) => ({ id: x.id, prompt: V.slmPrompt(x.text, x.today), target: V.slmTarget(x.facts, x.summary) })));
const held = lines(S.make(HELD.n, HELD.seed, 'held', V.TODAY).map((x) => ({ id: x.id, today: x.today, prompt: V.slmPrompt(x.text, x.today), basePrompt: V.basePrompt(x.text, x.today), raw: V.rawPrompt(x.text, x.today), text: x.text, facts: x.facts, summary: x.summary })));
if (process.argv.includes('--check')) {
  const same = readFileSync(new URL('train.jsonl', OUT), 'utf8') === train && readFileSync(new URL('held.jsonl', OUT), 'utf8') === held;
  console.log(same ? 'DATA REPRODUCED · train ' + sha(train).slice(0, 12) + ' · held ' + sha(held).slice(0, 12) : 'DATA DIFFERS');
  process.exit(same ? 0 : 1);
}
mkdirSync(OUT, { recursive: true });
writeFileSync(new URL('train.jsonl', OUT), train);
writeFileSync(new URL('held.jsonl', OUT), held);
console.log('train ' + TRAIN.n + ' (sha ' + sha(train) + ')\nheld ' + HELD.n + ' (sha ' + sha(held) + ')');
