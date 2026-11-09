# tools/infer.py — the SLM's drafts on the held-out complaints (glue), with the network DISABLED: every socket connect
# is refused and counted, and Hugging Face is told it is offline. Greedy decoding, at most 160 new tokens (CLAIMS.md).
#   python tools/infer.py --adapter adapter/legal --out data/drafts-tuned.jsonl   (the tuned model; LoRA merged in)
#   python tools/infer.py --adapter none --out data/drafts-base.jsonl             (the base model, the same way)
# Writes one line per held-out complaint (resumable), and <out>.meta.json: the model, the network guard's count, timing.
import json, os, sys, time, socket, hashlib, argparse
os.environ["HF_HUB_OFFLINE"] = "1"; os.environ["TRANSFORMERS_OFFLINE"] = "1"; os.environ["HF_DATASETS_OFFLINE"] = "1"
BLOCKED = []
_connect = socket.socket.connect
def _refuse(self, address, *a, **k):
    BLOCKED.append(str(address)); raise OSError("network disabled for inference: " + str(address))
socket.socket.connect = _refuse
socket.create_connection = lambda address, *a, **k: _refuse(None, address)

import torch
from transformers import AutoTokenizer, AutoModelForCausalLM

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE = os.environ.get("SLM_BASE", r"C:\Users\sjgan\.si-didy\slm\models\Qwen2.5-0.5B-Instruct")
MAX_NEW = 160

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--adapter", required=True); ap.add_argument("--out", required=True); ap.add_argument("--rows", default="data/held.jsonl"); ap.add_argument("--prompt", default="prompt")
    a = ap.parse_args()
    torch.manual_seed(7)
    tok = AutoTokenizer.from_pretrained(BASE)
    model = AutoModelForCausalLM.from_pretrained(BASE, dtype=torch.float32)
    adapter_sha = None
    if a.adapter != "none":
        from peft import PeftModel
        path = os.path.join(ROOT, a.adapter)
        model = PeftModel.from_pretrained(model, path).merge_and_unload()
        st = os.path.join(path, "adapter_model.safetensors")
        adapter_sha = hashlib.sha256(open(st, "rb").read()).hexdigest()
    model.eval()
    rows = [json.loads(l) for l in open(os.path.join(ROOT, a.rows), encoding="utf-8")]
    out_path = os.path.join(ROOT, a.out)
    done = set()
    if os.path.exists(out_path): done = {json.loads(l)["id"] for l in open(out_path, encoding="utf-8") if l.strip()}
    t0 = time.time()
    with open(out_path, "a", encoding="utf-8", newline="\n") as f:
        for r in rows:
            if r["id"] in done: continue
            p = tok.apply_chat_template([{"role": "user", "content": r[a.prompt]}], tokenize=False, add_generation_prompt=True)
            x = tok(p, return_tensors="pt")
            t = time.time()
            with torch.no_grad(): g = model.generate(**x, max_new_tokens=MAX_NEW, do_sample=False)
            text = tok.decode(g[0][x["input_ids"].shape[1]:], skip_special_tokens=True)
            f.write(json.dumps({"id": r["id"], "output": text}, ensure_ascii=False) + "\n"); f.flush()
            print(r["id"], round(time.time() - t, 1), "s", flush=True)
    meta = {"base": "Qwen/Qwen2.5-0.5B-Instruct", "adapter": a.adapter, "promptField": a.prompt, "adapterSha256": adapter_sha, "device": "cpu", "decoding": "greedy",
            "maxNewTokens": MAX_NEW, "networkDisabled": True, "blockedConnects": len(BLOCKED), "seconds": round(time.time() - t0)}
    json.dump(meta, open(out_path + ".meta.json", "w", encoding="utf-8"), indent=1)
    print(json.dumps(meta), flush=True)

if __name__ == "__main__":
    main()
