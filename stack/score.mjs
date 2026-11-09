// stack/score.mjs — the shared stack's evaluation (pure; the same for every vertical). Scores the stack and a raw model
// on held-out cases by one rule, bootstraps the paired differences, and judges every sealed claim on whole counts.
//   ctx: { schema, factKeys, answer, table, patterns, words, decide, render, label }
import G from './gate.mjs';

const sameSet = (a, b) => a.length === b.length && [...a].sort().every((x, i) => x === [...b].sort()[i]);
const dl = (ds) => ds.map((d) => d.what + ' ' + d.date);
/** exactAnswer(a, truth) → claim, abstention, remedy, the set of table provisions and every deadline all equal */
export const exactAnswer = (a, t) => a.claim === t.claim && a.abstain === t.abstain && a.remedy === t.remedy && sameSet(a.rights, t.rights) && sameSet(dl(a.deadlines), dl(t.deadlines));
/** exactFacts(got, truth, keys) → every fact the schema names equal */
export const exactFacts = (got, truth, keys) => got !== null && keys.every((k) => got[k] === truth[k]);

/** stackCase(row, output, ctx) → how the stack did on one held-out case */
export function stackCase(row, output, ctx) {
  const truth = ctx.answer({ ...row.facts, today: row.today });
  const r = G.decide(output, { today: row.today, schema: ctx.schema, answer: ctx.answer, table: ctx.table });
  const factsExact = exactFacts(r.facts, row.facts, ctx.factKeys);
  const correct = truth.abstain ? r.abstain : !r.abstain && exactAnswer(r.answer, truth);
  const ids = new Set(ctx.table.map((p) => p.id));
  const own = r.abstain || !r.answer ? null : ctx.answer({ ...r.facts, today: row.today });
  const invented = r.cites.filter((p) => !ids.has(p.id) || !own.rights.includes(p.id)).length + (own && !sameSet(dl(r.answer.deadlines), dl(own.deadlines)) ? 1 : 0);
  const memo = ctx.render(r, { words: ctx.words });
  return { id: row.id, truthAbstains: truth.abstain, read: r.facts !== null, factsExact, correct, abstained: r.abstain, invented,
    s75True: !truth.abstain && truth.angles.includes('cca-s75'), s75Proposed: !r.abstain && r.answer.angles.includes('cca-s75') && memo.includes(ctx.proposal),
    labelled: memo.split('\n').at(-1) === ctx.label };
}

/** rawCase(row, output, ctx) → how a raw model did, by the same rule; its citations sorted into in-table and outside */
export function rawCase(row, output, ctx) {
  const truth = ctx.answer({ ...row.facts, today: row.today }), o = G.firstObject(output);
  const ok = o !== null;   // firstObject gives an object or null
  const cites = ok && Array.isArray(o.provisions) ? o.provisions.map(String) : [];
  const mapped = cites.map((c) => G.citeId(c, ctx.patterns)), inTable = [...new Set(mapped.filter((x) => x !== null))];
  const deadlines = ok && Array.isArray(o.deadlines) ? o.deadlines.filter((d) => d && typeof d === 'object').map((d) => ({ what: String(d.what), date: String(d.date) })) : [];
  const said = ok ? { claim: o.claim === 'cannot-tell' ? truth.claim : o.claim, abstain: o.claim === 'cannot-tell', remedy: o.remedy ?? null, rights: inTable, deadlines } : null;
  const correct = truth.abstain ? !!(ok && o.claim === 'cannot-tell') : !!(said && !said.abstain && exactAnswer(said, truth));
  return { id: row.id, truthAbstains: truth.abstain, parsed: !!ok, correct, outsideTable: mapped.filter((x) => x === null).length, notApplicable: inTable.filter((id) => !truth.rights.includes(id)).length };
}

/** pairedLow(a, b, n, seed) → the 2.5th percentile of mean(a − b) over paired bootstrap resamples (a, b: 0/1 lists) */
export function pairedLow(a, b, n = 2000, seed = 99) {
  let s = seed >>> 0;
  const r = () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const d = a.map((x, i) => x - b[i]), means = [];
  for (let k = 0; k !== n; k++) { let sum = 0; for (let j = 0; j !== d.length; j++) sum += d[Math.floor(r() * d.length)]; means.push(sum / d.length); }
  means.sort((x, y) => x - y);
  return Math.round(means[Math.floor(0.025 * n)] * 10000) / 10000;
}

