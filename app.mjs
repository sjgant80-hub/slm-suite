// app.mjs — the page's glue. Every number comes from the committed record or drafts, or is computed in this tab by the
// same stack and library the evaluation used (claim S9: none is typed into index.html). Model outputs are RECORDED (the
// committed drafts); the library, the gate and the memo run LIVE here.
import { mintCase, sourcesOf } from './vendor/liveware/mintcase.mjs';
import G from './stack/gate.mjs';
import M from './stack/memo.mjs';
import SC from './stack/score.mjs';
import L from './verticals/legal/library.mjs';
import V from './verticals/legal/vertical.mjs';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = document.createElement(tag); for (const [k, v] of Object.entries(props)) if (k === 'class') e.className = v; else e.setAttribute(k, v); for (const c of kids) e.append(c); return e; };
const json = (p) => fetch(p).then((r) => (r.ok ? r.json() : null)).catch(() => null);
const lines = (p) => fetch(p).then((r) => (r.ok ? r.text() : '')).then((t) => t.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))).catch(() => []);
const pct = (a, n) => (n ? Math.round((1000 * a) / n) / 10 + '%' : '—');
const chip = (pass) => el('span', { class: 'chip ' + (pass ? 'win' : 'bad') }, pass ? 'HELD' : 'FAILED');
let REC = null, LAW = [], HELD = [], DRAFT = {}, RAW = {}, BASIS = null, PROBE = null, K = 0;
const ctx = () => ({ today: null, schema: V.SCHEMA, answer: L.answer, table: LAW });

