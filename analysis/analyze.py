#!/usr/bin/env python3
"""Análise estatística de H1, H2 e H3 (PROTOCOL.md §11).

uso: python analysis/analyze.py --runs runs --out analysis/out [--paper paper]

Lê todos os runs/**/result.json, agrega por módulo (mediana das repetições), roda os testes
e escreve CSVs, tabelas LaTeX (paper/tables) e figuras (paper/figs). Funciona com dados parciais:
testes sem dados suficientes são registrados como "n/d" e nunca inventados.
"""
from __future__ import annotations

import argparse
import json
import math
from itertools import combinations
from pathlib import Path

import numpy as np
import pandas as pd
from scipy import stats

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt  # noqa: E402

COND_ORDER = ["C0", "C0-suite", "C1", "C2", "C2r", "C3"]
SEED = 20261203
N_BOOT = 10_000


# --------------------------------------------------------------------------- carga
MAX_REP = 3  # PROTOCOL.md §6 (3 repetições); desvio de 2026-11-26 em §12 exclui r > 3


def load_runs(runs_dir: Path) -> list[dict]:
    out = []
    skipped = []
    for f in sorted(runs_dir.rglob("result.json")):
        j = json.loads(f.read_text(encoding="utf-8"))
        if j["repetition"] > MAX_REP:
            skipped.append(j["run_id"])
            continue
        j["_dir"] = str(f.parent)
        out.append(j)
    if skipped:
        print(f"excluídos por repetição > {MAX_REP} (§12): {', '.join(skipped)}")
    return out


def mutant_key(file: str, m: dict) -> str:
    s, e = m["location"]["start"], m["location"]["end"]
    return f'{file}:{s["line"]}:{s["column"]}-{e["line"]}:{e["column"]}:{m["mutatorName"]}:{m.get("replacement") or ""}'


def killed_set(run: dict) -> set[str] | None:
    """Mutantes mortos pelo arquivo final do run (lido do relatório bruto do Stryker)."""
    k = run["selected_iteration"]
    f = Path(run["_dir"]) / "raw" / f"k{k}_stryker-report.json"
    if not f.exists():
        return None
    rep = json.loads(f.read_text(encoding="utf-8"))
    return {
        mutant_key(name, m)
        for name, d in rep["files"].items()
        for m in d["mutants"]
        if m["status"] in ("Killed", "Timeout")
    }


