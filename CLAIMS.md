# The SLM Suite · Vertical #1, legal · sealed claims (seal 1, before any code)

Simon's spec: a suite of industry-tuned small models built on one shared Konomi stack, legal first, deep and excellent,
because building it builds the shared stack. Every bar is fixed here. A claim that misses its bar is kept and published
as failed.

## What is built

**A virtual associate for UK consumer-claim triage**: the first screen a solicitor or claims handler does on a consumer's
complaint about goods, a service, or a distance purchase. It reads the complaint, works out which rights apply and
the deadlines that matter, proposes an angle a busy reader might miss, and says plainly when it cannot tell. **It
assists; a qualified human reviews, owns and is accountable for every output. It does not advise, decide, file or send.**

## The shared stack (identical for every vertical) and what this vertical adds

- **The SLM (reading and voice):** Qwen2.5-0.5B-Instruct (Apache-2.0) with a LoRA adapter trained **on this laptop's
  CPU** (Simon's choice, 2026-11-09: no NVIDIA GPU here). On this hardware its job is reading: from the complaint it
  extracts the facts (what was bought, how, the price, how it was paid, the dates, how many repairs failed, whether the
  buyer simply changed their mind) and writes a one-sentence summary.
- **The verified pattern library (reasoning):** a deterministic rule engine over UK legislation, every rule checked
  against legislation.gov.uk on 2026-11-09 and cited there: Consumer Rights Act 2015 ss. 9, 19(14), 20, 22(3), 23, 24(5)
  and 24(10), 49, 55, 56; Consumer Contracts Regulations 2013 regs 29, 30(3) and 34; Consumer Credit Act 1974 s. 75(3)(b);
  Limitation Act 1980 s. 5. Open Government Licence v3.0. It computes every right, remedy and deadline date.
- **The gate (no invented facts):** a cited provision survives only if it is in the verified table **and** the library
  says it applies to these facts; every date must equal the library's. A critical fact missing → **abstain and flag for
  a human**, never guess.
- **The novel-angle engine:** proposes angles from the library's angle rules (here: a claim against the card issuer under
  s. 75 when it applies), each **labelled as a proposal** for the human to weigh.
- **Sovereign delivery:** training and inference on this laptop; inference runs with networking disabled.
- **The human contract:** every output carries the review label.

## The data (licence-checked)

- **Complaints are synthetic**, written by this repository's own generator from structured facts (MIT). No client
  matter, no scraped text, no case law (bulk analysis of published judgments needs a separate licence; none is used).
- **Train:** 360 complaints from 12 phrasing templates. **Held-out:** 80 complaints from **6 different templates** with
  different item and seller words, generated with a different seed, never seen in training. About a quarter of each
  set leaves out a critical fact (the delivery date or the date the fault appeared).
- **Truth** for every complaint is the library run on the facts it was generated from.

## The settings (fixed here)

LoRA r 16, alpha 32, every linear layer; learning rate 2e-4; 2 epochs; batch 1 with 8-step gradient accumulation;
sequences up to 384 tokens; seed 7; float32 on CPU. Decoding greedy, at most 160 new tokens. The raw baseline is
qwen2.5:7b through local Ollama at temperature 0, asked the same question for a JSON answer with its own claim type,
remedy, cited provisions and deadlines. Bootstrap: 2,000 paired resamples, seed 99; a lower bound is the 2.5th percentile.

## The claims (on the 80 held-out complaints, read once, after seal 2)

- **S1 · tuning works.** Share of complaints whose extracted facts are all exactly right: the tuned model **at least
  0.80**, and tuned minus base (both inside the stack) has a paired 95% lower bound **above 0**.
- **S2 · the stack beats the raw bigger model.** Share of complaints answered exactly right (claim type, remedy, the set
  of applicable provisions and every deadline date) or correctly abstained on: the stack **at least 0.85**, and stack
  minus raw qwen2.5:7b has a paired 95% lower bound **above 0**.
- **S3 · no invented facts.** In the stack's final outputs: **zero** cited provisions outside the verified, applicable set
  and **zero** dates that differ from the library's. (The raw model's invented citations are counted and shown beside it.)
- **S4 · it says when it cannot tell.** It abstains on **at least 90%** of the complaints missing a critical fact, and on
  **at most 10%** of the complete ones.
- **S5 · the angle.** Where s. 75 truly applies, the stack proposes it, labelled a proposal, on **at least 95%**; it
  proposes it on **none** where it does not apply.
- **S6 · the human contract.** **Every** output carries the review label.
- **S7 · local.** Training and inference ran on this laptop's CPU; inference runs with the network disabled; the adapter
  is **at most 50 MB**.
- **S8 · deterministic.** The evaluation re-derives byte for byte from the committed drafts.
- **S9 · the page.** No measured number is typed into `index.html`.
- **S10 · licences.** Every provision in the table carries its legislation.gov.uk address and the OGL; the base model's
  Apache-2.0 licence is shipped with the adapter.
- **G · the gate on the code.** witness v0.6 on every JavaScript kernel: CLEAN, nothing baselined. CI green.

## What this is not

Not legal advice. Not a solicitor. One narrow area of English and Welsh consumer law, synthetic complaints, a 0.5B model
trained on a laptop CPU, and a local 7B as the stand-in for the "rented black box". Vertical #2 (finance or insurance)
is built from the extracted template when a prospect pulls it, as the spec's own build order says.
