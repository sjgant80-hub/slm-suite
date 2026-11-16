#!/usr/bin/env node
// tools/summary-audit.mjs — the post-seal audit of the memo's summary line (glue, written 2026-11-16, AFTER both seals
// and after the held-out record; it changes no sealed draft, claim or number, and nothing sealed reads it).
// For each held-out complaint: the trained model's recorded summary, whether the memo shows it (the gate withholds a
// summary that mentions law or dates), and audit/summary.mjs's verdict. Split by whether the complaint itself names the
// item (the generator's truth summary names it; the complaint's wording sometimes leaves it out).
//   node tools/summary-audit.mjs           write data/summary-audit.json
//   node tools/summary-audit.mjs --check   re-derive it byte for byte (CI)
import { readFileSync, writeFileSync } from 'node:fs';
import G from '../stack/gate.mjs';
import M from '../stack/memo.mjs';
import L from '../verticals/legal/library.mjs';
import V from '../verticals/legal/vertical.mjs';
import A from '../audit/summary.mjs';

const ROOT = new URL('../', import.meta.url);
const read = (p) => readFileSync(new URL(p, ROOT), 'utf8');
const jl = (p) => read(p).trim().split('\n').filter(Boolean).map((l) => JSON.parse(l));
const rows = jl('data/held.jsonl'), table = JSON.parse(read('verticals/legal/law.json')).provisions;
const tuned = new Map(jl('data/drafts-tuned.jsonl').map((d) => [d.id, d.output]));

function audit() {
  const out = [];
  for (const r of rows) {
    const draft = tuned.get(r.id), o = G.firstObject(draft);
    const summary = o && typeof o.summary === 'string' ? o.summary : null;
    const memo = M.render(G.decide(draft, { today: r.today, schema: V.SCHEMA, answer: L.answer, table }), { words: V.WORDS });
    const inMemo = memo.split('\n').some((l) => l.startsWith('The complaint, as read: ')); // the line stack/memo.mjs writes
    const truthItem = A.summaryItem(r.summary);
    const complaintNamesItem = !!truthItem && r.text.toLowerCase().includes(truthItem.item.toLowerCase());
    const v = A.checkSummary(r.text, summary);
    out.push({ id: r.id, summary, inMemo, complaintNamesItem, item: v.item, invented: v.invented, pairInvented: v.pairInvented });
  }
  const n1 = (f) => out.filter(f).length;
  return JSON.stringify({
    what: 'post-seal audit of the memo summary line (tools/summary-audit.mjs, audit/summary.mjs); never read by the sealed record',
    rule: 'the item or service the summary names must appear in the complaint\'s own words, and "a pair of" must be something the complaint says',
    n: out.length, inMemo: n1((x) => x.inMemo), invented: n1((x) => x.invented), inventedInMemo: n1((x) => x.invented && x.inMemo),
    complaintOmitsItem: { n: n1((x) => !x.complaintNamesItem), invented: n1((x) => !x.complaintNamesItem && x.invented) },
    complaintNamesItem: { n: n1((x) => x.complaintNamesItem), invented: n1((x) => x.complaintNamesItem && x.invented) },
    rows: out,
  }, null, 1) + '\n';
}

if (process.argv.includes('--check')) { const same = read('data/summary-audit.json') === audit(); console.log(same ? 'SUMMARY AUDIT REPRODUCED' : 'SUMMARY AUDIT DIFFERS'); process.exit(same ? 0 : 1); }
const s = audit(); writeFileSync(new URL('data/summary-audit.json', ROOT), s);
const o = JSON.parse(s);
console.log(`summary names something the complaint does not say: ${o.invented}/${o.n} (in the memo: ${o.inventedInMemo}/${o.inMemo})`);
console.log(`  complaint leaves the item out: ${o.complaintOmitsItem.invented}/${o.complaintOmitsItem.n} · complaint names it: ${o.complaintNamesItem.invented}/${o.complaintNamesItem.n}`);