def runs_to_frames(runs: list[dict]) -> tuple[pd.DataFrame, pd.DataFrame]:
    rows, its = [], []
    for r in runs:
        cond = "C0" if r["condition"] == "C0" and r.get("c0_scope", "module") == "module" else r["condition"]
        if r["condition"] == "C0" and r.get("c0_scope") == "suite":
            cond = "C0-suite"
        mod = f'{r["subject"]["library"]}/{r["subject"]["module_path"].split("/")[-1].replace(".ts", "").replace(".js", "")}'
        f = r["final"]
        ks = killed_set(r)
        rows.append(
            dict(
                run_id=r["run_id"], module=mod, library=r["subject"]["library"], cond=cond, rep=r["repetition"],
                status=r["status"], flaky=r["guardrails"]["flaky"], src_ok=r["guardrails"]["src_diff_empty"],
                ms_eval=f["scores"]["ms_eval"], ms_feedback=f["scores"]["ms_feedback"], ms_all=f["scores"]["ms_all"],
                ms_covered=f["scores"]["ms_covered"], line_cov=f["coverage"]["line_cov"], branch_cov=f["coverage"]["branch_cov"],
                gap=f["gap_cov_ms"], tokens=f["cost"]["tokens_in"] + f["cost"]["tokens_out"], usd_ref=f["cost"]["usd_ref"],
                calls=f["cost"]["calls"], wall_s=f["cost"]["wall_s"], valid_rate=f["valid_rate"], tokens_per_pp=f["tokens_per_pp"],
                n_tests=f["tests"]["n_tests"], n_asserts=f["tests"]["n_asserts"], selected_k=r["selected_iteration"],
                memo=(r.get("memorization") or {}).get("probe_similarity"), stratum=(r.get("memorization") or {}).get("stratum"),
                mutants_total=r["subject"]["mutants_total"], _killed=ks,
            )
        )
        best_eval_by_k = {}
        for it in r["iterations"]:
            best = next((x for x in r["iterations"] if x["k"] == it["best_k_so_far"] and x["valid"]), None) if it["best_k_so_far"] is not None else None
            best_eval_by_k[it["k"]] = best
            its.append(
                dict(
                    run_id=r["run_id"], module=mod, cond=cond, rep=r["repetition"], k=it["k"], valid=it["valid"],
                    ms_eval_raw=it["scores"]["ms_eval"], line_raw=it["coverage"]["line_cov"],
                    ms_eval_best=best["scores"]["ms_eval"] if best else np.nan,
                    ms_feedback_best=best["scores"]["ms_feedback"] if best else np.nan,
                    ms_all_best=best["scores"]["ms_all"] if best else np.nan,
                    line_best=best["coverage"]["line_cov"] if best else np.nan,
                    tokens_cum=it["cost_cumulative"]["tokens_in"] + it["cost_cumulative"]["tokens_out"],
                    survivors_sent=it["survivors_sent"],
                )
            )
    df = pd.DataFrame(rows)
    # ms_killable: |mortos| / |união de mortos por qualquer condição no módulo|
    if not df.empty:
        union: dict[str, set[str]] = {}
        for _, row in df.iterrows():
            if row["_killed"] is not None:
                union.setdefault(row["module"], set()).update(row["_killed"])
        df["ms_killable"] = [
            100 * len(r["_killed"]) / len(union[r["module"]]) if r["_killed"] is not None and union.get(r["module"]) else np.nan
            for _, r in df.iterrows()
        ]
        df = df.drop(columns=["_killed"])
    return df, pd.DataFrame(its)


# --------------------------------------------------------------------------- estatística
def cliffs_delta(a: np.ndarray, b: np.ndarray) -> float:
    gt = sum(x > y for x in a for y in b)
    lt = sum(x < y for x in a for y in b)
    return (gt - lt) / (len(a) * len(b))


def paired_bootstrap_ci(d: np.ndarray, stat=np.median, n=N_BOOT, seed=SEED) -> tuple[float, float]:
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, len(d), size=(n, len(d)))
    s = np.array([stat(d[i]) for i in idx])
    return float(np.percentile(s, 2.5)), float(np.percentile(s, 97.5))


def holm(pvals: list[float]) -> list[float]:
    m = len(pvals)
    order = np.argsort(pvals)
    adj = np.empty(m)
    running = 0.0
    for rank, i in enumerate(order):
        running = max(running, (m - rank) * pvals[i])
        adj[i] = min(1.0, running)
    return adj.tolist()


def wilcoxon_greater(x: np.ndarray, y: np.ndarray) -> dict:
    d = x - y
    if len(d) < 5 or np.allclose(d, 0):
        return dict(n=len(d), p=np.nan, W=np.nan, median_diff=float(np.median(d)) if len(d) else np.nan, ci_lo=np.nan, ci_hi=np.nan, cliff=np.nan, note="n<5 ou diferenças nulas")
    res = stats.wilcoxon(x, y, alternative="greater", zero_method="wilcox", method="auto")
    lo, hi = paired_bootstrap_ci(d)
    return dict(n=len(d), p=float(res.pvalue), W=float(res.statistic), median_diff=float(np.median(d)), ci_lo=lo, ci_hi=hi, cliff=cliffs_delta(x, y), note="")


def module_medians(df: pd.DataFrame, col: str) -> pd.DataFrame:
    return df.groupby(["module", "cond"])[col].median().unstack("cond")