function fill() {
  const r = REC.record, v = REC.verdicts, held = v.filter((x) => x.pass), failed = v.filter((x) => !x.pass);
  $('verdictline').textContent = held.length + ' of ' + v.length + ' sealed claims held. On ' + r.n + ' complaints it never saw, the associate was exactly right or rightly abstained on ' + pct(r.correct.stack, r.n) + '; qwen2.5:7b on its own managed ' + pct(r.correct.raw, r.n) + '.' + (failed.length ? ' Failed and kept: ' + failed.map((x) => x.id).join(', ') + '.' : '');
  const show = (x) => (Array.isArray(x.measured) ? x.measured.join(' · ') : String(x.measured));
  $('claims').querySelector('tbody').replaceChildren(...v.map((x) => el('tr', {}, el('td', {}, el('b', {}, x.id)), el('td', {}, x.what), el('td', {}, show(x)), el('td', {}, x.bar), el('td', {}, chip(x.pass)))),
    ...[['S8', 'The evaluation re-derives byte for byte from the committed drafts'], ['S9', 'No measured number typed into this page'], ['S10', 'Every provision carries its legislation.gov.uk address and the OGL; the base model\'s licence ships with the adapter']].map(([id, w]) => el('tr', {}, el('td', {}, el('b', {}, id)), el('td', {}, w), el('td', {}, 'checked in CI'), el('td', {}, '—'), el('td', {}, el('span', { class: 'chip win' }, 'CI')))));
  const row = (label, a, b, c) => el('tr', {}, el('td', {}, label), el('td', { class: 'num' }, a), el('td', { class: 'num' }, b), el('td', { class: 'num' }, c));
  $('three').querySelector('tbody').replaceChildren(
    row('exactly right, or rightly abstained', pct(r.correct.stack, r.n), pct(r.correct.baseStack, r.n), pct(r.correct.raw, r.n)),
    row('every fact read exactly right', pct(r.facts.tuned, r.n), pct(r.facts.base, r.n), '—'),
    row('provisions cited that no verified rule gave', String(r.invented.stack), '—', r.invented.rawNotApplicable + ' verified but not applicable, ' + r.invented.rawOutsideTable + ' outside the table'));
  $('lesson').textContent = 'The trained 0.5B read every fact right on ' + pct(r.facts.tuned, r.n) + ' of the complaints; the same model untrained, even told the exact keys, managed ' + pct(r.facts.base, r.n) + '. Inside the stack that became ' + pct(r.correct.stack, r.n) + ' exactly right or rightly abstained, against ' + pct(r.correct.raw, r.n) + ' for a model fourteen times its size answering on its own. The associate cited nothing the library did not give (' + r.invented.stack + '), abstained on ' + r.abstain.abstainedOnIncomplete + ' of the ' + r.abstain.incomplete + ' complaints missing a critical fact (and on ' + r.abstain.abstainedOnComplete + ' of the ' + r.abstain.complete + ' complete ones), and proposed section 75 on ' + r.s75.proposedWhereApplies + ' of the ' + r.s75.applies + ' where it applies and on ' + r.s75.proposedWhereNot + ' where it does not.' + (failed.length ? ' Said straight: ' + failed.map((x) => x.id + ' missed its bar (' + x.bar + '; measured ' + show(x) + ')').join('; ') + '. Those failures stay on the record. A reader of this associate’s memo still checks the facts it read, which is what the review label on every memo is for.' : '');
  $('results').replaceChildren(...v.map((x) => el('li', {}, x.id + ' (' + (x.pass ? 'held' : 'failed') + '): ' + x.what + ': ' + show(x) + '.')));
  $('faq-invent').textContent = 'It cites only provisions in its verified table, and only those the library says apply. On the held-out set it cited ' + r.invented.stack + ' provisions or dates the library did not give. The bigger model on its own cited ' + r.invented.rawNotApplicable + ' verified provisions that did not apply, and ' + r.invented.rawOutsideTable + ' from outside the table.';
  $('faq-abstain').textContent = 'It abstains and names the missing fact. On the held-out set it abstained on ' + r.abstain.abstainedOnIncomplete + ' of the ' + r.abstain.incomplete + ' complaints missing a critical fact, and on ' + r.abstain.abstainedOnComplete + ' of the ' + r.abstain.complete + ' complete ones.';
  // the raw model's empty answers: counted from the committed drafts, explained by the probe receipt, never typed in
  const rawIds = Object.keys(RAW), empties = rawIds.filter((id) => RAW[id] === ''), gave = REC.cases.raw.filter((c) => RAW[c.id] !== '');
  // the probe re-asked exactly the empty ones (the page test checks that); count what Ollama said back, never type it
  const covered = !!PROBE && PROBE.empty === empties.length;
  const aborted = covered ? PROBE.probes.filter((p) => /token repeat limit/.test(p.error || '')).length : 0;
  const answered = covered ? PROBE.probes.filter((p) => p.status === 200 && p.responseChars > 0).length : 0;
  const otherwise = covered ? PROBE.empty - aborted - answered : 0;
  const rightRaw = gave.filter((c) => c.correct).length;
  const why = !covered ? 'the reason is not yet recorded.'
    : (aborted ? aborted + ' were stopped by Ollama again (“prediction aborted, token repeat limit reached”: the model kept repeating the same token inside its JSON answer)' : '')
      + (answered ? (aborted ? ', and ' : '') + answered + ' answered normally this time, so on a machine other jobs were sharing, the stop does not repeat every time' : '')
      + (otherwise ? (aborted || answered ? ', and ' : '') + otherwise + ' failed some other way (see raw-probe.json)' : '') + '.';
  $('raw-empty').textContent = empties.length
    ? 'Of qwen2.5:7b’s ' + rawIds.length + ' answers, ' + empties.length + ' came back empty. Asked again with byte-for-byte the same request, ' + why + ' The sealed rule scores the answers it recorded, so an empty answer counts as wrong. On the ' + gave.length + ' complaints where it did answer, it was exactly right or rightly abstained on ' + rightRaw + '.'
      + (answered ? ' Even if all ' + answered + ' re-asked answers had been right, it would have reached ' + pct(REC.record.correct.raw + answered, REC.record.n) + ', against the associate’s ' + pct(REC.record.correct.stack, REC.record.n) + '.' : '')
    : 'qwen2.5:7b answered all ' + rawIds.length + ' complaints.';
  $('faq-fair').textContent = 'It was asked the same complaint, on the same laptop, at temperature 0, with the exact list of claim types and remedies to choose from, the option to say "cannot-tell", and the dates it had to give. It had no library and no gate: that is the point of the comparison. ' + (empties.length ? empties.length + ' of its answers came back empty' + (aborted ? ', most because Ollama stopped it repeating itself' : '') + '; on the ' + gave.length + ' it did give, it was exactly right on ' + rightRaw + '. The note under the results table says what happened when the empty ones were asked again.' : 'It answered every complaint.');
  $('faq-failed').textContent = failed.length ? failed.map((x) => x.id + ': ' + x.what + ', measured ' + show(x) + '.').join(' ') + ' Each failure is kept on the record and on this page.' : 'Nothing measured failed its bar on this run. The limits are listed in the white paper.';
  $('parts').replaceChildren(...[['stack/gate.mjs', 'The gate: reads the model\'s facts against the schema, withholds a summary that cites law or dates, abstains on a missing fact.'], ['stack/memo.mjs', 'The memo and the human contract: the review label on every output, angles as proposals.'], ['stack/score.mjs', 'The evaluation: one rule for the stack and the raw model, the paired bootstrap, every claim on whole counts.'], ['verticals/legal/library.mjs', 'The verified library: the claim, the provisions, the remedy and every deadline date, from the legislation.'], ['verticals/legal/law.json', 'The verified table: 14 provisions, each with its legislation.gov.uk address, under the OGL.'], ['adapter/legal/', 'The trained LoRA adapter, with the base model\'s Apache-2.0 licence.']]
    .map(([h, t]) => el('div', { class: 'card' }, el('div', { class: 'k' }, h), el('p', { style: 'font-size:14.5px;margin-top:4px' }, t))));
}

