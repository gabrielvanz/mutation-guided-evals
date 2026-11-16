import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  assignGroups,
  computeScores,
  countFeedbackSurvivors,
  emptyCounts,
  mutantKey,
  scoreOf,
  selectSurvivors,
  snippetOf,
} from "../src/mutants.js";
import type { StrykerReport } from "../src/types.js";

const report: StrykerReport = JSON.parse(readFileSync(new URL("./fixtures/ufo-query-report.json", import.meta.url), "utf8"));
const SEED = "test-seed";

describe("scoreOf (critério do Stryker)", () => {
  it("Timeout conta como detectado; RuntimeError, CompileError e Ignored saem do denominador", () => {
    const c = { ...emptyCounts(), killed: 6, timeout: 2, survived: 1, no_coverage: 1, runtime_error: 50, compile_error: 7, ignored: 3 };
    expect(scoreOf(c)).toBeCloseTo(80, 10);
  });
  it("retorna null quando não há mutantes válidos", () => {
    expect(scoreOf({ ...emptyCounts(), runtime_error: 3 })).toBeNull();
  });
});

describe("computeScores sobre relatório real do Stryker (ufo/query.ts)", () => {
  const groups = assignGroups(report, SEED);
  const b = computeScores(report, groups);
  it("reproduz o score total que o Stryker reportou (67 mortos, 9 sobreviventes, 2 sem cobertura)", () => {
    expect(b.all.killed).toBe(67);
    expect(b.all.survived).toBe(9);
    expect(b.all.no_coverage).toBe(2);
    expect(b.scores.ms_all).toBeCloseTo(85.9, 1);
  });
  it("feedback + eval particionam todos os mutantes", () => {
    const sum = (c: typeof b.all) => c.killed + c.survived + c.no_coverage + c.timeout + c.compile_error + c.runtime_error + c.ignored;
    expect(sum(b.feedback) + sum(b.eval)).toBe(sum(b.all));
    expect(sum(b.feedback)).toBeGreaterThanOrEqual(sum(b.eval));
    expect(sum(b.feedback) - sum(b.eval)).toBeLessThanOrEqual(new Set(Object.values(report.files).flatMap((f) => f.mutants.map((m) => m.mutatorName))).size);
  });
});

describe("assignGroups", () => {
  it("é determinístico", () => {
    const a = assignGroups(report, SEED);
    const b = assignGroups(report, SEED);
    expect([...a.entries()]).toEqual([...b.entries()]);
  });
  it("não depende do status dos mutantes (mesmo grupo em todas as condições)", () => {
    const mutated: StrykerReport = JSON.parse(JSON.stringify(report));
    for (const f of Object.values(mutated.files)) for (const m of f.mutants) m.status = "Killed";
    expect([...assignGroups(mutated, SEED).entries()]).toEqual([...assignGroups(report, SEED).entries()]);
  });
  it("seeds diferentes dão splits diferentes", () => {
    const a = [...assignGroups(report, "A").entries()];
    const b = [...assignGroups(report, "B").entries()];
    expect(a).not.toEqual(b);
  });
  it("está balanceado por mutator (diferença ≤ 1, excedente no feedback)", () => {
    const g = assignGroups(report, SEED);
    const per = new Map<string, { fb: number; ev: number }>();
    for (const [file, f] of Object.entries(report.files)) {
      for (const m of f.mutants) {
        const e = per.get(m.mutatorName) ?? { fb: 0, ev: 0 };
        if (g.get(mutantKey(file, m)) === "feedback") e.fb++;
        else e.ev++;
        per.set(m.mutatorName, e);
      }
    }
    for (const [name, e] of per) {
      expect(e.fb - e.ev, name).toBeGreaterThanOrEqual(0);
      expect(e.fb - e.ev, name).toBeLessThanOrEqual(1);
    }
  });
  it("as chaves são únicas", () => {
    const keys = Object.entries(report.files).flatMap(([file, f]) => f.mutants.map((m) => mutantKey(file, m)));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("snippetOf", () => {
  it("recorta o trecho original usando linha/coluna de base 1", () => {
    const [file, f] = Object.entries(report.files)[0]!;
    void file;
    const lits = f.mutants.filter((m) => m.mutatorName === "StringLiteral").slice(0, 10);
    expect(lits.length).toBeGreaterThan(0);
    for (const m of lits) {
      const s = snippetOf(f.source, m);
      expect(s, `mutante ${m.id}`).toMatch(/^["'`].*["'`]$/s);
    }
  });
  it("recorta o texto exato de um sobrevivente conhecido (src/query.ts:62:40)", () => {
    const f = Object.values(report.files)[0]!;
    const m = f.mutants.find((x) => x.location.start.line === 62 && x.location.start.column === 40 && x.mutatorName === "StringLiteral" && x.status === "Survived");
    expect(m).toBeDefined();
    expect(snippetOf(f.source, m!)).toBe('"constructor"');
  });
});

describe("selectSurvivors", () => {
  const groups = assignGroups(report, SEED);
  it("só devolve sobreviventes do grupo feedback, até o limite", () => {
    const s = selectSurvivors(report, groups, { limit: 3, seed: "x" });
    expect(s.length).toBeLessThanOrEqual(3);
    for (const x of s) {
      expect(groups.get(x.key)).toBe("feedback");
      expect(["Survived", "NoCoverage"]).toContain(x.status);
    }
  });
  it("com limite grande devolve todos os sobreviventes do feedback, sem duplicatas", () => {
    const s = selectSurvivors(report, groups, { limit: 1000, seed: "x" });
    expect(s.length).toBe(countFeedbackSurvivors(report, groups));
    expect(new Set(s.map((x) => x.key)).size).toBe(s.length);
  });
  it("é determinístico dada a seed", () => {
    const a = selectSurvivors(report, groups, { limit: 4, seed: "s1" }).map((x) => x.key);
    const b = selectSurvivors(report, groups, { limit: 4, seed: "s1" }).map((x) => x.key);
    expect(a).toEqual(b);
  });
  it("nunca revela mutantes do grupo avaliação", () => {
    const s = selectSurvivors(report, groups, { limit: 1000, seed: "x" });
    for (const x of s) expect(groups.get(x.key)).not.toBe("eval");
  });
});