# --------------------------------------------------------------------------- análises
def h1(df: pd.DataFrame) -> pd.DataFrame:
    m = module_medians(df, "ms_eval")
    rows, pv = [], []
    for other in ["C1", "C2", "C2r"]:
        if "C3" in m and other in m:
            pair = m[["C3", other]].dropna()
            r = wilcoxon_greater(pair["C3"].to_numpy(), pair[other].to_numpy())
        else:
            r = dict(n=0, p=np.nan, W=np.nan, median_diff=np.nan, ci_lo=np.nan, ci_hi=np.nan, cliff=np.nan, note="sem dados")
        rows.append(dict(comparison=f"C3 > {other}", **r))
        pv.append(r["p"])
    valid = [(i, p) for i, p in enumerate(pv) if not (p is None or math.isnan(p))]
    adj = holm([p for _, p in valid]) if valid else []
    for (i, _), a in zip(valid, adj):
        rows[i]["p_holm"] = a
    out = pd.DataFrame(rows)
    if "p_holm" not in out:
        out["p_holm"] = np.nan
    return out


def h2(df: pd.DataFrame, its: pd.DataFrame) -> dict:
    res: dict = {}
    # (a) deltas k=0 -> final em C3
    c3 = its[its.cond == "C3"]
    if not c3.empty:
        k0 = c3[c3.k == 0].groupby("module")[["ms_eval_best", "line_best"]].median()
        kf = c3.sort_values("k").groupby(["module", "rep"]).tail(1).groupby("module")[["ms_eval_best", "line_best"]].median()
        d = (kf - k0).dropna()
        d.columns = ["d_ms_eval", "d_line"]
        res["deltas"] = d
        if len(d) >= 5:
            rho, p = stats.spearmanr(d["d_line"], d["d_ms_eval"])
            res["spearman"] = (float(rho), float(p))
            w = stats.wilcoxon(d["d_line"], d["d_ms_eval"], alternative="greater") if not np.allclose(d["d_line"], d["d_ms_eval"]) else None
            res["wilcoxon_dline_gt_dms"] = (float(w.statistic), float(w.pvalue)) if w else (np.nan, np.nan)
    # (b) gap cobertura - score por condição
    gap = module_medians(df, "gap")
    res["gap_table"] = gap
    pairs = []
    for a, b in [("C3", "C0"), ("C3", "C2"), ("C1", "C0"), ("C3", "C0-suite")]:
        if a in gap and b in gap:
            pr = gap[[a, b]].dropna()
            if len(pr) >= 5 and not np.allclose(pr[a], pr[b]):
                w = stats.wilcoxon(pr[a], pr[b], alternative="two-sided")
                pairs.append(dict(comparison=f"gap {a} vs {b}", n=len(pr), p=float(w.pvalue), median_diff=float((pr[a] - pr[b]).median())))
    res["gap_tests"] = pd.DataFrame(pairs)
    # Holm dentro da família H2 (PROTOCOL.md §11): Spearman, Wilcoxon dos ganhos e os testes de lacuna
    fam = [("spearman", res["spearman"][1]) if "spearman" in res else None,
           ("wilcoxon_dline_gt_dms", res["wilcoxon_dline_gt_dms"][1]) if "wilcoxon_dline_gt_dms" in res else None]
    fam = [f for f in fam if f is not None and not math.isnan(f[1])]
    fam += [(f"gap:{i}", float(p)) for i, p in enumerate(res["gap_tests"]["p"])] if not res["gap_tests"].empty else []
    if fam:
        adj = dict(zip([k for k, _ in fam], holm([p for _, p in fam])))
        if "spearman" in adj:
            res["spearman_p_holm"] = adj["spearman"]
        if "wilcoxon_dline_gt_dms" in adj:
            res["wilcoxon_dline_gt_dms_p_holm"] = adj["wilcoxon_dline_gt_dms"]
        if not res["gap_tests"].empty:
            res["gap_tests"]["p_holm"] = [adj[f"gap:{i}"] for i in range(len(res["gap_tests"]))]
    return res


