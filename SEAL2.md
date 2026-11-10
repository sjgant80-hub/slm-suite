# The SLM Suite · SEAL 2: everything the held-out set will be read with, frozen before any model reads it

Written 2026-11-10, after training and before inference. SEAL 1 (the claims) is 6348a7e; the code commit is 2e1fbe1. `tools/eval.mjs` refuses to judge the held-out drafts unless every file it reads is the file named here, by its SHA-256 as git stores it: LF line endings, except the two JSON files the Python trainer wrote with CRLF (`adapter_config.json`, `train-log.json`), which `.gitattributes` keeps byte for byte so these hashes and the training log agree.

## The adapter

| File | SHA-256 |
|---|---|
| `adapter/legal/adapter_model.safetensors` | `f81683b550b2f24a285ecef6fa8db1b21de5c5b691e31b1074386eb4fc3c0cc5` |
| `adapter/legal/adapter_config.json` | `e255a40fafef09137b31c6cffb3fe692f3a8fbe52cafa598825fe8cda39d488e` |

## The data

| File | SHA-256 |
|---|---|
| `data/train.jsonl` | `6bdb4a50c30c9f7c560c1172d62c8239d8208f8e89f96df0a7f88b3b14c59b87` |
| `data/held.jsonl` | `ba56d154bc37881ec783ff56fb24344f965d7eaf424127d3d9719e81f122f228` |
| `data/train-log.json` | `fb97870f318a28714fa98f3644c56e47e7aed93b6f6e5bcb23e3bfc12d5c67d0` |

## The shared stack

| File | SHA-256 |
|---|---|
| `stack/gate.mjs` | `d14c92fc7a9a684a8cbcdd73c35dd4f4a4d4010df92db6004c65360f4189f4bf` |
| `stack/memo.mjs` | `b907ccd3ca5ca6d666eed741a80796987710b8241738410d6994a8b493959d87` |
| `stack/score.mjs` | `907460d10b7ea1c906c44a58fa71d66204049fe8716512090c79dc29fbde36bd` |

## The legal vertical

| File | SHA-256 |
|---|---|
| `verticals/legal/library.mjs` | `20af78802a7d50e564a51ec9e197ac3d0bc4845fb8a84646a7ec3285b240fa7a` |
| `verticals/legal/vertical.mjs` | `3536f9d43864efd88f881f3030d51e6cffc7a442d9c505ef7670737359a37a12` |
| `verticals/legal/scenarios.mjs` | `6b561c372d3f4fc05fcf3ff37397b26080ef7cfc20bc7ac38c48221ff825cc98` |
| `verticals/legal/law.json` | `37d7ed10e560afcd3aaa7183231a2ddd96edd247cdb50e9327f53f321fe13eac` |

## The tools that read the held-out set

| File | SHA-256 |
|---|---|
| `tools/infer.py` | `dd7072bed9c2ef5f976f105d650305c816668c4d4027a0dcf4dd715d9e57338b` |
| `tools/raw.mjs` | `0124e28e1ab1932d47f39ce383eb35ae2cdd7f93d8d294071817a43ddde44da8` |
| `tools/eval.mjs` | `c2e53c19c7dd867c268d5a5733f4e887fb15d7db450d06c720d1aacd76cf779a` |
| `tools/data.mjs` | `1a2a50d8fe104551e9d1562ad5332616ae8d5afafd5f09b7ed6291263cfd2020` |

## The tests and the gate receipt

| File | SHA-256 |
|---|---|
| `test/suite.test.mjs` | `67ec7ead1b00ad25eafbf0d564b3853556308e17132714b784d93ea3b8d56dc4` |
| `data/witness.json` | `484387492daab38b4d410b1a454bfd9fb553f5c9d35f5ef86bd9b7929ed11a17` |

## The training run

