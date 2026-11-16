#!/usr/bin/env python3
"""Gera paper/tables/tab_subjects.tex a partir de data/module-selection.csv."""
import csv, sys
from pathlib import Path

root = Path(__file__).resolve().parents[1]
rows = list(csv.DictReader(open(root / "data/module-selection.csv", encoding="utf-8")))
inc = [r for r in rows if r["decision"] == "include"]
exc = [r for r in rows if r["decision"] == "exclude"]
esc = lambda s: s.replace("_", r"\_")
out = [r"\begin{tabular}{llrrr}", r"\toprule", r"Biblioteca & Módulo & LOC & Mutantes válidos & MS suíte humana (\%) \\", r"\midrule"]
for r in inc:
    out.append(f"{r['library']} & {esc(r['module'])} & {r['loc']} & {r['mutants_valid']} & {float(r['human_ms_suite_pct']):.1f} \\\\")
out += [r"\bottomrule", r"\end{tabular}"]
(root / "paper/tables/tab_subjects.tex").write_text("\n".join(out) + "\n", encoding="utf-8")
print(f"{len(inc)} incluídos, {len(exc)} excluídos")