def h3(its: pd.DataFrame) -> dict:
    res: dict = {}
    for cond in ["C3", "C2r"]:
        x = its[its.cond == cond]
        if x.empty:
            continue
        # carrega adiante o último valor por run (runs que pararam cedo)
        kmax = int(x.k.max())
        full = []
        for rid, g in x.groupby("run_id"):
            g = g.sort_values("k").set_index("k").reindex(range(kmax + 1)).ffill()
            g["run_id"], g["module"] = rid, x[x.run_id == rid].module.iloc[0]
            g["k"] = g.index
            full.append(g.reset_index(drop=True))
        full = pd.concat(full)
        curve = full.groupby(["module", "k"])[["ms_eval_best", "tokens_cum"]].median().reset_index()
        res[f"curve_{cond}"] = curve
        piv = curve.pivot(index="module", columns="k", values="ms_eval_best")
        res[f"pivot_{cond}"] = piv
        delta = piv.diff(axis=1).iloc[:, 1:]
        res[f"delta_{cond}"] = delta
        if cond == "C3" and delta.shape[0] >= 4 and delta.shape[1] >= 3:
            d = delta.dropna()
            if len(d) >= 4:
                fr = stats.friedmanchisquare(*[d[c] for c in d.columns])
                res["friedman"] = (float(fr.statistic), float(fr.pvalue))
                # Page: espera-se Δ_k decrescente com k -> ordena colunas em k decrescente (crescente de "esperado")
                try:
                    pg = stats.page_trend_test(d[list(d.columns)[::-1]].to_numpy())
                    res["page"] = (float(pg.statistic), float(pg.pvalue))
                except Exception as e:  # noqa: BLE001
                    res["page"] = (np.nan, str(e))
        tp = curve.copy()
        base = tp[tp.k == 0].set_index("module")["ms_eval_best"]
        tp["gain_pp"] = tp.apply(lambda r: r["ms_eval_best"] - base.get(r["module"], np.nan), axis=1)
        tp["tokens_per_pp"] = tp.apply(lambda r: r["tokens_cum"] / r["gain_pp"] if r["gain_pp"] and r["gain_pp"] > 0 else np.nan, axis=1)
        res[f"tokens_per_pp_{cond}"] = tp.groupby("k")["tokens_per_pp"].median()
    return res


# --------------------------------------------------------------------------- validade (viés de sobrevivência)
# Desfechos atribuíveis ao modelo. provider_error / stryker_error / timeout são falhas de infraestrutura
# (refeitas pelo pipeline) e não entram nos denominadores.
MODEL_STATUSES = ("ok", "invalid_all_iterations")
LLM_CONDS = ["C1", "C2", "C2r", "C3"]


def _model_runs(df_all: pd.DataFrame, include_flaky: bool) -> pd.DataFrame:
    d = df_all[df_all.status.isin(MODEL_STATUSES)]
    return d if include_flaky else d[~d.flaky]


def validity(df_all: pd.DataFrame, its_all: pd.DataFrame, include_flaky: bool) -> tuple[pd.DataFrame, pd.DataFrame]:
    """Taxa de validade por condição e por módulo×condição.

    A análise principal só usa runs `ok`; um módulo em que o LLM não gera nenhum teste válido some das
    comparações, e isso favorece a condição que falha. Reportar a taxa torna esse viés visível.
    """
    d = _model_runs(df_all, include_flaky)
    d = d[d.cond.isin(LLM_CONDS)]
    it = its_all[its_all.run_id.isin(d.run_id)] if not its_all.empty else its_all
    rows = []
    for cond in LLM_CONDS:
        g = d[d.cond == cond]
        gi = it[it.cond == cond] if not it.empty else it
        n_runs, n_ok = len(g), int(g.status.eq("ok").sum())
        n_it, n_it_ok = len(gi), int(gi.valid.sum()) if len(gi) else 0
        rows.append(dict(
            cond=cond, n_runs=n_runs, n_runs_ok=n_ok, n_runs_invalid=n_runs - n_ok,
            run_valid_pct=100 * n_ok / n_runs if n_runs else np.nan,
            n_iter=n_it, n_iter_valid=n_it_ok, iter_valid_pct=100 * n_it_ok / n_it if n_it else np.nan,
        ))
    by_cond = pd.DataFrame(rows)
    by_mod = (
        d.assign(ok=d.status.eq("ok"))
        .groupby(["module", "cond"])
        .agg(n_runs=("run_id", "count"), n_runs_ok=("ok", "sum"))
        .reset_index()
    )
    by_mod["run_valid_pct"] = 100 * by_mod.n_runs_ok / by_mod.n_runs
    return by_cond, by_mod