function watch() {
  const h = HELD[K], out = DRAFT[h.id] || '', today = h.today;
  $('w-pick').value = String(K);
  $('w-text').textContent = h.text;
  $('w-today').textContent = 'Written on ' + today + '.';
  const facts = G.readFacts(out, V.SCHEMA);
  $('w-facts').textContent = facts ? JSON.stringify(facts, null, 1) : out || '(no draft recorded)';
  const r = G.decide(out, { ...ctx(), today });
  $('w-memo').textContent = M.render(r, { words: V.WORDS });
  const s = SC.stackCase(h, out, { schema: V.SCHEMA, factKeys: V.FACT_KEYS, answer: L.answer, table: LAW, patterns: V.PATTERNS, words: V.WORDS, render: M.render, label: M.LABEL, proposal: M.PROPOSAL, angle: 'cca-s75' });
  $('w-verdict').replaceChildren(el('span', { class: 'chip ' + (s.correct ? 'win' : 'bad') }, s.correct ? 'RIGHT' : 'WRONG'), ' against the truth this complaint was written from' + (s.truthAbstains ? ' (a critical fact is missing from it)' : '') + '.');
  const rawOut = RAW[h.id] || '', o = G.firstObject(rawOut);
  $('w-raw').textContent = o ? JSON.stringify(o, null, 1) : rawOut || (h.id in RAW ? '(empty: see the note under the results table)' : '(no answer recorded)');
  const rc = SC.rawCase(h, rawOut, { answer: L.answer, patterns: V.PATTERNS });
  $('w-rawcheck').replaceChildren(el('span', { class: 'chip ' + (rc.correct ? 'win' : 'bad') }, rc.correct ? 'RIGHT' : 'WRONG'), ' · ' + rc.notApplicable + ' verified provisions cited that do not apply · ' + rc.outsideTable + ' citations outside the verified table.');
}

function tryIt() {
  const d = (id) => $(id).value || null;
  const f = { kind: $('t-kind').value, channel: $('t-channel').value, price: Number($('t-price').value), paidBy: $('t-paid').value, bought: d('t-bought'), delivered: d('t-delivered'), faultFound: $('t-kind').value === 'goods' && !$('t-mind').checked ? d('t-fault') : null, repairsTried: Math.max(0, Math.min(9, Math.floor(Number($('t-repairs').value) || 0))), changedMind: $('t-mind').checked, summary: '' };
  if (!f.bought) { $('t-memo').textContent = 'Set the date it was bought.'; return; }
  $('t-memo').textContent = M.render(G.decide(JSON.stringify(f), { ...ctx(), today: d('t-today') || V.TODAY }), { words: V.WORDS });
}