```
{
 "base": "Qwen/Qwen2.5-0.5B-Instruct",
 "baseSafetensorsSha256": {
  "model.safetensors": "fdf756fa7fcbe7404d5c60e26bff1a0c8b8aa1f72ced49e7dd0210fe288fb7fe"
 },
 "config": {
  "r": 16,
  "alpha": 32,
  "lr": 0.0002,
  "epochs": 2,
  "accum": 8,
  "max_len": 384,
  "seed": 7
 },
 "rows": 360,
 "device": "cpu",
 "threads": 10,
 "torch": "2.15.0+cpu",
 "seconds": 10155,
 "steps": [
  {
   "epoch": 0,
   "step": 1,
   "loss": 2.0396,
   "secs": 98
  },
  {
   "epoch": 0,
   "step": 2,
   "loss": 1.4342,
   "secs": 205
  },
  {
   "epoch": 0,
   "step": 3,
   "loss": 1.1641,
   "secs": 311
  },
  {
   "epoch": 0,
   "step": 4,
   "loss": 0.9114,
   "secs": 399
  },
  {
   "epoch": 0,
   "step": 5,
   "loss": 0.5979,
   "secs": 523
  },
  {
   "epoch": 0,
   "step": 6,
   "loss": 0.329,
   "secs": 600
  },
  {
   "epoch": 0,
   "step": 7,
   "loss": 0.1581,
   "secs": 671
  },
  {
   "epoch": 0,
   "step": 8,
   "loss": 0.1357,
   "secs": 749
  },
  {
   "epoch": 0,
   "step": 9,
   "loss": 0.0705,
   "secs": 815
  },
  {
   "epoch": 0,
   "step": 10,
   "loss": 0.1205,
   "secs": 870
  },
  {
   "epoch": 0,
   "step": 11,
   "loss": 0.0814,
   "secs": 1001
  },
  {
   "epoch": 0,
   "step": 12,
   "loss": 0.0371,
   "secs": 1074
  },
  {
   "epoch": 0,
   "step": 13,
   "loss": 0.0427,
   "secs": 1151
  },
  {
   "epoch": 0,
   "step": 14,
   "loss": 0.0721,
   "secs": 1229
  },
  {
   "epoch": 0,
   "step": 15,
   "loss": 0.055,
   "secs": 1322
  },
  {
   "epoch": 0,
   "step": 16,
   "loss": 0.0561,
   "secs": 1412
  },
  {
   "epoch": 0,
   "step": 17,
   "loss": 0.0233,
   "secs": 1492
  },
  {
   "epoch": 0,
   "step": 18,
   "loss": 0.0131,
   "secs": 1566
  },
  {
   "epoch": 0,
   "step": 19,
   "loss": 0.0338,
   "secs": 1637
  },
  {
   "epoch": 0,
   "step": 20,
   "loss": 0.0137,
   "secs": 1696
  },
  {
   "epoch": 0,
   "step": 21,
   "loss": 0.0246,
   "secs": 1768
  },
  {
   "epoch": 0,
   "step": 22,
   "loss": 0.0785,
   "secs": 1832
  },
  {
   "epoch": 0,
   "step": 23,
   "loss": 0.0201,
   "secs": 1900
  },
  {
   "epoch": 0,
   "step": 24,
   "loss": 0.0283,
   "secs": 1971
  },
  {
   "epoch": 0,
   "step": 25,
   "loss": 0.0501,
   "secs": 2043
  },
  {
   "epoch": 0,
   "step": 26,
   "loss": 0.0168,
   "secs": 2158
  },
  {
   "epoch": 0,
   "step": 27,
   "loss": 0.0324,
   "secs": 2258
  },
  {
   "epoch": 0,
   "step": 28,
   "loss": 0.0145,
   "secs": 2352
  },
  {
   "epoch": 0,
   "step": 29,
   "loss": 0.015,
   "secs": 2439
  },
  {
   "epoch": 0,
   "step": 30,
   "loss": 0.0077,
   "secs": 2536
  },
  {
   "epoch": 0,
   "step": 31,
   "loss": 0.0118,
   "secs": 2648
  },
  {
   "epoch": 0,
   "step": 32,
   "loss": 0.0349,
   "secs": 2761
  },
  {
   "epoch": 0,
   "step": 33,
   "loss": 0.0168,
   "secs": 2892
  },
  {
   "epoch": 0,
   "step": 34,
   "loss": 0.0306,
   "secs": 3020
  },
  {
   "epoch": 0,
   "step": 35,
   "loss": 0.0063,
   "secs": 3252
  },
  {
   "epoch": 0,
   "step": 36,
   "loss": 0.0131,
   "secs": 4953
  },
  {
   "epoch": 0,
   "step": 37,
   "loss": 0.0076,
   "secs": 5062
  },
  {
   "epoch": 0,
   "step": 38,
   "loss": 0.0231,
   "secs": 5382
  },
  {
   "epoch": 0,
   "step": 39,
   "loss": 0.0313,
   "secs": 5639
  },
  {
   "epoch": 0,
   "step": 40,
   "loss": 0.0109,
   "secs": 5792
  },
  {
   "epoch": 0,
   "step": 41,
   "loss": 0.0109,
   "secs": 5923
  },
  {
   "epoch": 0,
   "step": 42,
   "loss": 0.0338,
   "secs": 6052
  },
  {
   "epoch": 0,
   "step": 43,
   "loss": 0.0173,
   "secs": 6195
  },
  {
   "epoch": 0,
   "step": 44,
   "loss": 0.0212,
   "secs": 6331
  },
  {
   "epoch": 0,
   "step": 45,
   "loss": 0.0459,
   "secs": 6457
  },
  {
   "epoch": 1,
   "step": 46,
   "loss": 0.0071,
   "secs": 6597
  },
  {
   "epoch": 1,
   "step": 47,
   "loss": 0.0085,
   "secs": 6711
  },
  {
   "epoch": 1,
   "step": 48,
   "loss": 0.0117,
   "secs": 6840
  },
  {
   "epoch": 1,
   "step": 49,
   "loss": 0.0152,
   "secs": 7028
  },
  {
   "epoch": 1,
   "step": 50,
   "loss": 0.0261,
   "secs": 7137
  },
  {
   "epoch": 1,
   "step": 51,
   "loss": 0.0167,
   "secs": 7274
  },
  {
   "epoch": 1,
   "step": 52,
   "loss": 0.005,
   "secs": 7525
  },
  {
   "epoch": 1,
   "step": 53,
   "loss": 0.0047,
   "secs": 7624
  },
  {
   "epoch": 1,
   "step": 54,
   "loss": 0.0211,
   "secs": 7708
  },
  {
   "epoch": 1,
   "step": 55,
   "loss": 0.0093,
   "secs": 7795
  },
  {
   "epoch": 1,
   "step": 56,
   "loss": 0.0225,
   "secs": 7938
  },
  {
   "epoch": 1,
   "step": 57,
   "loss": 0.0006,
   "secs": 8087
  },
  {
   "epoch": 1,
   "step": 58,
   "loss": 0.0195,
   "secs": 8531
  },
  {
   "epoch": 1,
   "step": 59,
   "loss": 0.0193,
   "secs": 8614
  },
  {
   "epoch": 1,
   "step": 60,
   "loss": 0.0113,
   "secs": 8702
  },
  {
   "epoch": 1,
   "step": 61,
   "loss": 0.0005,
   "secs": 8760
  },
  {
   "epoch": 1,
   "step": 62,
   "loss": 0.0187,
   "secs": 8815
  },
  {
   "epoch": 1,
   "step": 63,
   "loss": 0.0224,
   "secs": 8869
  },
  {
   "epoch": 1,
   "step": 64,
   "loss": 0.0162,
   "secs": 8930
  },
  {
   "epoch": 1,
   "step": 65,
   "loss": 0.0151,
   "secs": 8999
  },
  {
   "epoch": 1,
   "step": 66,
   "loss": 0.0276,
   "secs": 9051
  },
  {
   "epoch": 1,
   "step": 67,
   "loss": 0.0145,
   "secs": 9105
  },
  {
   "epoch": 1,
   "step": 68,
   "loss": 0.0004,
   "secs": 9160
  },
  {
   "epoch": 1,
   "step": 69,
   "loss": 0.0213,
   "secs": 9214
  },
  {
   "epoch": 1,
   "step": 70,
   "loss": 0.0033,
   "secs": 9266
  },
  {
   "epoch": 1,
   "step": 71,
   "loss": 0.013,
   "secs": 9319
  },
  {
   "epoch": 1,
   "step": 72,
   "loss": 0.0126,
   "secs": 9372
  },
  {
   "epoch": 1,
   "step": 73,
   "loss": 0.017,
   "secs": 9425
  },
  {
   "epoch": 1,
   "step": 74,
   "loss": 0.0003,
   "secs": 9477
  },
  {
   "epoch": 1,
   "step": 75,
   "loss": 0.0082,
   "secs": 9526
  },
  {
   "epoch": 1,
   "step": 76,
   "loss": 0.0183,
   "secs": 9586
  },
  {
   "epoch": 1,
   "step": 77,
   "loss": 0.0028,
   "secs": 9651
  },
  {
   "epoch": 1,
   "step": 78,
   "loss": 0.012,
   "secs": 9701
  },
  {
   "epoch": 1,
   "step": 79,
   "loss": 0.0126,
   "secs": 9748
  },
  {
   "epoch": 1,
   "step": 80,
   "loss": 0.016,
   "secs": 9789
  },
  {
   "epoch": 1,
   "step": 81,
   "loss": 0.0132,
   "secs": 9827
  },
  {
   "epoch": 1,
   "step": 82,
   "loss": 0.0182,
   "secs": 9862
  },
  {
   "epoch": 1,
   "step": 83,
   "loss": 0.0138,
   "secs": 9902
  },
  {
   "epoch": 1,
   "step": 84,
   "loss": 0.0117,
   "secs": 9941
  },
  {
   "epoch": 1,
   "step": 85,
   "loss": 0.0052,
   "secs": 9976
  },
  {
   "epoch": 1,
   "step": 86,
   "loss": 0.0099,
   "secs": 10010
  },
  {
   "epoch": 1,
   "step": 87,
   "loss": 0.0206,
   "secs": 10045
  },
  {
   "epoch": 1,
   "step": 88,
   "loss": 0.0058,
   "secs": 10080
  },
  {
   "epoch": 1,
   "step": 89,
   "loss": 0.0106,
   "secs": 10117
  },
  {
   "epoch": 1,
   "step": 90,
   "loss": 0.0048,
   "secs": 10153
  }
 ]
}
```