def sensitivity_invalid_as_zero(df_all: pd.DataFrame, include_flaky: bool) -> pd.DataFrame:
    """Sensibilidade: run sem nenhum teste válido conta como mutation score 0 (em vez de ser descartado)."""
    d = _model_runs(df_all, include_flaky).copy()
    d.loc[d.status.eq("invalid_all_iterations"), "ms_eval"] = 0.0
    return d


# --------------------------------------------------------------------------- saída
def fmt(x, nd=1):
    return "n/d" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:.{nd}f}"


def tex_escape(s: str) -> str:
    return s.replace("_", r"\_")


def write_c0_text(df: pd.DataFrame, tdir: Path) -> None:
    """Parágrafo do artigo sobre o baseline humano, com todos os números calculados dos dados."""
    c0 = df[df.cond == "C0"]
    if c0.empty:
        (tdir / "c0_text.tex").write_text("\\pendente{rodar a condição C0}\n", encoding="utf-8")
        return
    p = lambda x: f"{x:.1f}".replace(".", ",")
    ms, lc, gap = c0.ms_all, c0.line_cov, c0.gap
    s = (f"O \\textit{{score}} total mediano da suíte humana no escopo do módulo é {p(ms.median())}\\% "
         f"(de {p(ms.min())}\\% a {p(ms.max())}\\%), com cobertura de linha mediana de {p(lc.median())}\\%. "
         f"A lacuna mediana entre cobertura de linha e \\textit{{score}} é de {p(gap.median())} pontos percentuais "
         f"(de {p(gap.min())} a {p(gap.max())}); isto é, mesmo testes humanos cobrem mais do que detectam, o que é coerente "
         f"com a premissa de H2. O módulo com menor \\textit{{score}} é \\texttt{{{c0.loc[ms.idxmin(), 'module'].replace('_', chr(92) + '_')}}} ({p(ms.min())}\\%).")
    su = df[df.cond == "C0-suite"]
    if not su.empty:
        j = c0.set_index("module")[["ms_all", "line_cov"]].join(su.set_index("module")[["ms_all", "line_cov"]], rsuffix="_suite", how="inner")
        if len(j) >= 1:
            d = (j["ms_all_suite"] - j["ms_all"])
            worst = d.idxmax().replace("_", chr(92) + "_")
            s += (f" Ao usar toda a suíte do repositório (C0-suite), o \\textit{{score}} mediano passa a {p(j['ms_all_suite'].median())}\\% "
                  f"({len(j)} módulos pareados); a maior diferença entre escopos é de {p(d.max())} pontos percentuais em "
                  f"\\texttt{{{worst}}}. O escopo dos testes humanos, portanto, muda substancialmente o \\textit{{baseline}}, e por isso ambos são reportados.")
    (tdir / "c0_text.tex").write_text(s + "\n", encoding="utf-8")


