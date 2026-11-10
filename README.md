# slm-suite

**Live:** https://sjgant80-hub.github.io/slm-suite/

Industry-tuned small models on one shared stack. Vertical #1 is **a virtual associate for UK consumer-claim triage**:
the first screen a solicitor or claims handler does on a consumer's complaint about goods, a service or a distance
purchase. It reads the complaint, works out which rights apply and the deadlines that matter, proposes an angle a busy
reader might miss, and says plainly when it cannot tell. **It assists: a qualified human reviews, owns and is
accountable for every output. It does not advise, decide, file or send.**

## How it is built

- **The small model reads.** Qwen2.5-0.5B-Instruct (Apache-2.0) with a LoRA adapter trained on a laptop CPU
  (`adapter/legal/`, its licence beside it). From the complaint it extracts the facts and writes one sentence.
- **A verified library reasons.** `verticals/legal/library.mjs` is a deterministic rule engine over UK legislation
  (Consumer Rights Act 2015, Consumer Contracts Regulations 2013, Consumer Credit Act 1974 s. 75, Limitation Act 1980).
  Every provision in `verticals/legal/law.json` carries its legislation.gov.uk address, under the Open Government Licence.
- **A gate never invents.** `stack/gate.mjs`: a cited provision survives only if it is in the verified table and the
  library says it applies; every date must equal the library's; a missing critical fact means abstain and flag a human.
- **The memo keeps the human contract.** `stack/memo.mjs`: the review label on every output; angles are proposals.

## Proof

- **The claims came first:** `CLAIMS.md` (seal 1) fixed every claim and its bar before any code.
- **Seal 2 froze everything** (`SEAL2.md`): the adapter, the data and the code, by the SHA-256 of what git stores,
  before any model read a held-out complaint. `tools/eval.mjs` refuses to run unless the files match it.
- **The held-out judgement** is `data/record.json`, scored by `stack/score.mjs` from the three committed sets of drafts:
  the tuned model inside the stack, the same model untuned inside the stack, and qwen2.5:7b on its own. CI re-derives it
  byte for byte from the drafts. A claim that misses its bar is kept and shown as failed.
- **The raw model's empty answers** are explained, not hidden: `tools/raw-probe.mjs` (written after the raw pass,
  outside both seals) re-asks qwen2.5:7b exactly the complaints whose answer came back empty, with the same request,
  and records what Ollama said (`data/raw-probe.json`). It changes no draft; the record does not read it.
- **The gate on the code:** witness v0.6 kills every mutant of every JavaScript kernel, nothing baselined
  (`data/witness.json`); CI re-runs it on every push and must get the same counts.

The results are on the live page, read from the record. None are typed into this file.

## Run it

    node --test test/suite.test.mjs test/page.test.mjs
    node tools/data.mjs --check     # the complaints, re-derived from the generator
    node tools/eval.mjs --check     # the record, re-derived from the committed drafts

Training and inference (`tools/train.py`, `tools/infer.py`) need Python with torch, transformers and peft, on CPU;
inference runs with the network disabled. The raw baseline (`tools/raw.mjs`) needs a local Ollama with qwen2.5:7b.

## What this is not

Not legal advice. Not a solicitor. One narrow area of English and Welsh consumer law, synthetic complaints, a 0.5B
model trained on a laptop CPU, and a local 7B standing in for the rented black box.

Supplied by AI Native Solutions. Powered by the Konomi architecture, created by Thomas Frumkin. MIT (see `LICENSE`);
the base model is Apache-2.0 (`adapter/legal/LICENSE-Qwen2.5`).
