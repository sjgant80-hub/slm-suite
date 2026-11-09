// The shared stack and the legal vertical, held to CLAIMS.md. The library's expected answers are worked out by hand from
// the statute text read on legislation.gov.uk (verticals/legal/law.json), not from the code.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import L from '../verticals/legal/library.mjs';
import V from '../verticals/legal/vertical.mjs';
import S from '../verticals/legal/scenarios.mjs';
import G from '../stack/gate.mjs';
import M from '../stack/memo.mjs';
import SC from '../stack/score.mjs';

const read = (p) => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const LAW = JSON.parse(read('verticals/legal/law.json')).provisions;
const base = { kind: 'goods', channel: 'online', price: 200, paidBy: 'debit card', bought: '2026-09-28', delivered: '2026-10-01', faultFound: '2026-10-10', repairsTried: 0, changedMind: false };
const A = (o, today) => L.answer({ ...base, ...o, today });

test('the calendar: days, months to a month that is too short, and on-or-before', () => {
  assert.equal(L.addDays('2026-10-01', 30), '2026-10-31');
  assert.equal(L.addDays('2026-12-25', 14), '2027-01-08');
  assert.equal(L.addDays('2026-03-01', -1), '2026-02-28');
  assert.equal(L.addMonths('2026-08-31', 6), '2027-02-28');
  assert.equal(L.addMonths('2027-08-31', 6), '2028-02-29', 'a leap February');
  assert.equal(L.addMonths('2028-02-29', 72), '2034-02-28');
  assert.equal(L.addMonths('2026-11-15', 2), '2027-01-15');
  assert.equal(L.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(L.onOrBefore('2026-10-31', '2026-10-31'), true);
  assert.equal(L.onOrBefore('2026-11-01', '2026-10-31'), false);
  assert.equal(L.onOrBefore('2026-10-30', '2026-10-31'), true);
});

test('goods: the 30-day short-term right to reject (CRA s. 22(3)), then repair, then the final right (s. 24(5))', () => {
  const a = A({}, '2026-10-31');
  assert.deepEqual([a.claim, a.remedy, a.abstain, a.next], ['goods-fault', 'reject', false, 'letter-before-action-14-days']);
  assert.deepEqual(a.rights, ['cra-s9', 'cra-s19-14', 'cra-s20', 'cra-s22', 'la-s5']);
  assert.deepEqual(a.deadlines, [{ what: 'reject-by', date: '2026-10-31' }, { what: 'limitation', date: '2032-10-01' }]);
  assert.equal(A({}, '2026-11-01').remedy, 'repair-or-replacement', 'day 31: the short-term right has gone');
  assert.deepEqual(A({}, '2026-11-01').rights, ['cra-s9', 'cra-s19-14', 'cra-s23', 'la-s5']);
  assert.deepEqual(A({}, '2026-11-01').deadlines, [{ what: 'limitation', date: '2032-10-01' }]);
  const p = A({ repairsTried: 1 }, '2026-11-01');
  assert.equal(p.remedy, 'price-reduction-or-final-reject');
  assert.deepEqual(p.rights, ['cra-s9', 'cra-s19-14', 'cra-s24', 'cra-s24-10', 'la-s5'], 'inside six months: no deduction for use (s. 24(10))');
  assert.equal(A({ repairsTried: 2 }, '2026-11-01').remedy, 'price-reduction-or-final-reject');
  assert.equal(A({ repairsTried: 1 }, '2026-10-31').remedy, 'reject', 'inside 30 days the short-term right comes first');
});

test('goods: the six-month presumption (CRA s. 19(14)) and the no-deduction window (s. 24(10)) end the day before six months on', () => {
  const d = { delivered: '2026-03-15', bought: '2026-03-10' };
  assert.equal(A({ ...d, faultFound: '2026-09-14' }, '2026-10-01').presumption, true);
  assert.equal(A({ ...d, faultFound: '2026-09-15' }, '2026-10-01').presumption, false);
  assert.equal(A({ ...d, faultFound: '2026-09-15' }, '2026-10-01').rights.includes('cra-s19-14'), false);
  const m = { delivered: '2026-08-31', bought: '2026-08-30' };
  assert.equal(A({ ...m, faultFound: '2027-02-27' }, '2027-03-01').presumption, true, 'Feb has no 31st: six months on is the 28th, the period ends the 27th');
  assert.equal(A({ ...m, faultFound: '2027-02-28' }, '2027-03-01').presumption, false);
  const w = { delivered: '2026-05-01', bought: '2026-04-28', faultFound: '2026-06-01', repairsTried: 1 };
  assert.equal(A(w, '2026-10-31').rights.includes('cra-s24-10'), true);
  assert.equal(A(w, '2026-11-01').rights.includes('cra-s24-10'), false);
});

test('services (CRA s. 49): repeat performance (s. 55), then a price reduction (s. 56); six years to claim (LA 1980 s. 5)', () => {
  const s = { kind: 'service', delivered: '2026-06-10', faultFound: null };
  assert.deepEqual([A(s, '2026-07-01').remedy, A(s, '2026-07-01').rights], ['repeat-performance', ['cra-s49', 'cra-s55', 'la-s5']]);
  assert.deepEqual([A({ ...s, repairsTried: 1 }, '2026-07-01').remedy, A({ ...s, repairsTried: 1 }, '2026-07-01').rights], ['price-reduction', ['cra-s49', 'cra-s56', 'la-s5']]);
  assert.deepEqual(A(s, '2026-07-01').deadlines, [{ what: 'limitation', date: '2032-06-10' }]);
  assert.equal(A(s, '2026-07-01').presumption, false);
});

test('distance purchases: 14 days to cancel from possession (CCR regs 29, 30(3), 34); a shop purchase has no such right', () => {
  const c = { changedMind: true, faultFound: null, channel: 'online' };
  const a = A(c, '2026-10-15');
  assert.deepEqual([a.claim, a.remedy, a.rights, a.deadlines, a.next], ['distance-cancel', 'cancel-and-refund', ['ccr-reg29', 'ccr-reg30', 'ccr-reg34'], [{ what: 'cancel-by', date: '2026-10-15' }], 'notify-cancellation']);
  const late = A(c, '2026-10-16');
  assert.deepEqual([late.remedy, late.rights, late.deadlines, late.next], ['cancellation-period-passed', ['ccr-reg30'], [], 'check-returns-policy']);
  assert.equal(A({ ...c, channel: 'phone' }, '2026-10-02').claim, 'distance-cancel');
  const shop = A({ ...c, channel: 'shop' }, '2026-10-02');
  assert.deepEqual([shop.claim, shop.remedy, shop.rights, shop.deadlines, shop.next, shop.abstain], ['no-statutory-right', 'no-statutory-right', [], [], 'check-returns-policy', false]);
  assert.deepEqual(A({ ...c, channel: 'shop', delivered: null }, '2026-10-02').abstain, false, 'nothing is needed to say there is no right');
});

test('the s. 75 angle: a credit card, a cash price over £100 and up to £30,000, a breach claim', () => {
  const cc = (price, o = {}) => A({ paidBy: 'credit card', price, ...o }, '2026-10-15').angles;
  assert.deepEqual(cc(100), []); assert.deepEqual(cc(100.01), ['cca-s75']);
  assert.deepEqual(cc(30000), ['cca-s75']); assert.deepEqual(cc(30000.01), []);
  assert.deepEqual(A({ paidBy: 'debit card', price: 500 }, '2026-10-15').angles, []);
  assert.deepEqual(cc(500, { kind: 'service', faultFound: null }), ['cca-s75']);
  assert.deepEqual(cc(500, { changedMind: true, faultFound: null }), [], 'not on a cancellation');
  assert.deepEqual([L.S75_LOW, L.S75_HIGH, L.DISTANCE], [100, 30000, ['online', 'phone']]);
});

test('missing critical facts: abstain and name them, never guess', () => {
  const a = A({ delivered: null }, '2026-10-15');
  assert.deepEqual([a.abstain, a.missing, a.rights, a.remedy, a.deadlines, a.angles, a.next], [true, ['delivered'], [], null, [], [], 'ask-for-missing-facts']);
  assert.deepEqual(A({ faultFound: null }, '2026-10-15').missing, ['faultFound']);
  assert.deepEqual(A({ delivered: null, faultFound: null }, '2026-10-15').missing, ['delivered', 'faultFound']);
  assert.deepEqual(A({ kind: 'service', delivered: null, faultFound: null }, '2026-10-15').missing, ['delivered']);
  assert.deepEqual(A({ changedMind: true, delivered: null, faultFound: null }, '2026-10-15').missing, ['delivered']);
  assert.deepEqual(L.NEEDS, { 'goods-fault': ['delivered', 'faultFound'], 'service-poor': ['delivered'], 'distance-cancel': ['delivered'], 'no-statutory-right': [] });
  assert.ok(Object.isFrozen(L.NEEDS) && Object.isFrozen(L.DISTANCE));
});

test('same(): two answers agree only on everything a reader acts on', () => {
  const a = A({}, '2026-10-20');
  assert.equal(L.same(a, { ...a, rights: [...a.rights].reverse() }), true, 'order does not matter');
  for (const k of ['claim', 'remedy', 'abstain']) assert.equal(L.same(a, { ...a, [k]: 'x' }), false, k);
  assert.equal(L.same(a, { ...a, rights: a.rights.slice(1) }), false);
  assert.equal(L.same(a, { ...a, missing: ['delivered'] }), false);
  assert.equal(L.same(a, { ...a, angles: ['cca-s75'] }), false);
  assert.equal(L.same(a, { ...a, deadlines: [{ what: 'reject-by', date: '2026-10-30' }, a.deadlines[1]] }), false);
  assert.equal(L.same(a, { ...a, next: 'x', presumption: !a.presumption }), true, 'the next step and the presumption flag follow from the rest');
});

test('the gate reads only well-formed facts', () => {
  assert.deepEqual(G.firstObject('Here you go: {"a": {"b": "}"}, "c": "x\\"y"} trailing'), { a: { b: '}' }, c: 'x"y' });
  assert.equal(G.firstObject('no json here'), null);
  assert.equal(G.firstObject('{"a": 1'), null);
  assert.equal(G.firstObject('{"a": 1,}'), null);
  assert.deepEqual(G.firstObject('{}'), {});
  const good = { kind: 'goods', channel: 'online', price: 19.99, paidBy: 'cash', bought: '2026-10-01', delivered: null, faultFound: '2026-10-05', repairsTried: 0, changedMind: false, summary: 'A kettle broke.' };
  assert.deepEqual(G.readFacts(JSON.stringify({ ...good, extra: 1 }), V.SCHEMA), good);
  for (const [k, bad] of [['kind', 'car'], ['channel', 'post'], ['price', -1], ['price', '20'], ['price', Infinity], ['paidBy', 'paypal'], ['bought', '2026-02-30'], ['bought', '2026-10-1'], ['delivered', 5], ['repairsTried', 1.5], ['repairsTried', 10], ['repairsTried', -1], ['changedMind', 'no'], ['summary', 'x'.repeat(401)], ['summary', 3]])
    assert.equal(G.readFacts(JSON.stringify({ ...good, [k]: bad }), V.SCHEMA), null, k + ' = ' + JSON.stringify(bad));
  assert.equal(G.readFacts(JSON.stringify({ ...good, repairsTried: 9 }), V.SCHEMA).repairsTried, 9);
  assert.equal(G.readFacts(JSON.stringify({ ...good, summary: 'x'.repeat(400) }), V.SCHEMA).summary.length, 400);
  assert.equal(G.readFacts(JSON.stringify({ ...good, price: 0 }), V.SCHEMA).price, 0);
  assert.equal(G.readFacts('[1,2]', V.SCHEMA), null);
  assert.equal(G.readFacts('nothing', V.SCHEMA), null);
  const { summary, ...noSummary } = good;
  assert.equal(G.readFacts(JSON.stringify(noSummary), V.SCHEMA), null, 'every key is required');
});

test('the gate withholds a summary that cites law or names a date', () => {
  for (const s of ['Rights under s. 22 apply.', 'See section 9.', 'Under the Consumer Rights Act 2015 they owe a refund.', 'reg. 30 applies', 'regulation 29', 'it is a matter of statute'])
    assert.equal(G.cleanSummary(s).withheld, 'cites-law', s);
  for (const s of ['It broke on 3 March.', 'Bought 2026-03-03.', 'Delivered 03/03/2026.', 'It arrived March 3rd.', 'On the 3rd of March it failed.'])
    assert.equal(G.cleanSummary(s).withheld, 'names-a-date', s);
  assert.deepEqual(G.cleanSummary('  The client says a kettle from BrightHome stopped working.  '), { summary: 'The client says a kettle from BrightHome stopped working.', withheld: null });
  assert.deepEqual(G.cleanSummary('The actor in fact acted fairly in act one.'), { summary: 'The actor in fact acted fairly in act one.', withheld: null });
  assert.deepEqual(G.cleanSummary(undefined), { summary: '', withheld: null });
});

test('decide: abstain when unreadable or a fact is missing; otherwise the library\'s answer, cited from the table', () => {
  const ctx = { today: '2026-10-20', schema: V.SCHEMA, answer: L.answer, table: LAW };
  const fx = { ...base, summary: 'A laptop from Lumen Direct stopped working.' };
  const ok = G.decide(JSON.stringify(fx), ctx);
  assert.deepEqual([ok.abstain, ok.reason, ok.cites.map((p) => p.id)], [false, null, ['cra-s9', 'cra-s19-14', 'cra-s20', 'cra-s22', 'la-s5']]);
  assert.equal(ok.cites[0].cite, 'Consumer Rights Act 2015, s. 9');
  assert.equal(ok.summary, fx.summary);
  assert.deepEqual([G.decide('garbage', ctx).abstain, G.decide('garbage', ctx).reason], [true, 'could-not-read']);
  const miss = G.decide(JSON.stringify({ ...fx, delivered: null }), ctx);
  assert.deepEqual([miss.abstain, miss.reason, miss.missing, miss.cites], [true, 'missing-facts', ['delivered'], []]);
  const odd = G.decide(JSON.stringify(fx), { ...ctx, answer: () => ({ abstain: false, missing: [], rights: ['cra-s9', 'not-a-provision'], deadlines: [], angles: [] }) });
  assert.deepEqual([odd.abstain, odd.reason, odd.unknown], [true, 'not-in-verified-table', ['not-a-provision']]);
  const dated = G.decide(JSON.stringify({ ...fx, summary: 'It broke on 10 October.' }), ctx);
  assert.deepEqual([dated.summary, dated.withheld, dated.abstain], ['', 'names-a-date', false]);
});

test('citations are read in either order, specific before general, and nothing else counts', () => {
  const id = (s) => G.citeId(s, V.PATTERNS);
  const cases = [['Consumer Rights Act 2015, s. 22', 'cra-s22'], ['Section 9 of the Consumer Rights Act 2015', 'cra-s9'], ['CRA 2015 s.19(14)', 'cra-s19-14'], ['s 24(10) Consumer Rights Act', 'cra-s24-10'],
    ['Consumer Rights Act 2015 section 24', 'cra-s24'], ['Consumer Rights Act 2015, s. 24(5)', 'cra-s24'], ['Consumer Rights Act 2015 s. 22(3)', 'cra-s22'], ['Regulation 30 of the Consumer Contracts Regulations 2013', 'ccr-reg30'],
    ['Consumer Contracts Regulations 2013, reg. 34', 'ccr-reg34'], ['CCR 2013 reg 29', 'ccr-reg29'], ['Consumer Credit Act 1974 s75', 'cca-s75'], ['Limitation Act 1980, section 5', 'la-s5'],
    ['Consumer Rights Act 2015 s. 20', 'cra-s20'], ['Consumer Rights Act 2015 s. 23', 'cra-s23'], ['Consumer Rights Act 2015 s. 49', 'cra-s49'], ['Consumer Rights Act 2015 s. 55', 'cra-s55'], ['Consumer Rights Act 2015 s. 56', 'cra-s56'],
    ['Sale of Goods Act 1979 s14', null], ['Consumer Rights Act 2015 s. 99', null], ['Consumer Rights Act 2015, s. 220', null], ['Limitation Act 1980 s. 50', null], ['section 22', null]];
  for (const [s, want] of cases) assert.equal(id(s), want, s);
  assert.deepEqual(G.invented(['Consumer Rights Act 2015, s. 9', 'Sale of Goods Act 1979 s14', 'Consumer Credit Act 1974 s75'], ['cra-s9'], V.PATTERNS), ['Sale of Goods Act 1979 s14', 'Consumer Credit Act 1974 s75']);
  assert.deepEqual(V.PATTERNS.map(([k]) => k).sort(), LAW.map((p) => p.id).sort(), 'one pattern per provision in the table');
});

test('the memo: the review label always, angles as proposals, nothing but the gated result', () => {
  const ctx = { today: '2026-10-20', schema: V.SCHEMA, answer: L.answer, table: LAW };
  const r = G.decide(JSON.stringify({ ...base, paidBy: 'credit card', price: 450, summary: 'A laptop stopped working.' }), ctx);
  const m = M.render(r, { words: V.WORDS }).split('\n');
  assert.equal(m[0], 'CLAIM: faulty or not-as-described goods.');
  assert.equal(m[1], 'The complaint, as read: A laptop stopped working.');
  assert.ok(m.includes('PROVISIONS: ' + r.cites.map((p) => p.cite).join('; ') + '.'));
  assert.ok(m.includes('DEADLINE: the short-term right to reject ends on 2026-10-31.'));
  assert.ok(m.includes(M.PROPOSAL + V.WORDS.angles['cca-s75']));
  assert.equal(m.at(-2), 'NEXT: ' + V.WORDS.next['letter-before-action-14-days'] + '.');
  assert.equal(m.at(-1), M.LABEL);
  const ab = M.render(G.decide(JSON.stringify({ ...base, faultFound: null, summary: 'A kettle broke.' }), ctx), { words: V.WORDS }).split('\n');
  assert.deepEqual(ab, ['ABSTAINED: a critical fact is missing.', 'Needed before anyone relies on this: the date the fault appeared.', 'The complaint, as read: A kettle broke.', M.LABEL]);
  const unread = M.render(G.decide('??', ctx), { words: V.WORDS }).split('\n');
  assert.deepEqual(unread, ['ABSTAINED: the complaint could not be read reliably.', M.LABEL]);
  assert.equal(M.render({ abstain: false, answer: { claim: 'x', remedy: 'y', deadlines: [], angles: [], next: 'z' }, cites: [], summary: '' }, { words: {} }).split('\n')[0], 'CLAIM: x.', 'an unknown word shows as its key');
});

test('the vertical: the schema, the prompts, the target, and words for everything the library can say', () => {
  assert.deepEqual(V.FACT_KEYS, ['kind', 'channel', 'price', 'paidBy', 'bought', 'delivered', 'faultFound', 'repairsTried', 'changedMind']);
  assert.equal(V.slmTarget({ ...base, x: 1 }, 's'), JSON.stringify({ kind: 'goods', channel: 'online', price: 200, paidBy: 'debit card', bought: '2026-09-28', delivered: '2026-10-01', faultFound: '2026-10-10', repairsTried: 0, changedMind: false, summary: 's' }));
  assert.match(V.slmPrompt('A complaint.', '2026-10-20'), /^Today is 2026-10-20\. .*\n\nA complaint\.$/s);
  assert.match(V.rawPrompt('A complaint.'), /^Today is 2026-11-09\. You are assisting a solicitor/);
  assert.match(V.rawPrompt('A complaint.'), /Complaint:\nA complaint\.$/);
  assert.ok(V.basePrompt('A complaint.', '2026-10-20').startsWith(V.slmPrompt('A complaint.', '2026-10-20') + '\n\nAnswer with ONE JSON object'));
  for (const k of [...V.FACT_KEYS, 'summary']) assert.ok(V.basePrompt('x').includes('"' + k + '"'), k);
  assert.equal(V.TODAY, '2026-11-09');
  const seen = { claims: new Set(), remedies: new Set(), deadlines: new Set(), next: new Set(), angles: new Set(), facts: new Set() };
  for (const x of S.make(400, 5, 'train', V.TODAY)) { const a = L.answer({ ...x.facts, today: x.today }); seen.claims.add(a.claim); if (a.remedy) seen.remedies.add(a.remedy); a.deadlines.forEach((d) => seen.deadlines.add(d.what)); seen.next.add(a.next); a.angles.forEach((g) => seen.angles.add(g)); a.missing.forEach((k) => seen.facts.add(k)); }
  for (const [group, set] of Object.entries(seen)) for (const k of set) assert.ok(V.WORDS[group][k], group + ' ' + k);
  for (const k of ['missing-facts', 'could-not-read', 'not-in-verified-table']) assert.ok(V.WORDS.reasons[k]);
});

test('the complaints: seeded, splits that share no words, facts that hang together, the text saying what the facts say', () => {
  const r = S.rng(3), xs = Array.from({ length: 1000 }, r);
  assert.ok(xs.every((x) => x >= 0 && x < 1)); assert.deepEqual(S.rng(3)(), xs[0]); assert.notEqual(S.rng(4)(), xs[0]);
  assert.deepEqual([S.say('2026-03-03', 0), S.say('2026-03-03', 1), S.say('2026-03-03', 2), S.say('2026-03-03', 3)], ['3 March 2026', 'March 3, 2026', '03/03/2026', 'the 3rd of March 2026']);
  assert.deepEqual([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 31].map((d) => S.say('2026-01-' + String(d).padStart(2, '0'), 3).split(' ')[1]), ['1st', '2nd', '3rd', '4th', '11th', '12th', '13th', '21st', '22nd', '23rd', '31st']);
  assert.deepEqual(S.make(20, 9, 'held', V.TODAY), S.make(20, 9, 'held', V.TODAY));
  for (const k of ['items', 'services', 'sellers', 'faults']) assert.equal(S.BANKS.train[k].filter((w) => S.BANKS.held[k].includes(w)).length, 0, k);
  const all = [...S.make(300, 11, 'train', V.TODAY), ...S.make(120, 23, 'held', V.TODAY)];
  let missing = 0;
  for (const x of all) {
    const f = x.facts, said = (d) => [0, 1, 2, 3].some((s) => x.text.includes(S.say(d, s)));
    assert.ok(x.today <= V.TODAY && (!f.delivered || (f.delivered >= f.bought && x.today >= f.delivered)) && (!f.faultFound || !f.delivered || f.faultFound >= f.delivered), x.id);
    assert.ok(said(f.bought), x.id + ' says when it was bought');
    assert.equal(f.delivered ? said(f.delivered) : true, true, x.id + ' says the delivery date it has');
    assert.equal(f.faultFound ? said(f.faultFound) : true, true, x.id);
    assert.ok(x.text.includes(f.paidBy), x.id);
    assert.ok(x.text.includes(f.price.toLocaleString('en-GB', { minimumFractionDigits: Number.isInteger(f.price) ? 0 : 2 })), x.id + ' names the price');
    assert.equal(G.cleanSummary(x.summary).withheld, null, 'a training summary never cites law or dates');
    if (L.answer({ ...f, today: x.today }).abstain) missing++;
  }
  assert.ok(missing > 0.15 * all.length && missing < 0.35 * all.length, 'about a quarter leave out a critical fact: ' + missing);
});

test('the generator is pinned: the exact complaints the model was trained and judged on', async () => {
  const { createHash } = await import('node:crypto');
  const h = (x) => createHash('sha256').update(JSON.stringify(x)).digest('hex');
  assert.equal(h(S.make(360, 11, 'train', V.TODAY)), '31e98808323a9b536688c6cbb45662cee014956ebff4f4e07d9458d6c9d446ba');
  assert.equal(h(S.make(80, 23, 'held', V.TODAY)), '55e9c5114c7ca09f3a93d42cb41439ea16e8a57924eeafb590bf040e220594db');
});

const CTX = { schema: V.SCHEMA, factKeys: V.FACT_KEYS, answer: L.answer, table: LAW, patterns: V.PATTERNS, words: V.WORDS, render: M.render, label: M.LABEL, proposal: M.PROPOSAL };
const row = (o = {}, today = '2026-10-20') => ({ id: 'h-1', today, facts: { ...base, ...o }, summary: 'A laptop stopped working.' });
const out = (f, summary = 'A laptop stopped working.') => V.slmTarget(f, summary);

test('score: exact answers and facts, one rule for every case', () => {
  const t = L.answer({ ...base, today: '2026-10-20' });
  assert.equal(SC.exactAnswer(t, { ...t, rights: [...t.rights].reverse(), deadlines: [...t.deadlines].reverse(), angles: ['cca-s75'] }), true, 'angles are scored apart');
  for (const k of ['claim', 'remedy', 'abstain']) assert.equal(SC.exactAnswer({ ...t, [k]: 'x' }, t), false, k);
  assert.equal(SC.exactAnswer({ ...t, rights: t.rights.slice(1) }, t), false);
  assert.equal(SC.exactAnswer({ ...t, rights: [...t.rights, 'cca-s75'] }, t), false);
  assert.equal(SC.exactAnswer({ ...t, deadlines: [{ what: 'reject-by', date: '2026-10-30' }, t.deadlines[1]] }, t), false);
  assert.equal(SC.exactFacts(null, base, V.FACT_KEYS), false);
  assert.equal(SC.exactFacts({ ...base }, base, V.FACT_KEYS), true);
  assert.equal(SC.exactFacts({ ...base, price: 200.01 }, base, V.FACT_KEYS), false);
});

test('score: the stack on one case: right, wrong, a guessed fact, unreadable, the angle and the label', () => {
  const good = SC.stackCase(row(), out(base), CTX);
  assert.deepEqual([good.read, good.factsExact, good.correct, good.abstained, good.invented, good.labelled, good.truthAbstains, good.s75True, good.s75Proposed], [true, true, true, false, 0, true, false, false, false]);
  const wrongDate = SC.stackCase(row(), out({ ...base, delivered: '2026-09-01' }), CTX);
  assert.deepEqual([wrongDate.factsExact, wrongDate.correct, wrongDate.invented, wrongDate.labelled], [false, false, 0, true], 'a misread date gives a wrong answer, but nothing invented');
  const guessed = SC.stackCase(row({ delivered: null }), out(base), CTX);
  assert.deepEqual([guessed.truthAbstains, guessed.abstained, guessed.correct], [true, false, false], 'making up a missing date is wrong');
  const careful = SC.stackCase(row({ delivered: null }), out({ ...base, delivered: null }), CTX);
  assert.deepEqual([careful.abstained, careful.correct, careful.labelled], [true, true, true]);
  const junk = SC.stackCase(row(), 'I think it is a refund.', CTX);
  assert.deepEqual([junk.read, junk.factsExact, junk.abstained, junk.correct, junk.labelled], [false, false, true, false, true]);
  const cc = { ...base, paidBy: 'credit card', price: 450 };
  const s75 = SC.stackCase(row(cc), out(cc), CTX);
  assert.deepEqual([s75.s75True, s75.s75Proposed], [true, true]);
  assert.deepEqual([SC.stackCase(row(cc), out(base), CTX).s75Proposed, SC.stackCase(row(base), out(cc), CTX).s75Proposed], [false, true]);
});

test('score: a raw model by the same rule; its citations sorted, never called invented when real but outside the table', () => {
  const t = L.answer({ ...base, today: '2026-10-20' });
  const cites = ['Consumer Rights Act 2015, s. 9', 'CRA 2015 s.19(14)', 'Consumer Rights Act 2015, s. 20', 'Consumer Rights Act 2015, s. 22', 'Limitation Act 1980, s. 5'];
  const ans = (o) => JSON.stringify({ claim: 'goods-fault', remedy: 'reject', provisions: cites, deadlines: t.deadlines, angles: [], ...o });
  assert.deepEqual(Object.values(SC.rawCase(row(), ans({}), CTX)), ['h-1', false, true, true, 0, 0]);
  const extra = SC.rawCase(row(), ans({ provisions: [...cites, 'Sale of Goods Act 1979 s14', 'Consumer Credit Act 1974 s75'] }), CTX);
  assert.deepEqual([extra.correct, extra.outsideTable, extra.notApplicable], [false, 1, 1], 'a cited table provision that does not apply makes it wrong; one outside the table is only counted');
  const outside = SC.rawCase(row(), ans({ provisions: [...cites, 'Sale of Goods Act 1979 s14'] }), CTX);
  assert.deepEqual([outside.correct, outside.outsideTable], [true, 1]);
  assert.equal(SC.rawCase(row(), ans({ remedy: 'repair-or-replacement' }), CTX).correct, false);
  assert.equal(SC.rawCase(row(), ans({ deadlines: [] }), CTX).correct, false);
  assert.equal(SC.rawCase(row(), ans({ deadlines: [{ what: 'reject-by', date: '2026-10-31' }, { what: 'limitation', date: '2032-10-01' }, 'junk'] }), CTX).correct, true);
  assert.equal(SC.rawCase(row(), ans({ claim: 'cannot-tell' }), CTX).correct, false, 'abstaining on a complete case is wrong');
  assert.equal(SC.rawCase(row({ delivered: null }), ans({ claim: 'cannot-tell' }), CTX).correct, true);
  assert.equal(SC.rawCase(row({ delivered: null }), ans({}), CTX).correct, false);
  assert.deepEqual([SC.rawCase(row(), 'no json', CTX).parsed, SC.rawCase(row(), 'no json', CTX).correct], [false, false]);
  assert.deepEqual(SC.rawCase(row(), JSON.stringify({ claim: 'goods-fault' }), CTX).outsideTable, 0, 'no provisions listed is not an invention');
  assert.equal(SC.rawCase(row(), JSON.stringify({ claim: 'goods-fault', remedy: 'reject', provisions: cites, deadlines: 'soon' }), CTX).correct, false);
});

test('score: the paired bootstrap', () => {
  assert.equal(SC.pairedLow([1, 1, 1, 1], [1, 1, 1, 1]), 0);
  assert.equal(SC.pairedLow([1, 1, 1, 1], [0, 0, 0, 0]), 1);
  assert.equal(SC.pairedLow([0, 0], [1, 1]), -1);
  const a = Array.from({ length: 40 }, (_, i) => (i % 4 ? 1 : 0)), b = Array.from({ length: 40 }, (_, i) => (i % 2 ? 1 : 0));
  const low = SC.pairedLow(a, b);
  assert.equal(low, SC.pairedLow(a, b), 'seeded');
  assert.ok(low > 0 && low < 0.25, 'a real lead, a lower bound under the mean: ' + low);
});

const C1 = (o = {}) => ({ factsExact: true, correct: true, abstained: false, truthAbstains: false, invented: 0, s75True: false, s75Proposed: false, labelled: true, ...o });
const R1 = (o = {}) => ({ correct: false, outsideTable: 0, notApplicable: 0, parsed: true, ...o });
test('score: the record and every verdict at its bar, on whole counts', () => {
  const local = { device: 'cpu', networkDisabled: true, adapterBytes: 35 * 1024 * 1024 };
  const mk = (n, tuned, bs, raw) => SC.record({ tuned: Array.from({ length: n }, (_, i) => tuned(i)), base: Array.from({ length: n }, (_, i) => bs(i)), raw: Array.from({ length: n }, (_, i) => raw(i)) }, local);
  const v = (rec) => Object.fromEntries(SC.verdicts(rec).map((x) => [x.id, x.pass]));
  const good = mk(20, (i) => C1({ truthAbstains: i < 4, abstained: i < 4, s75True: i > 15, s75Proposed: i > 15, correct: i < 17 }), () => C1({ factsExact: false, correct: false }), () => R1());
  assert.deepEqual(v(good), { S1: true, S2: true, S3: true, S4: true, S5: true, S6: true, S7: true });
  assert.equal(good.correct.stack, 17, '17 of 20 is exactly 0.85');
  assert.equal(v(mk(20, (i) => C1({ correct: i < 16 }), () => C1({ factsExact: false }), () => R1())).S2, false, '16 of 20 is under 0.85');
  assert.equal(v(mk(20, (i) => C1({ factsExact: i < 16 }), () => C1({ factsExact: false }), () => R1())).S1, true, '16 of 20 is exactly 0.80');
  assert.equal(v(mk(20, (i) => C1({ factsExact: i < 15 }), () => C1({ factsExact: false }), () => R1())).S1, false);
  assert.equal(v(mk(20, () => C1(), () => C1(), () => R1())).S1, false, 'no lead over the base');
  assert.equal(v(mk(20, () => C1(), () => C1(), () => R1({ correct: true }))).S2, false, 'no lead over the raw model');
  assert.equal(v(mk(20, (i) => C1({ invented: i === 3 ? 1 : 0 }), () => C1({ factsExact: false }), () => R1())).S3, false);
  assert.equal(v(mk(20, (i) => C1({ truthAbstains: i < 10, abstained: i < 9 }), () => C1({ factsExact: false }), () => R1())).S4, true, '9 of 10');
  assert.equal(v(mk(20, (i) => C1({ truthAbstains: i < 10, abstained: i < 8 }), () => C1({ factsExact: false }), () => R1())).S4, false, '8 of 10');
  assert.equal(v(mk(20, (i) => C1({ truthAbstains: i < 10, abstained: i < 11 }), () => C1({ factsExact: false }), () => R1())).S4, true, '1 of 10 complete is exactly 0.10');
  assert.equal(v(mk(20, (i) => C1({ truthAbstains: i < 10, abstained: i < 12 }), () => C1({ factsExact: false }), () => R1())).S4, false, '2 of 10');
  assert.equal(v(mk(20, () => C1(), () => C1({ factsExact: false }), () => R1())).S4, false, 'nothing to abstain on proves nothing');
  assert.equal(v(mk(40, (i) => C1({ s75True: i < 20, s75Proposed: i < 19 }), () => C1({ factsExact: false }), () => R1())).S5, true, '19 of 20');
  assert.equal(v(mk(40, (i) => C1({ s75True: i < 20, s75Proposed: i < 18 }), () => C1({ factsExact: false }), () => R1())).S5, false);
  assert.equal(v(mk(40, (i) => C1({ s75True: i < 20, s75Proposed: i < 21 }), () => C1({ factsExact: false }), () => R1())).S5, false, 'proposed where it does not apply');
  assert.equal(v(mk(20, () => C1(), () => C1({ factsExact: false }), () => R1())).S5, false, 'never applying proves nothing');
  assert.equal(v(mk(20, (i) => C1({ labelled: i !== 7 }), () => C1({ factsExact: false }), () => R1())).S6, false);
  const rec = mk(20, () => C1(), () => C1({ factsExact: false }), () => R1({ outsideTable: 2, notApplicable: 1, parsed: false }));
  assert.deepEqual(rec.invented, { stack: 0, rawOutsideTable: 40, rawNotApplicable: 20, rawParsed: 0 });
  assert.deepEqual([rec.labelled.stack, rec.labelled.base, rec.correct.baseStack], [20, 20, 20]);
  for (const [k, val] of [['device', 'gpu'], ['networkDisabled', false], ['adapterBytes', 50 * 1024 * 1024 + 1]]) assert.equal(v(SC.record({ tuned: [C1()], base: [C1()], raw: [R1()] }, { ...local, [k]: val })).S7, false, k);
  assert.equal(v(SC.record({ tuned: [C1()], base: [C1()], raw: [R1()] }, { ...local, adapterBytes: 50 * 1024 * 1024 })).S7, true);
  assert.deepEqual(SC.verdicts(good).map((x) => x.id), ['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7']);
  assert.deepEqual(SC.verdicts(good)[0].measured, ['20/20', '0/20', good.facts.low]);
});