def write_tables(df: pd.DataFrame, h1r: pd.DataFrame, paper: Path, out: Path) -> None:
    tdir = paper / "tables"
    tdir.mkdir(parents=True, exist_ok=True)
    write_c0_text(df, tdir)
    # Tabela C0 por módulo (baseline humano)
    c0 = df[df.cond == "C0"].sort_values("module")
    lines = [r"\begin{tabular}{llrrrr}", r"\toprule", r"Módulo & Mutantes & Cob. linha (\%) & Cob. ramo (\%) & MS\textsubscript{all} (\%) & MS\textsubscript{eval} (\%) \\", r"\midrule"]
    for _, r in c0.iterrows():
        lines.append(f"{tex_escape(r['module'])} & {int(r['mutants_total'])} & {fmt(r['line_cov'])} & {fmt(r['branch_cov'])} & {fmt(r['ms_all'])} & {fmt(r['ms_eval'])} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (tdir / "tab_c0.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")
    # Tabela por condição
    g = df[df.cond.isin(COND_ORDER)].groupby("cond")
    summ = g.agg(n=("run_id", "count"), ms_eval=("ms_eval", "median"), ms_all=("ms_all", "median"), line=("line_cov", "median"), gap=("gap", "median"), tokens=("tokens", "median"), usd=("usd_ref", "median"), valid=("valid_rate", "median")).reindex(COND_ORDER)
    summ.to_csv(out / "summary_by_condition.csv")
    lines = [r"\begin{tabular}{lrrrrrr}", r"\toprule", r"Cond. & $n$ & MS\textsubscript{eval} & MS\textsubscript{all} & Cob. linha & Tokens & US\$ ref. \\", r"\midrule"]
    for c, r in summ.iterrows():
        n = 0 if pd.isna(r["n"]) else int(r["n"])
        lines.append(f"{c} & {n} & {fmt(r['ms_eval'])} & {fmt(r['ms_all'])} & {fmt(r['line'])} & {fmt(r['tokens'], 0)} & {fmt(r['usd'], 4)} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (tdir / "tab_cond.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")
    # Tabela H1
    lines = [r"\begin{tabular}{lrrrrrr}", r"\toprule", r"Comparação & $n$ & $\Delta$ mediana & IC 95\% & Cliff $\delta$ & $p$ & $p_{Holm}$ \\", r"\midrule"]
    for _, r in h1r.iterrows():
        ci = "n/d" if math.isnan(r["ci_lo"]) else f"[{r['ci_lo']:.1f}; {r['ci_hi']:.1f}]"
        lines.append(f"{r['comparison'].replace('>', '$>$')} & {int(r['n'])} & {fmt(r['median_diff'])} & {ci} & {fmt(r['cliff'], 2)} & {fmt(r['p'], 4)} & {fmt(r.get('p_holm', np.nan), 4)} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (tdir / "tab_h1.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_validity_table(by_cond: pd.DataFrame, tdir: Path) -> None:
    tdir.mkdir(parents=True, exist_ok=True)
    lines = [r"\begin{tabular}{lrrrrr}", r"\toprule",
             r"Cond. & Runs & Runs v\'alidos & Taxa de runs (\%) & Itera\c{c}\~oes v\'alidas/tentadas & Taxa de itera\c{c}\~oes (\%) \\", r"\midrule"]
    for _, r in by_cond.iterrows():
        lines.append(f"{r['cond']} & {int(r['n_runs'])} & {int(r['n_runs_ok'])} & {fmt(r['run_valid_pct'])} & "
                     f"{int(r['n_iter_valid'])}/{int(r['n_iter'])} & {fmt(r['iter_valid_pct'])} \\\\")
    lines += [r"\bottomrule", r"\end{tabular}"]
    (tdir / "tab_valid.tex").write_text("\n".join(lines) + "\n", encoding="utf-8")


def write_valid_text(by_cond: pd.DataFrame, by_mod: pd.DataFrame, h1r: pd.DataFrame, h1s: pd.DataFrame, tdir: Path) -> None:
    """Parágrafo do artigo sobre validade e viés de sobrevivência; todos os números vêm dos dados."""
    tdir.mkdir(parents=True, exist_ok=True)
    got = by_cond[by_cond.n_runs > 0]
    if got.empty:
        (tdir / "valid_text.tex").write_text("\\pendente{executar as condições com LLM para reportar a validade dos testes gerados}\n", encoding="utf-8")
        return
    pc = lambda x: "n/d" if x is None or (isinstance(x, float) and math.isnan(x)) else f"{x:.1f}".replace(".", ",")
    runs = ", ".join(f"{r.cond}: {pc(r.run_valid_pct)}\\% ({int(r.n_runs_ok)}/{int(r.n_runs)})" for r in got.itertuples())
    its = ", ".join(f"{r.cond}: {pc(r.iter_valid_pct)}\\%" for r in got.itertuples())
    s = (f"A fração de \\textit{{runs}} em que o modelo produziu ao menos um teste válido foi, por condição, {runs}. "
         f"Contando cada iteração, a fração de testes gerados que passam nos guardrails e no código original foi {its}. ")
    zero = by_mod[(by_mod.n_runs > 0) & (by_mod.n_runs_ok == 0)]
    if not zero.empty:
        def _join(xs: list[str]) -> str:
            return xs[0] if len(xs) == 1 else ", ".join(xs[:-1]) + " e " + xs[-1]

        items = []
        for mod, g in zero.groupby("module", sort=True):
            conds = [c for c in LLM_CONDS if c in set(g.cond)]
            items.append(f"\\texttt{{{tex_escape(mod)}}} ({'condição' if len(conds) == 1 else 'condições'} {_join(conds)})")
        plural = len(items) > 1
        s += (f"Em nenhum \\textit{{run}} de {_join(items)} o modelo gerou um teste válido; como a análise principal só considera "
              f"\\textit{{runs}} válidos, {'esses módulos saem' if plural else 'esse módulo sai'} das comparações da condição correspondente. ")
    main_by = h1r.set_index("comparison")
    parts = []
    for r in h1s.itertuples():
        if r.comparison in main_by.index:
            m = main_by.loc[r.comparison]
            parts.append(f"{r.comparison.replace('>', '$>$')}: $n$ de {int(m['n'])} para {int(r.n)} módulos e diferença mediana de "
                         f"{pc(float(m['median_diff']))} para {pc(float(r.median_diff))} pontos percentuais")
    if parts:
        s += ("Em uma análise de sensibilidade exploratória, definida depois de observadas as primeiras execuções, em que um "
              "\\textit{run} sem nenhum teste válido conta como \\textit{score} zero em vez de ser descartado, as comparações de H1 passam, "
              "da análise principal para a de sensibilidade, a: " + "; ".join(parts) + ".")
    (tdir / "valid_text.tex").write_text(s + "\n", encoding="utf-8")


def write_figures(df: pd.DataFrame, h2r: dict, h3r: dict, fdir: Path) -> None:
    fdir.mkdir(parents=True, exist_ok=True)
    conds = [c for c in COND_ORDER if c in set(df.cond)]
    m = module_medians(df, "ms_eval")
    if len(conds) and not m.empty:
        fig, ax = plt.subplots(figsize=(5.2, 3.2))
        present = [c for c in conds if c in m]
        ax.boxplot([m[c].dropna() for c in present], showmeans=True)
        ax.set_xticklabels(present)
        for i, c in enumerate([c for c in conds if c in m], 1):
            ax.scatter(np.full(m[c].notna().sum(), i), m[c].dropna(), s=10, alpha=0.6, zorder=3)
        ax.set_ylabel("Mutation score (avaliação, %)")
        ax.set_title("Score por condição (mediana por módulo)")
        fig.tight_layout()
        fig.savefig(fdir / "fig_ms_by_condition.pdf")
        plt.close(fig)
    if "pivot_C3" in h3r or "pivot_C2r" in h3r:
        fig, ax = plt.subplots(figsize=(5.2, 3.2))
        for cond, style in [("C3", "-o"), ("C2r", "--s")]:
            piv = h3r.get(f"pivot_{cond}")
            if piv is not None and not piv.empty:
                med = piv.median(axis=0)
                q1, q3 = piv.quantile(0.25), piv.quantile(0.75)
                ax.plot(med.index, med.values, style, label=cond)
                ax.fill_between(med.index, q1.values, q3.values, alpha=0.15)
        ax.set_xlabel("Iteração k")
        ax.set_ylabel("MS avaliação (%) da melhor iteração")
        ax.legend()
        fig.tight_layout()
        fig.savefig(fdir / "fig_curve_k.pdf")
        plt.close(fig)
    if "deltas" in h2r and not h2r["deltas"].empty:
        d = h2r["deltas"]
        fig, ax = plt.subplots(figsize=(4.2, 3.2))
        ax.scatter(d["d_line"], d["d_ms_eval"])
        lim = [min(d.min()) - 1, max(d.max()) + 1]
        ax.plot(lim, lim, ":", color="gray")
        ax.set_xlabel("Δ cobertura de linha (pp)")
        ax.set_ylabel("Δ mutation score (pp)")
        fig.tight_layout()
        fig.savefig(fdir / "fig_h2_deltas.pdf")
        plt.close(fig)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--runs", default="runs")
    ap.add_argument("--out", default="analysis/out")
    ap.add_argument("--paper", default="paper")
    ap.add_argument("--include-flaky", action="store_true", help="análise de sensibilidade V4")
    ap.add_argument("--stratum", choices=["low", "high"], help="V1: restringe aos módulos do estrato de memorização")
    a = ap.parse_args()
    out = Path(a.out)
    out.mkdir(parents=True, exist_ok=True)
    runs = load_runs(Path(a.runs))
    if not runs:
        raise SystemExit("nenhum result.json encontrado")
    df_all, its_all = runs_to_frames(runs)
    if a.stratum:
        # V1: o estrato vem do probe de memorização do módulo; C0 (sem memo no result.json) herda o do módulo
        mod_stratum = df_all.dropna(subset=["stratum"]).groupby("module").stratum.first()
        df_all["stratum"] = df_all["module"].map(mod_stratum)
        df_all = df_all[df_all.stratum == a.stratum].copy()
        its_all = its_all[its_all.run_id.isin(df_all.run_id)].copy()
        print(f"V1: estrato '{a.stratum}': módulos {sorted(df_all.module.unique())}")
    ok = df_all.status.eq("ok")
    keep = ok & (True if a.include_flaky else ~df_all.flaky)
    df = df_all[keep].copy()
    its = its_all[its_all.run_id.isin(df.run_id)].copy()
    df_all.to_csv(out / "runs_all.csv", index=False)
    its_all.to_csv(out / "iterations_all.csv", index=False)
    print(f"{len(df_all)} runs; {len(df)} usados (status ok{'' if a.include_flaky else ', sem flaky'}); excluídos: {len(df_all) - len(df)}")

    h1r = h1(df)
    h1r.to_csv(out / "h1.csv", index=False)
    # Viés de sobrevivência: taxa de validade + H1 com run inválido contado como score 0
    valid_c, valid_m = validity(df_all, its_all, a.include_flaky)
    valid_c.to_csv(out / "valid_rate_by_condition.csv", index=False)
    valid_m.to_csv(out / "valid_rate_by_module.csv", index=False)
    h1s = h1(sensitivity_invalid_as_zero(df_all, a.include_flaky))
    h1s.to_csv(out / "h1_sensitivity_invalid_as_zero.csv", index=False)
    h2r = h2(df, its)
    h3r = h3(its)
    for k, v in h3r.items():
        if isinstance(v, (pd.DataFrame, pd.Series)):
            v.to_csv(out / f"h3_{k}.csv")
    if "gap_table" in h2r:
        h2r["gap_table"].to_csv(out / "h2_gap_by_module.csv")
    if "deltas" in h2r:
        h2r["deltas"].to_csv(out / "h2_deltas.csv")
    summary = {
        "H1": h1r.to_dict(orient="records"),
        "H1_sensitivity_invalid_as_zero": h1s.to_dict(orient="records"),
        "validity_by_condition": valid_c.to_dict(orient="records"),
        "H2": {k: (v if not isinstance(v, (pd.DataFrame, pd.Series)) else v.to_dict()) for k, v in h2r.items() if k not in ("gap_table", "deltas")},
        "H3": {k: v for k, v in h3r.items() if k in ("friedman", "page")},
    }
    (out / "summary.json").write_text(json.dumps(summary, indent=2, default=lambda o: None if (isinstance(o, float) and math.isnan(o)) else str(o)), encoding="utf-8")
    write_tables(df, h1r, Path(a.paper), out)
    write_validity_table(valid_c, Path(a.paper) / "tables")
    write_valid_text(valid_c, valid_m, h1r, h1s, Path(a.paper) / "tables")
    write_figures(df, h2r, h3r, Path(a.paper) / "figs")
    print("\nValidade dos testes gerados (só desfechos do modelo; erros de infraestrutura excluídos):")
    print(valid_c.to_string(index=False, float_format=lambda x: f"{x:.1f}"))
    print("\nH1 (principal: só runs ok)")
    print(h1r.to_string(index=False))
    print("\nH1 (sensibilidade: run inválido = score 0)")
    print(h1s.to_string(index=False))
    print("análise concluída ->", out)


if __name__ == "__main__":
    main()