const n1 = (xs, f) => xs.filter(f).length;
/** record(cases) → the counts every claim is judged on. cases: { tuned, base, raw } case lists in the same order */
export function record({ tuned, base, raw }, local) {
  const bit = (xs, k) => xs.map((x) => (x[k] ? 1 : 0)), inc = tuned.filter((c) => c.truthAbstains), com = tuned.filter((c) => !c.truthAbstains);
  return {
    n: tuned.length,
    facts: { tuned: n1(tuned, (c) => c.factsExact), base: n1(base, (c) => c.factsExact), low: pairedLow(bit(tuned, 'factsExact'), bit(base, 'factsExact')) },
    correct: { stack: n1(tuned, (c) => c.correct), baseStack: n1(base, (c) => c.correct), raw: n1(raw, (c) => c.correct), low: pairedLow(bit(tuned, 'correct'), bit(raw, 'correct')) },
    invented: { stack: tuned.reduce((s, c) => s + c.invented, 0), rawOutsideTable: raw.reduce((s, c) => s + c.outsideTable, 0), rawNotApplicable: raw.reduce((s, c) => s + c.notApplicable, 0), rawParsed: n1(raw, (c) => c.parsed) },
    abstain: { incomplete: inc.length, abstainedOnIncomplete: n1(inc, (c) => c.abstained), complete: com.length, abstainedOnComplete: n1(com, (c) => c.abstained) },
    s75: { applies: n1(tuned, (c) => c.s75True), proposedWhereApplies: n1(tuned, (c) => c.s75True && c.s75Proposed), proposedWhereNot: n1(tuned, (c) => !c.s75True && c.s75Proposed) },
    labelled: { stack: n1(tuned, (c) => c.labelled), base: n1(base, (c) => c.labelled) },
    local,
  };
}

/** verdicts(rec) → every sealed claim beside its bar, on whole counts */
export function verdicts(rec) {
  const { n, facts, correct, invented, abstain, s75, labelled, local } = rec;
  return [
    { id: 'S1', what: 'extracted facts all exactly right: the tuned model, and tuned minus base (paired lower bound)', measured: [facts.tuned + '/' + n, facts.base + '/' + n, facts.low], bar: 'tuned at least 0.80 and lower bound above 0', pass: 5 * facts.tuned >= 4 * n && facts.low > 0 },
    { id: 'S2', what: 'answered exactly right or correctly abstained: the stack, and stack minus raw qwen2.5:7b (paired lower bound)', measured: [correct.stack + '/' + n, correct.raw + '/' + n, correct.low], bar: 'stack at least 0.85 and lower bound above 0', pass: 20 * correct.stack >= 17 * n && correct.low > 0 },
    { id: 'S3', what: 'provisions or dates in the stack\'s outputs that the verified library did not give', measured: invented.stack, bar: 'zero', pass: invented.stack === 0 },
    { id: 'S4', what: 'abstained on the complaints missing a critical fact, and on the complete ones', measured: [abstain.abstainedOnIncomplete + '/' + abstain.incomplete, abstain.abstainedOnComplete + '/' + abstain.complete], bar: 'at least 0.90, and at most 0.10', pass: abstain.incomplete > 0 && 10 * abstain.abstainedOnIncomplete >= 9 * abstain.incomplete && 10 * abstain.abstainedOnComplete <= abstain.complete },
    { id: 'S5', what: 's. 75 proposed, as a proposal, where it applies; and where it does not', measured: [s75.proposedWhereApplies + '/' + s75.applies, s75.proposedWhereNot], bar: 'at least 0.95, and none', pass: s75.applies > 0 && 20 * s75.proposedWhereApplies >= 19 * s75.applies && s75.proposedWhereNot === 0 },
    { id: 'S6', what: 'outputs carrying the human-review label', measured: labelled.stack + '/' + n, bar: 'every one', pass: labelled.stack === n },
    { id: 'S7', what: 'trained and run on this laptop\'s CPU, inference with the network disabled, the adapter\'s size', measured: [local.device, local.networkDisabled, local.adapterBytes], bar: 'cpu, true, at most 50 MB', pass: local.device === 'cpu' && local.networkDisabled === true && local.adapterBytes <= 50 * 1024 * 1024 },
  ];
}

export default { exactAnswer, exactFacts, stackCase, rawCase, pairedLow, record, verdicts };
