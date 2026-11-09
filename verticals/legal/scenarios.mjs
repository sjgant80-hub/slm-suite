// verticals/legal/scenarios.mjs — synthetic UK consumer complaints, written from structured facts (pure, seeded).
// The facts come first; the complaint is written from them in plain words, so the truth for every complaint is the
// library run on the facts it was written from. TRAIN and HELD use DIFFERENT phrasing banks, item, service and seller
// words: the held-out complaints test reading, not recall. About a quarter leave out a critical fact.

import { addDays, claimOf, NEEDS } from './library.mjs';

/** rng(seed) → a seeded generator of numbers in [0, 1) (mulberry32) */
export function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const pick = (r, xs) => xs[Math.floor(r() * xs.length)];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const ord = (d) => d + (d % 10 === 1 && d !== 11 ? 'st' : d % 10 === 2 && d !== 12 ? 'nd' : d % 10 === 3 && d !== 13 ? 'rd' : 'th');
/** say(iso, style) → a date as people write it */
export function say(isoDate, style) {
  const [y, m, d] = isoDate.split('-').map(Number);
  return style === 0 ? d + ' ' + MONTHS[m - 1] + ' ' + y : style === 1 ? MONTHS[m - 1] + ' ' + d + ', ' + y : style === 2 ? String(d).padStart(2, '0') + '/' + String(m).padStart(2, '0') + '/' + y : 'the ' + ord(d) + ' of ' + MONTHS[m - 1] + ' ' + y;
}
const money = (p) => '£' + (Number.isInteger(p) ? p.toLocaleString('en-GB') : p.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export const BANKS = Object.freeze({
  train: {
    items: ['washing machine', 'laptop', 'kettle', 'pair of boots', 'sofa', 'mobile phone', 'fridge freezer', 'bicycle', 'coffee machine', 'television', 'vacuum cleaner', 'office chair'],
    services: ['boiler service', 'car repair', 'kitchen fitting', 'carpet cleaning', 'roof repair', 'garden landscaping'],
    sellers: ['BrightHome', 'Northgate Electricals', 'Cobble & Co', 'Riverside Stores', 'Lumen Direct', 'Oakfield Traders'],
    faults: ['stopped working', 'started leaking', 'cracked', 'would not turn on', 'kept switching itself off', 'fell apart'],
    open: ['I want to complain about {thing} from {seller}.', 'This is about {thing} I got from {seller}.', 'Writing about a problem with {seller}.'],
    buy: { shop: ['I bought it in their shop on {bought}', 'I went into the store and bought it on {bought}'], online: ['I ordered it on their website on {bought}', 'I bought it online on {bought}'], phone: ['I ordered it over the phone on {bought}', 'I phoned them and placed the order on {bought}'] },
    paid: ['and paid {price} by {paidBy}.', 'costing {price}, which I paid by {paidBy}.'],
    arrive: ['It was delivered on {delivered}.', 'It arrived on {delivered}.'],
    arriveShop: ['I took it home the same day, {delivered}.', 'I collected it on {delivered}.'],
    done: ['They did the work on {delivered}.', 'The job was carried out on {delivered}.'],
    noDate: ['I am not sure when it came.', 'I do not remember the delivery date.'],
    fault: ['On {faultFound} it {fault}.', 'It {fault} on {faultFound}.'],
    faultNoDate: ['At some point it {fault}.', 'It has since {fault}, though I did not note when.'],
    poor: ['The work was poor and had to be looked at again.', 'The job was done badly.'],
    repairs: ['They have not tried to fix it yet.', 'They repaired it once but it went wrong again.', 'They have repaired it twice and it is still faulty.'],
    redo: ['They have not come back to redo it.', 'They came back once to redo it and it is still not right.'],
    mind: ['I have simply changed my mind and want to send it back.', 'Nothing is wrong with it; I just do not want it any more.'],
  },
  held: {
    items: ['dishwasher', 'tablet computer', 'toaster', 'winter coat', 'dining table', 'smartwatch', 'tumble dryer', 'electric scooter', 'blender', 'games console', 'air fryer', 'desk lamp'],
    services: ['plumbing repair', 'window installation', 'house painting', 'electrical rewiring', 'driveway resurfacing', 'appliance installation'],
    sellers: ['Hollow Lane Ltd', 'Meridian Retail', 'Copperleaf', 'Fenwick & Daughters', 'Starling Supplies', 'Quayside Goods'],
    faults: ['broke down', 'developed a crack', 'stopped charging', 'gave off a burning smell', 'kept freezing', 'lost a part'],
    open: ['Hello, I need help with a dispute with {seller} over {thing}.', 'My problem is with {thing} supplied by {seller}.', 'Could someone look at my issue with {seller}?'],
    buy: { shop: ['Purchased in person at their branch, {bought},', 'Bought over the counter on {bought},'], online: ['Placed an online order on {bought},', 'Ordered through their app on {bought},'], phone: ['Ordered by telephone on {bought},', 'Rang their sales line to order on {bought},'] },
    paid: ['total {price}, paid with a {paidBy}.', 'for {price} ({paidBy}).'],
    arrive: ['Delivery came on {delivered}.', 'The courier dropped it off on {delivered}.'],
    arriveShop: ['Carried it out of the shop that day, {delivered}.', 'Took it with me on {delivered}.'],
    done: ['The tradesman finished on {delivered}.', 'Work completed {delivered}.'],
    noDate: ['No idea now when it turned up.', 'The delivery date escapes me.'],
    fault: ['Then on {faultFound} it {fault}.', 'By {faultFound} it had {fault}.'],
    faultNoDate: ['Some time later it {fault}.', 'Eventually it {fault}; I never wrote down the date.'],
    poor: ['The finish is shoddy and not what a competent tradesman would do.', 'Frankly the standard of work is unacceptable.'],
    repairs: ['No repair has been attempted.', 'One repair was done and the problem came back.', 'Two repairs so far and it still fails.'],
    redo: ['No offer to come back and put it right.', 'They returned once to fix it, and it is still poor.'],
    mind: ['It works fine; I have decided I do not want it.', 'I would like to return it as I no longer need it.'],
  },
});

const daysBetween = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
const earlier = (a, b) => [a, b].sort()[0];   // ISO dates sort as the calendar does
const pct = (r) => Math.floor(r() * 100);      // a whole-percent draw: pct(r) < 25 happens exactly when r() < 0.25
/** facts(r, last) → one complaint's facts and the day it was written (on or before `last`), drawn so that every claim
 *  type and both sides of every deadline appear: a complaint is written soon after the problem it is about */
export function facts(r, last) {
  const u = pct(r), kind = u < 25 ? 'service' : 'goods', changedMind = kind === 'goods' && u >= 80;   // r() > 0.8 exactly when the percent is 80 or more
  const channel = changedMind ? (pct(r) < 75 ? pick(r, ['online', 'phone']) : 'shop') : pick(r, ['shop', 'online', 'online', 'phone']);
  const price = kind === 'service' ? 60 + Math.floor(r() * 3940) : pct(r) < 15 ? 15 + Math.floor(r() * 85) : pct(r) < 50 ? Math.round((100 + r() * 400) * 100) / 100 : 100 + Math.floor(r() * 2400);
  const paidBy = pick(r, kind === 'service' ? ['credit card', 'debit card', 'bank transfer', 'bank transfer'] : ['credit card', 'credit card', 'debit card', 'debit card', 'cash', 'bank transfer']);
  const bought = addDays('2025-03-01', Math.floor(r() * (daysBetween('2025-03-01', last) - 3)));
  const delivered = earlier(channel === 'shop' && kind === 'goods' ? bought : addDays(bought, kind === 'service' ? Math.floor(r() * 21) : 1 + Math.floor(r() * 5)), last);
  const room = Math.max(0, daysBetween(delivered, last));
  let faultFound = null, repairsTried = 0, today;
  if (changedMind) today = addDays(delivered, Math.min(room, pct(r) < 60 ? Math.floor(r() * 15) : 15 + Math.floor(r() * 40)));
  else if (kind === 'goods') {
    const v = pct(r), k = v < 40 ? Math.floor(r() * 30) : v < 70 ? 30 + Math.floor(r() * 153) : 183 + Math.floor(r() * 300);
    faultFound = addDays(delivered, Math.min(k, room));
    today = earlier(addDays(faultFound, Math.floor(r() * 21)), last);
    repairsTried = pct(r) < 55 ? 0 : pct(r) < 67 ? 1 : 2;
  } else { today = earlier(addDays(delivered, 3 + Math.floor(r() * 120)), last); repairsTried = pct(r) < 60 ? 0 : 1; }
  const f = { kind, channel, price, paidBy, bought, delivered, faultFound, repairsTried, changedMind };
  const needs = NEEDS[claimOf(f)], drop = needs.length && pct(r) < 25 ? needs[Math.floor(r() * needs.length)] : null;
  return { facts: drop ? { ...f, [drop]: null } : f, today };
}

/** write(f, r, bank) → the complaint in plain words, and a one-line summary in the same words */
export function write(f, r, bank) {
  const thing = f.kind === 'service' ? 'a ' + pick(r, bank.services) : 'a ' + pick(r, bank.items), seller = pick(r, bank.sellers), ds = Math.floor(r() * 4);
  const fill = (s) => s.replace('{thing}', thing).replace('{seller}', seller).replace('{bought}', say(f.bought, ds)).replace('{delivered}', f.delivered ? say(f.delivered, ds) : '').replace('{faultFound}', f.faultFound ? say(f.faultFound, ds) : '').replace('{price}', money(f.price)).replace('{paidBy}', f.paidBy).replace('{fault}', fault);
  const fault = pick(r, bank.faults);
  const parts = [pick(r, bank.open), pick(r, bank.buy[f.channel]) + ' ' + pick(r, bank.paid)];
  if (f.kind === 'service') parts.push(f.delivered ? pick(r, bank.done) : pick(r, bank.noDate), pick(r, bank.poor), bank.redo[f.repairsTried ? 1 : 0]);
  else {
    parts.push(f.delivered ? pick(r, f.channel === 'shop' ? bank.arriveShop : bank.arrive) : pick(r, bank.noDate));
    if (f.changedMind) parts.push(pick(r, bank.mind));
    else parts.push(f.faultFound ? pick(r, bank.fault) : pick(r, bank.faultNoDate), bank.repairs[Math.min(f.repairsTried, 2)]);
  }
  const summary = f.changedMind ? 'The client changed their mind about ' + thing + ' from ' + seller + '.' : f.kind === 'service' ? 'The client says ' + thing + ' by ' + seller + ' was done badly.' : 'The client says ' + thing + ' from ' + seller + ' ' + fault + '.';
  return { text: parts.map(fill).join(' '), summary };
}

/** make(n, seed, split) → n complaints: each its facts, its date of writing, its text and its summary */
export function make(n, seed, split, today) {
  const r = rng(seed), bank = BANKS[split], out = [];
  for (let i = 0; i !== n; i++) { const { facts: f, today: asOf } = facts(r, today); const w = write(f, r, bank); out.push({ id: split + '-' + i, today: asOf, facts: f, text: w.text, summary: w.summary }); }
  return out;
}

export default { rng, say, BANKS, facts, write, make };