const gbp = (x) => '£' + Math.round(x).toLocaleString('en-GB');
function renderCost() {
  if (!BASIS) { $('c-head').textContent = 'The sourced basis did not load; reload the page.'; return; }
  const v = (id) => Number($(id).value);
  const r = mintCase(BASIS, { hoursPerWeek: v('c-hours'), share: v('c-share') / 100, seats: v('c-seats'), casesPerWeek: v('c-cases'), years: v('c-years') });
  if (!r.ok) { $('c-head').textContent = 'Check the inputs: ' + r.why + '.'; return; }
  const yrs = r.inputs.years + (r.inputs.years === 1 ? ' year' : ' years');
  $('c-overh').textContent = 'Over ' + yrs;
  $('c-head').textContent = `This intake costs you ${gbp(r.perYear.today)} a year in staff time today. Owning it: ${gbp(r.perYear.own)} a year, which is ${gbp(r.savingPerYear)} a year back and ${gbp(r.savingOver)} over ${yrs}.`;
  const rows = [['Today', 'Your team does the first screen by hand.', 'today'], ['Rent AI assistant seats', `Microsoft 365 Copilot for ${r.inputs.seats} people (${gbp(r.lines.seats)} a year). It helps each person; the work, and the staff time, stay.`, 'rentSeats'],
    ['Call a cloud AI on every case', `Takes the same share off, billed per case at Claude Sonnet 5 API rates (${gbp(r.lines.api)} a year at your volume), and every client's complaint leaves your building.`, 'cloudApi'],
    ['Own it', `Takes the same share off on a machine you already have, for about ${gbp(r.lines.power)} a year of electricity. No seats, no meter, nothing leaves.`, 'own']];
  $('c-table').querySelector('tbody').replaceChildren(...rows.map(([a, b, k]) => el('tr', {}, el('td', {}, el('b', {}, a)), el('td', {}, b), el('td', { class: 'num' }, gbp(r.perYear[k])), el('td', { class: 'num' }, gbp(r.over[k])))));
  $('c-note').textContent = `Owning beats the cloud route by ${gbp(r.versusCloudOver)} over ${yrs} at this volume. Staff time is a floor: the UK median wage, with on-costs left out. The share taken off is yours to estimate; the held-out result above is the evidence for it.`;
}

async function main() {
  const [rec, law, held, tuned, raw, basis] = await Promise.all([json('data/record.json'), json('verticals/legal/law.json'), lines('data/held.jsonl'), lines('data/drafts-tuned.jsonl'), lines('data/drafts-raw.jsonl'), json('vendor/liveware/basis.json')]);
  REC = rec; LAW = law ? law.provisions : []; HELD = held; BASIS = basis;
  for (const d of tuned) DRAFT[d.id] = d.output;
  for (const d of raw) RAW[d.id] = d.output;
  $('c-src').replaceChildren(...sourcesOf(BASIS || {}).map((s) => { const li = el('li', {}, s.what + (s.source ? ': ' : '')); if (s.source) { const a = el('a', { href: s.source, rel: 'noopener' }); try { a.textContent = new URL(s.source).hostname; } catch { a.textContent = s.source; } li.append(a); } return li; }));
  for (const id of ['c-hours', 'c-share', 'c-seats', 'c-cases', 'c-years']) $(id).addEventListener('input', renderCost);
  renderCost();
  for (const el2 of document.querySelectorAll('#t-form input, #t-form select')) el2.addEventListener('input', tryIt);
  tryIt();
  if (HELD.length) {
    $('w-pick').replaceChildren(...HELD.map((h, i) => el('option', { value: String(i) }, h.id + (L.answer({ ...h.facts, today: h.today }).abstain ? ' (a fact missing)' : ''))));
    $('w-pick').onchange = () => { K = Number($('w-pick').value); watch(); };
    $('w-prev').onclick = () => { K = (K + HELD.length - 1) % HELD.length; watch(); };
    $('w-next').onclick = () => { K = (K + 1) % HELD.length; watch(); };
    watch();
  }
  // the timings, read from the training log and the inference receipt, never typed in
  const [tlog, meta, probe] = await Promise.all([json('data/train-log.json'), json('data/drafts-tuned.jsonl.meta.json'), json('data/raw-probe.json')]);
  PROBE = probe;
  const dur = (s) => (s >= 3600 ? Math.floor(s / 3600) + ' h ' + Math.round((s % 3600) / 60) + ' min' : s >= 90 ? Math.round(s / 60) + ' minutes' : Math.round(s) + ' seconds');
  $('t-train').textContent = tlog && tlog.seconds ? dur(tlog.seconds) + ' (' + (tlog.steps ? tlog.steps.length : '?') + ' steps over ' + tlog.rows + ' complaints, ' + (tlog.config ? tlog.config.epochs : '?') + ' passes)' : '…';
  $('t-memo').textContent = meta && meta.seconds && HELD.length ? dur(meta.seconds / HELD.length) + ' (' + HELD.length + ' memos in ' + dur(meta.seconds) + ')' : '…';
  if (!REC) { $('verdictline').textContent = 'The record did not load; reload the page.'; return; }
  fill();
}
main();