## The gate on the code

witness v0.6, run on this laptop against the test file named above; CI re-runs every kernel and must get these same counts:

- `stack/gate.mjs`: 34 of 34 mutants killed, 0 reviewed-equivalent, nothing baselined
- `stack/memo.mjs`: 2 of 2 mutants killed, 0 reviewed-equivalent, nothing baselined
- `stack/score.mjs`: 55 of 55 mutants killed, 0 reviewed-equivalent, nothing baselined
- `verticals/legal/library.mjs`: 18 of 18 mutants killed, 0 reviewed-equivalent, nothing baselined
- `verticals/legal/scenarios.mjs`: 42 of 42 mutants killed, 0 reviewed-equivalent, nothing baselined
- `verticals/legal/vertical.mjs`: 1 of 1 mutants killed, 0 reviewed-equivalent, nothing baselined

## Disclosed: what changed after SEAL 1, and why

- **The untuned base gets the schema spelled out** (`basePrompt` in `verticals/legal/vertical.mjs`, in the code commit 2e1fbe1). SEAL 1 fixed everything about the base comparison except its prompt. The tuned model learned the answer's shape in training; an untuned 0.5B given the same bare prompt barely writes JSON at all, which would have flattered S1's margin. So the base is told the exact keys and forms in words. This makes S1 harder to pass, not easier.
- **`stack/score.mjs` was corrected after the code commit and before any held-out draft existed** (the diff is in the commit that adds this file). (a) The old raw scorer replaced a raw "cannot-tell" with the true claim type, crediting the raw model with a claim it never made; the raw answer is now scored exactly as given. Said straight: this makes S2 easier to pass than the old, wrong scorer did. (b) The s.75 angle is read from the vertical's context (`ctx.angle`, which `tools/eval.mjs` passes) instead of being written into the scorer, and "proposed" now needs the whole proposal line in the memo, not only its opening words. (c) The invented-provision count lost a check that could never fire. The mutation gate was re-run on the final file.
- **`verticals/legal/scenarios.mjs` thresholds became whole percentages** (in 2e1fbe1, to give the mutation gate a boundary it can see). `node tools/data.mjs --check` proves the train and held-out data are byte for byte what they were.
- **The adapter folder** holds the adapter, its config and the base model's Apache-2.0 licence (`LICENSE-Qwen2.5`). The model card PEFT writes beside it (`README.md`) is not committed: it names a folder on this laptop. Its size is in the training log, which is where the S7 size check reads it.

No model has read `data/held.jsonl`: inference runs next, once, in this order: the tuned adapter, the untuned base, then raw qwen2.5:7b.

Powered by the Konomi architecture, created by Thomas Frumkin.
