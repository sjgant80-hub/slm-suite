# tools/train.py — the legal SLM's LoRA, trained on this laptop's CPU (glue). Reads ONLY data/train.jsonl (every id
# must start "train-"); the settings are the ones CLAIMS.md seals. Writes the adapter to adapter/legal/ and the run's
# log to data/train-log.json. The base model is read from the local copy; nothing is fetched.
import json, os, random, sys, time, hashlib
os.environ["HF_HUB_OFFLINE"] = "1"; os.environ["TRANSFORMERS_OFFLINE"] = "1"
import torch
from transformers import AutoTokenizer, AutoModelForCausalLM
from peft import LoraConfig, get_peft_model

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("SLM_BASE", r"C:\Users\sjgan\.si-didy\slm\models\Qwen2.5-0.5B-Instruct")
CFG = dict(r=16, alpha=32, lr=2e-4, epochs=2, accum=8, max_len=384, seed=7)
OUT = os.path.join(ROOT, "adapter", "legal")

def sha_file(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""): h.update(b)
    return h.hexdigest()

def main():
    random.seed(CFG["seed"]); torch.manual_seed(CFG["seed"])
    rows = [json.loads(l) for l in open(os.path.join(ROOT, "data", "train.jsonl"), encoding="utf-8")]
    if not rows or any(not r["id"].startswith("train-") for r in rows): sys.exit("train.py reads training rows only")
    tok = AutoTokenizer.from_pretrained(BASE)
    model = AutoModelForCausalLM.from_pretrained(BASE, dtype=torch.float32)
    lc = LoraConfig(r=CFG["r"], lora_alpha=CFG["alpha"], lora_dropout=0.0, task_type="CAUSAL_LM",
                    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"])
    pm = get_peft_model(model, lc)
    pm.train()
    def encode(r):
        p = tok.apply_chat_template([{"role": "user", "content": r["prompt"]}], tokenize=False, add_generation_prompt=True)
        ids_p = tok(p)["input_ids"]
        ids = tok(p + r["target"] + "<|im_end|>")["input_ids"][: CFG["max_len"]]
        return torch.tensor([ids]), torch.tensor([[-100] * len(ids_p) + ids[len(ids_p):]])
    data = [encode(r) for r in rows]
    opt = torch.optim.AdamW([p for p in pm.parameters() if p.requires_grad], lr=CFG["lr"])
    log, t0, step = [], time.time(), 0
    for epoch in range(CFG["epochs"]):
        order = list(range(len(data))); random.Random(CFG["seed"] + epoch).shuffle(order)
        acc = 0.0
        for k, i in enumerate(order):
            ids, labels = data[i]
            loss = pm(input_ids=ids, labels=labels).loss / CFG["accum"]
            loss.backward(); acc += loss.item()
            if (k + 1) % CFG["accum"] == 0 or k + 1 == len(order):
                opt.step(); opt.zero_grad(); step += 1
                log.append({"epoch": epoch, "step": step, "loss": round(acc, 4), "secs": round(time.time() - t0)})
                print("epoch", epoch, "step", step, "loss", round(acc, 4), "elapsed", round(time.time() - t0), "s", flush=True)
                acc = 0.0
    pm.save_pretrained(OUT, safe_serialization=True)
    files = {f: {"bytes": os.path.getsize(os.path.join(OUT, f)), "sha256": sha_file(os.path.join(OUT, f))} for f in sorted(os.listdir(OUT))}
    base_files = {f: sha_file(os.path.join(BASE, f)) for f in sorted(os.listdir(BASE)) if f.endswith(".safetensors")}
    meta = {"base": "Qwen/Qwen2.5-0.5B-Instruct", "baseSafetensorsSha256": base_files, "config": CFG, "rows": len(rows),
            "device": "cpu", "threads": torch.get_num_threads(), "torch": torch.__version__, "seconds": round(time.time() - t0),
            "adapter": files, "steps": log}
    json.dump(meta, open(os.path.join(ROOT, "data", "train-log.json"), "w", encoding="utf-8"), indent=1)
    print("saved", OUT, json.dumps({k: v["bytes"] for k, v in files.items()}), flush=True)

if __name__ == "__main__":
    main()
