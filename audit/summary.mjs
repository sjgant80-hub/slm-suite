// audit/summary.mjs — checks the one line of the memo the gate does not ground (written 2026-11-16, AFTER both seals;
// no sealed file reads it). The memo's "The complaint, as read" line is the trained model's own one-sentence summary.
// The gate withholds it when it mentions law or dates (stack/gate.mjs); nothing else checks it. This does, by one
// mechanical rule a reader can apply by hand: the item or service the summary names must appear in the complaint's own
// words, and "a pair of" must be something the complaint says. Pure; never throws.

const str = (x) => (typeof x === 'string' ? x : '');

/** summaryItem(summary) → { item, pair } — what the summary says the complaint is about, or null if it names nothing */
export function summaryItem(summary) {
  const m = str(summary).match(/(?:about|says) (a pair of |an |a )?(.+?) (?:from|by) /);
  return m ? { item: m[2], pair: m[1] === 'a pair of ' } : null;
}

/** checkSummary(complaint, summary) → { item, inComplaint, pairInvented, invented } */
export function checkSummary(complaint, summary) {
  const c = str(complaint).toLowerCase(), s = summaryItem(summary);
  if (!s) return { item: null, inComplaint: true, pairInvented: false, invented: false };
  const inComplaint = c.includes(s.item.toLowerCase());
  const pairInvented = s.pair && !/\bpairs?\b/.test(c); // the word, not a substring: "repairs" is not a pair
  return { item: s.item, inComplaint, pairInvented, invented: !inComplaint || pairInvented };
}

export default { summaryItem, checkSummary };
