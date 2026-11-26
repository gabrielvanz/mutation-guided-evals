#!/usr/bin/env python3
"""V2 — mutantes equivalentes (PROTOCOL.md §11): H1 repetida sobre `ms_killable`.

`ms_killable` = mortos / |união de mortos por qualquer condição no módulo| (calculado em analyze.py, sobre todos os
mutantes). Lê `runs_all.csv` gerado por analyze.py e escreve `v2_killable_summary.csv` e `v2_killable_h1.csv`.

uso: python analysis/sensitivity_v2.py --out analysis/out
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
    a = ap.parse_args()
    out = Path(a.out)
    df = pd.read_csv(out / "runs_all.csv")
    df = df[(df.status == "ok") & (~df.flaky.astype(bool))]

    summary = df.groupby("cond").agg(n=("ms_killable", "count"), ms_killable=("ms_killable", "median"), ms_eval=("ms_eval", "median"))
    summary.to_csv(out / "v2_killable_summary.csv")
    print(summary.round(1).to_string())

    m = module_medians(df, "ms_killable")
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
    res.to_csv(out / "v2_killable_h1.csv", index=False)
    print()
    print(res.round(4).to_string(index=False))


if __name__ == "__main__":
    main()
