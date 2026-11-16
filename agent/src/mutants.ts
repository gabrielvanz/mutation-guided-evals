import type {
  Group,
  MutantCounts,
  Scores,
  StrykerMutant,
  StrykerReport,
  Survivor,
} from "./types.js";
import { round, sha256 } from "./util.js";

/** Chave estável de um mutante, independente do id numérico do Stryker. */
export function mutantKey(file: string, m: StrykerMutant): string {
  const { start, end } = m.location;
  // o fim entra na chave: mutantes aninhados podem começar na mesma posição
  return `${file}:${start.line}:${start.column}-${end.line}:${end.column}:${m.mutatorName}:${m.replacement ?? ""}`;
}

/**
 * Split determinístico e estratificado por mutator (PROTOCOL.md §7).
 * É calculado sobre TODOS os mutantes gerados, independentemente do status,
 * de modo que o mesmo mutante cai no mesmo grupo em todas as condições.
 * Dentro de cada mutator, ordena-se por sha256(seed + chave) e alterna-se
 * feedback, eval, feedback, ... (o excedente de contagem ímpar vai ao feedback).
 */
export function assignGroups(report: StrykerReport, seed: string): Map<string, Group> {
  const byMutator = new Map<string, { key: string; h: string }[]>();
  for (const [file, f] of Object.entries(report.files)) {
    for (const m of f.mutants) {
      const key = mutantKey(file, m);
      const arr = byMutator.get(m.mutatorName) ?? [];
      arr.push({ key, h: sha256(seed + "\u0000" + key) });
      byMutator.set(m.mutatorName, arr);
    }
  }
  const groups = new Map<string, Group>();
  for (const arr of byMutator.values()) {
    arr.sort((a, b) => (a.h < b.h ? -1 : a.h > b.h ? 1 : a.key < b.key ? -1 : 1));
    arr.forEach((e, i) => groups.set(e.key, i % 2 === 0 ? "feedback" : "eval"));
  }
  return groups;
}

export function emptyCounts(): MutantCounts {
  return { killed: 0, survived: 0, no_coverage: 0, timeout: 0, compile_error: 0, runtime_error: 0, ignored: 0 };
}

export function addStatus(c: MutantCounts, status: string): void {
  switch (status) {
    case "Killed": c.killed++; break;
    case "Survived": c.survived++; break;
    case "NoCoverage": c.no_coverage++; break;
    case "Timeout": c.timeout++; break;
    case "CompileError": c.compile_error++; break;
    case "RuntimeError": c.runtime_error++; break;
    case "Ignored": c.ignored++; break;
    default: break; // Pending não entra
  }
}

/**
 * Mutation score no critério do Stryker: detectados / (detectados + sobreviventes + sem cobertura).
 * Timeout conta como detectado; CompileError, RuntimeError e Ignored saem do denominador.
 * Retorna percentual 0..100, ou null se o denominador é zero.
 */
export function scoreOf(c: MutantCounts): number | null {
  const detected = c.killed + c.timeout;
  const den = detected + c.survived + c.no_coverage;
  return den === 0 ? null : (100 * detected) / den;
}

/** Score só sobre mutantes cobertos (exclui NoCoverage). */
export function coveredScoreOf(c: MutantCounts): number | null {
  const detected = c.killed + c.timeout;
  const den = detected + c.survived;
  return den === 0 ? null : (100 * detected) / den;
}

export interface ScoreBundle {
  scores: Scores;
  eval: MutantCounts;
  feedback: MutantCounts;
  all: MutantCounts;
}

export function computeScores(report: StrykerReport, groups: Map<string, Group>): ScoreBundle {
  const ev = emptyCounts();
  const fb = emptyCounts();
  const all = emptyCounts();
  for (const [file, f] of Object.entries(report.files)) {
    for (const m of f.mutants) {
      addStatus(all, m.status);
      const g = groups.get(mutantKey(file, m));
      if (g === "eval") addStatus(ev, m.status);
      else if (g === "feedback") addStatus(fb, m.status);
    }
  }
  return {
    scores: {
      ms_eval: round(scoreOf(ev)),
      ms_feedback: round(scoreOf(fb)),
      ms_all: round(scoreOf(all)),
      ms_covered: round(coveredScoreOf(all)),
    },
    eval: ev,
    feedback: fb,
    all,
  };
}

export function totalMutants(report: StrykerReport): number {
  return Object.values(report.files).reduce((n, f) => n + f.mutants.length, 0);
}

/**
 * Converte posição Stryker (linha e coluna de base 1, conforme o
 * mutation-testing-report-schema) em offset dentro do texto.
 */
export function offsetOf(source: string, line: number, column: number): number {
  let off = 0;
  for (let l = 1; l < line; l++) {
    const nl = source.indexOf("\n", off);
    if (nl === -1) return source.length;
    off = nl + 1;
  }
  return Math.min(off + column - 1, source.length);
}

export function snippetOf(source: string, m: StrykerMutant): string {
  const a = offsetOf(source, m.location.start.line, m.location.start.column);
  const b = offsetOf(source, m.location.end.line, m.location.end.column);
  return source.slice(a, b);
}

function lineOf(source: string, line: number): string {
  return source.split("\n")[line - 1] ?? "";
}

/**
 * Seleciona até `limit` sobreviventes do grupo feedback, estratificados por mutator
 * (round-robin), em ordem determinística dada a seed.
 */
export function selectSurvivors(
  report: StrykerReport,
  groups: Map<string, Group>,
  opts: { limit: number; seed: string },
): Survivor[] {
  const pools = new Map<string, Survivor[]>();
  for (const [file, f] of Object.entries(report.files)) {
    for (const m of f.mutants) {
      if (m.status !== "Survived" && m.status !== "NoCoverage") continue;
      const key = mutantKey(file, m);
      if (groups.get(key) !== "feedback") continue;
      const s: Survivor = {
        key,
        file,
        line: m.location.start.line,
        mutator: m.mutatorName,
        status: m.status,
        original: snippetOf(f.source, m),
        replacement: m.replacement ?? "",
        lineText: lineOf(f.source, m.location.start.line),
      };
      const arr = pools.get(m.mutatorName) ?? [];
      arr.push(s);
      pools.set(m.mutatorName, arr);
    }
  }
  const order = [...pools.keys()].sort((a, b) => (sha256(opts.seed + a) < sha256(opts.seed + b) ? -1 : 1));
  for (const arr of pools.values()) {
    arr.sort((a, b) => (sha256(opts.seed + a.key) < sha256(opts.seed + b.key) ? -1 : 1));
  }
  const out: Survivor[] = [];
  let progressed = true;
  while (out.length < opts.limit && progressed) {
    progressed = false;
    for (const mutator of order) {
      const next = pools.get(mutator)?.shift();
      if (next) {
        out.push(next);
        progressed = true;
        if (out.length >= opts.limit) break;
      }
    }
  }
  // ordena por linha para leitura mais natural no prompt
  return out.sort((a, b) => a.line - b.line || (a.key < b.key ? -1 : 1));
}

export function countFeedbackSurvivors(report: StrykerReport, groups: Map<string, Group>): number {
  let n = 0;
  for (const [file, f] of Object.entries(report.files)) {
    for (const m of f.mutants) {
      if ((m.status === "Survived" || m.status === "NoCoverage") && groups.get(mutantKey(file, m)) === "feedback") n++;
    }
  }
  return n;
}
