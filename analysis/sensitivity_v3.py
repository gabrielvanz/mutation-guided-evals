#!/usr/bin/env python3
"""V3 — operadores (PROTOCOL.md §11): H1 repetida sobre o escore contra o segundo conjunto de mutantes.

Lê `v3_runs.csv` (gerado por sensitivity_v3.ts) e `runs_all.csv` (analyze.py). Escreve `v3_summary.csv`, `v3_h1.csv`.
uso: python analysis/sensitivity_v3.py --out analysis/out
"""
from __future__ import annotations

import argparse
import math
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).parent))
from analyze import holm, module_medians, wilcoxon_greater  # noqa: E402


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="analysis/out")
    out = Path(ap.parse_args().out)
    v3 = pd.read_csv(out / "v3_runs.csv")
    base = pd.read_csv(out / "runs_all.csv")
    # mesmo critério de V2/H1: runs ok e não flaky; C0 entra por módulo
    base = base[(base.status == "ok") & (~base.flaky.astype(bool))]
    df = v3[v3.ok & v3.v3_score.notna()].merge(base[["run_id", "ms_eval"]], on="run_id", how="left")
    df = df[~df.run_id.str.contains("C0-suite")].copy()  # C0-suite reavaliaria os mesmos testes de C0 (V3 só no escopo do módulo)
    df = df.rename(columns={"cond": "cond", "module": "mod"})
    if "mod" not in df or "lib" not in df:
        raise SystemExit("colunas inesperadas")
    df["module"] = df["lib"] + "/" + df["mod"]
    df["subject"] = df["module"]

    summary = df.groupby("cond").agg(n=("v3_score", "count"), v3=("v3_score", "median"), ms_eval=("ms_eval", "median"))
    summary.to_csv(out / "v3_summary.csv")
    print(summary.round(1).to_string())

    # reaproveita as convenções de module_medians (precisa das colunas usadas em analyze.py)
    cols = {c: c for c in df.columns}
    m = module_medians(df.rename(columns={"module": "module"}), "v3_score")
    rows, pv = [], []
    for other in ["C1", "C2", "C2r"]:
        pair = m[["C3", other]].dropna()
        r = wilcoxon_greater(pair["C3"].to_numpy(), pair[other].to_numpy())
        rows.append(dict(comparison=f"C3 > {other}", **r))
        pv.append(r["p"])
    valid = [(i, p) for i, p in enumerate(pv) if not math.isnan(p)]
    for (i, _), adj in zip(valid, holm([p for _, p in valid])):
        rows[i]["p_holm"] = adj
    res = pd.DataFrame(rows)
    res.to_csv(out / "v3_h1.csv", index=False)
    print()
    print(res.round(4).to_string(index=False))
    print("\nmediana por módulo:")
    print(m.round(1).to_string())


if __name__ == "__main__":
    main()
