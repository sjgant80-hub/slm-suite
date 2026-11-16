// test/audit.test.mjs — the post-seal summary audit (audit/summary.mjs). Separate from the sealed suite on purpose: the
// sealed tests and their receipt (data/witness.json) are frozen by seal 2; this kernel has its own receipt,
// data/witness-audit.json, and its own CI step.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import A, { summaryItem, checkSummary } from '../audit/summary.mjs';

test('summaryItem reads the item and whether the summary says "a pair of"', () => {
  assert.deepEqual(summaryItem('The client says a winter coat from Copperleaf developed a crack.'), { item: 'winter coat', pair: false });
  assert.deepEqual(summaryItem('The client says a boiler service by Starling Supplies was done badly.'), { item: 'boiler service', pair: false });
  assert.deepEqual(summaryItem('The client changed their mind about a tablet computer from Meridian Retail.'), { item: 'tablet computer', pair: false });
  assert.deepEqual(summaryItem('The client says a pair of boots from Copperleaf cracked.'), { item: 'boots', pair: true });
  assert.deepEqual(summaryItem('The client says an air fryer from Quayside Goods kept freezing.'), { item: 'air fryer', pair: false });
  assert.deepEqual(summaryItem('The client says a electric scooter from X broke.'), { item: 'electric scooter', pair: false });
  // the item stops at the first " from " / " by " (non-greedy), not the last
  assert.deepEqual(summaryItem('The client says a desk lamp from Hollow Lane from London broke.'), { item: 'desk lamp', pair: false });
});

test('summaryItem returns null when the summary names nothing it can read, and never throws', () => {
  for (const s of ['', 'The client is unhappy.', 'says a coat', 'a coat from X', null, undefined, 42, {}, ['says a coat from X ']]) assert.equal(summaryItem(s), null, String(s));
});

test('checkSummary: an item the complaint names is fine; one it never says is invented', () => {
  const coat = 'Hello, I need help with a dispute with Copperleaf over a winter coat. It developed a crack.';
  assert.deepEqual(checkSummary(coat, 'The client says a winter coat from Copperleaf developed a crack.'), { item: 'winter coat', inComplaint: true, pairInvented: false, invented: false });
  const unnamed = 'Could someone look at my issue with Starling Supplies? Work completed. The finish is shoddy.';
  assert.deepEqual(checkSummary(unnamed, 'The client says a boiler service by Starling Supplies was done badly.'), { item: 'boiler service', inComplaint: false, pairInvented: false, invented: true });
});

test('checkSummary compares without regard to case', () => {
  assert.equal(checkSummary('My problem is with a SMARTWATCH supplied by X.', 'The client says a smartwatch from X broke.').invented, false);
  assert.equal(checkSummary('my problem is with a smartwatch supplied by x.', 'The client says a Smartwatch from X broke.').invented, false);
});

test('checkSummary: "a pair of" is invented unless the complaint says pair, even when the item is named', () => {
  const fryer = 'Hello, I need help with a dispute with Quayside Goods over a air fryer.';
  assert.deepEqual(checkSummary(fryer, 'The client says a pair of air fryers from Quayside Goods kept freezing.'), { item: 'air fryers', inComplaint: false, pairInvented: true, invented: true });
  const fryer1 = 'a dispute over a air fryer';
  // named item, invented pair: invented only through the pair
  assert.deepEqual(checkSummary(fryer1 + 's', 'The client says a pair of air fryers from Q broke.'), { item: 'air fryers', inComplaint: true, pairInvented: true, invented: true });
  assert.deepEqual(checkSummary('a dispute over a pair of boots', 'The client says a pair of boots from Q broke.'), { item: 'boots', inComplaint: true, pairInvented: false, invented: false });
  // "repairs" / "repair" are not the word pair (a substring check once said they were)
  assert.deepEqual(checkSummary('over a pair of boots. Two repairs so far.', 'The client says a pair of boots from Q broke.'), { item: 'boots', inComplaint: true, pairInvented: false, invented: false });
  assert.deepEqual(checkSummary('over boots. Two repairs so far and one repair failed.', 'The client says a pair of boots from Q broke.'), { item: 'boots', inComplaint: true, pairInvented: true, invented: true });
  assert.deepEqual(checkSummary('I bought two pairs of boots.', 'The client says a pair of boots from Q broke.'), { item: 'boots', inComplaint: true, pairInvented: false, invented: false });
  // no "a pair of" in the summary: the word pair in the complaint is irrelevant
  assert.deepEqual(checkSummary('a pair of things and a toaster', 'The client says a toaster from Q broke.'), { item: 'toaster', inComplaint: true, pairInvented: false, invented: false });
});

test('checkSummary on a summary it cannot read flags nothing (it only checks what a summary names)', () => {
  assert.deepEqual(checkSummary('anything', 'The client is unhappy.'), { item: null, inComplaint: true, pairInvented: false, invented: false });
  assert.deepEqual(checkSummary('anything', null), { item: null, inComplaint: true, pairInvented: false, invented: false });
});

test('total on garbage: nothing throws, and a non-string complaint names nothing', () => {
  for (const [c, s] of [[undefined, undefined], [null, 'The client says a coat from X broke.'], [42, {}], [{}, []]]) assert.doesNotThrow(() => checkSummary(c, s));
  assert.equal(checkSummary(null, 'The client says a coat from X broke.').invented, true);
  assert.equal(checkSummary(42, 'The client says a coat from X broke.').inComplaint, false);
});

test('the default export is the two functions', () => {
  assert.equal(A.summaryItem, summaryItem);
  assert.equal(A.checkSummary, checkSummary);
});
