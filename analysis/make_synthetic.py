#!/usr/bin/env python3
"""Gera result.json SINTÉTICOS para testar analysis/analyze.py. NUNCA use estes dados no artigo.

uso: python analysis/make_synthetic.py --out /tmp/synth/runs
"""
import argparse, json
from pathlib import Path
import numpy as np

ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--modules", type=int, default=10)
ap.add_argument("--reps", type=int, default=3)
ap.add_argument("--n", type=int, default=5)
a = ap.parse_args()
rng = np.random.default_rng(1)
out = Path(a.out)

def cost(tok_in, tok_out, calls):
    return dict(calls=calls, repair_calls=0, tokens_in=int(tok_in), tokens_out=int(tok_out), usd_ref=round(tok_in/1e7+tok_out*4e-7, 6), wall_s=10.0*calls, stryker_s=5.0*calls)

def scores(ev):
    return dict(ms_eval=round(ev, 2), ms_feedback=round(ev + rng.normal(0, 2), 2), ms_all=round(ev + rng.normal(0, 1), 2), ms_covered=round(ev + 5, 2))

def write(run):
    d = out / run["run_id"]; d.mkdir(parents=True, exist_ok=True)
    (d / "result.json").write_text(json.dumps(run), encoding="utf-8")

for mi in range(a.modules):
    base = rng.uniform(40, 75)  # dificuldade do módulo
    lib, mod = f"lib{mi % 3}", f"m{mi}"
    def skeleton(cond, rep):
        return dict(schema_version="0.1", run_id=f"{lib}__{mod}__{cond}__r{rep}", status="ok", error=None, condition=cond, repetition=rep,
            subject=dict(library=lib, repo="x/y", commit="a"*40, license="MIT", module_path=f"src/{mod}.ts", module_loc=100, mutants_total=100, human_test_files=[]),
            guardrails=dict(src_diff_empty=True, forbidden_patterns_found=[], flaky=False, reruns=3), memorization=None)
    # C0
    s = skeleton("C0", 0); ev = min(95, base + 20)
    it = dict(k=0, valid=True, discard_reason=None, repair_attempts=0, scores=scores(ev), coverage=dict(line_cov=92.0, branch_cov=85.0), survivors_sent=0, survivor_ids=[], best_k_so_far=0, cost_cumulative=cost(0, 0, 0), tests=dict(n_tests=20, n_asserts=40, sha256="x"))
    s.update(iterations=[it], selected_iteration=0, final=dict(scores=it["scores"], coverage=it["coverage"], cost=cost(0, 0, 0), tests=it["tests"], gap_cov_ms=round(92 - it["scores"]["ms_all"], 2), valid_rate=1, tokens_per_pp=None), model=None)
    write(s)
    for rep in range(1, a.reps + 1):
        for cond in ["C1", "C2", "C2r", "C3"]:
            s = skeleton(cond, rep)
            n = a.n if cond in ("C2r", "C3") else 0
            lift = {"C1": 0, "C2": 4, "C2r": 4, "C3": 4}[cond]
            cur = base + lift + rng.normal(0, 4)
            line = 88 + rng.normal(0, 3)
            iters, tok, best = [], 0, None
            bestfb = -1
            for k in range(n + 1):
                if k > 0:
                    if cond == "C3":
                        cur += max(0.0, 14 * 0.55 ** k + rng.normal(0, 1.5))
                        line = min(100, line + 0.8)
                    else:
                        cur = base + 4 + rng.normal(0, 4)
                tok += rng.integers(3000, 6000)
                sc = scores(min(cur, 99)); sc["ms_feedback"] = round(sc["ms_feedback"], 2)
                if sc["ms_feedback"] > bestfb: bestfb, best = sc["ms_feedback"], k
                iters.append(dict(k=k, valid=True, discard_reason=None, repair_attempts=0, scores=sc, coverage=dict(line_cov=round(line, 2), branch_cov=75.0), survivors_sent=0 if k == 0 or cond != "C3" else 15, survivor_ids=[], best_k_so_far=best, cost_cumulative=cost(tok * 0.8, tok * 0.2, k + 1), tests=dict(n_tests=15 + k, n_asserts=30 + k, sha256="x")))
            sel = next(i for i in iters if i["k"] == best)
            gain = sel["scores"]["ms_eval"] - iters[0]["scores"]["ms_eval"]
            s.update(model=dict(provider="synthetic", model_id="synth-1", temperature=0.7, top_p=None, seed=None, max_output_tokens=100), iterations=iters, selected_iteration=best,
                final=dict(scores=sel["scores"], coverage=sel["coverage"], cost=iters[-1]["cost_cumulative"], tests=sel["tests"], gap_cov_ms=round(sel["coverage"]["line_cov"] - sel["scores"]["ms_all"], 2), valid_rate=1, tokens_per_pp=(round(tok / gain, 2) if gain > 0 and n else None)))
            write(s)
print("sintético escrito em", out)
