import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { executeRun, type RunOptions } from "../src/pipeline.js";
import { MockProvider } from "../src/providers/mock.js";
import { ProviderError } from "../src/providers/provider.js";
import type { CheckResult, Evaluator, Measurement } from "../src/runner.js";
import type { StrykerReport } from "../src/types.js";

const BASE: StrykerReport = JSON.parse(readFileSync(new URL("./fixtures/ufo-query-report.json", import.meta.url), "utf8"));
const SCHEMA = JSON.parse(readFileSync(new URL("../../schemas/run-result.schema.json", import.meta.url), "utf8"));

const goodTest = (kills: number, extra = "") =>
  "```ts\n" +
  `import { describe, it, expect } from "vitest";\nimport { withQuery } from "../../src/query";\n` +
  `describe("withQuery", () => { it("a", () => { expect(withQuery("/", {})).toBe("/"); }); });\n` +
  `// ${"kills ".repeat(kills)}\n${extra}` +
  "\n```";

/** Avaliador falso: o nº de palavras "kills" no arquivo decide quantos sobreviventes viram mortos. */
class FakeEvaluator implements Evaluator {
  checks: string[] = [];
  failChecksUntil = 0;
  srcClean = true;
  constructor(private readonly flaky = false) {}
  async check(src: string): Promise<CheckResult> {
    this.checks.push(src);
    if (this.checks.length <= this.failChecksUntil) return { pass: false, output: "AssertionError: expected 'x' to be 'y'" };
    return { pass: true, output: "" };
  }
  private report(kills: number): StrykerReport {
    const r: StrykerReport = JSON.parse(JSON.stringify(BASE));
    let left = kills;
    for (const f of Object.values(r.files)) {
      for (const m of f.mutants) {
        if ((m.status === "Survived" || m.status === "NoCoverage") && left > 0) {
          m.status = "Killed";
          left--;
        }
      }
    }
    return r;
  }
  async measure(src: string): Promise<Measurement> {
    const kills = (src.match(/kills /g) ?? []).length;
    return { flaky: this.flaky, reruns: 3, coverage: { line_cov: 90 + Math.min(kills, 9), branch_cov: 80 }, report: this.report(kills), stryker_s: 1.5, vitest_s: 0.5 };
  }
  async measureHuman(): Promise<Measurement> {
    return { flaky: false, reruns: 3, coverage: { line_cov: 95, branch_cov: 90 }, report: this.report(4), stryker_s: 2, vitest_s: 1 };
  }
  async srcUnchanged(): Promise<boolean> {
    return this.srcClean;
  }
}

const files = new Map<string, string>();
const baseOpts = (over: Partial<RunOptions>): RunOptions => ({
  subject: { library: "ufo", repo: "unjs/ufo", commit: "a".repeat(40), license: "MIT", module: { id: "query", path: "src/query.ts", loc: 138, humanTests: ["test/query.test.ts"] } },
  condition: "C1",
  rep: 1,
  n: 3,
  provider: null,
  evaluator: new FakeEvaluator(),
  source: "export const x = 1;",
  importPath: "../../src/query",
  conventions: "# conv",
  splitSeed: "seed",
  temperature: 0.7,
  topP: null,
  maxOutputTokens: 1000,
  maxRepairs: 2,
  maxSurvivors: 5,
  pricing: { reference_model: "ref", usd_per_mtok_in: 0.1, usd_per_mtok_out: 0.4 },
  tooling: { node: "v22", vitest: "4", stryker: "10", split_seed: "seed", claude_md_sha256: null },
  artifacts: { write: async (n, c) => (files.set(n, c), n) },
  humanTestSources: ['import { it, expect } from "vitest"; it("a", () => { expect(1).toBe(1); });'],
  ...over,
});

const ajv = new Ajv2020({ allErrors: true, strict: false });
addFormats.default(ajv);
const validate = ajv.compile(SCHEMA);
const assertSchema = (r: unknown) => {
  const ok = validate(r);
  expect(ok, ajv.errorsText(validate.errors)).toBe(true);
};

describe("executeRun", () => {
  it("C0: uma iteração, sem LLM, resultado válido no schema", async () => {
    const r = await executeRun(baseOpts({ condition: "C0", rep: 0 }));
    expect(r.model).toBeNull();
    expect(r.iterations).toHaveLength(1);
    expect(r.final.cost.calls).toBe(0);
    expect(r.final.scores.ms_all).toBeGreaterThan(85.9);
    expect(r.subject.mutants_total).toBe(78);
    expect(r.run_id).toBe("ufo__query__C0__r0");
    assertSchema(r);
  });

  it("C1: uma chamada, sem convenções no prompt", async () => {
    const p = new MockProvider(() => goodTest(0));
    const r = await executeRun(baseOpts({ condition: "C1", provider: p }));
    expect(p.calls).toHaveLength(1);
    expect(p.calls[0]!.user).not.toContain("conventions");
    expect(r.tooling.claude_md_sha256).toBeNull();
    expect(r.status).toBe("ok");
    assertSchema(r);
  });

  it("C2: injeta as convenções e registra o hash", async () => {
    const p = new MockProvider(() => goodTest(0));
    const r = await executeRun(baseOpts({ condition: "C2", provider: p }));
    expect(p.calls[0]!.user).toContain("# conv");
    expect(r.tooling.claude_md_sha256).toMatch(/^[0-9a-f]{64}$/);
    assertSchema(r);
  });

  it("C3: itera com sobreviventes do grupo feedback e melhora; seleciona o melhor ms_feedback", async () => {
    const p = new MockProvider((_req, i) => goodTest(i * 4));
    const r = await executeRun(baseOpts({ condition: "C3", provider: p, n: 3 }));
    expect(r.iterations.map((i) => i.k)).toEqual([0, 1, 2, 3]);
    const fb = r.iterations.map((i) => i.scores.ms_feedback!);
    expect(fb[3]!).toBeGreaterThan(fb[0]!);
    expect(r.selected_iteration).toBe(3);
    expect(r.iterations[0]!.survivors_sent).toBe(0);
    expect(r.iterations[1]!.survivors_sent).toBeGreaterThan(0);
    expect(r.iterations[1]!.survivor_ids.length).toBe(r.iterations[1]!.survivors_sent);
    // o prompt de feedback contém sobreviventes e o arquivo atual
    expect(p.calls[1]!.user).toContain("did NOT detect");
    expect(p.calls[1]!.user).toContain("Current test file");
    // custo acumulado é monotônico
    const toks = r.iterations.map((i) => i.cost_cumulative.tokens_in + i.cost_cumulative.tokens_out);
    expect([...toks].sort((a, b) => a - b)).toEqual(toks);
    expect(r.final.tokens_per_pp).toBeGreaterThan(0);
    expect(r.final.cost.calls).toBe(4);
    assertSchema(r);
  });

  it("C3: nunca mostra ao agente mutantes do grupo avaliação", async () => {
    const p = new MockProvider((_req, i) => goodTest(i));
    const r = await executeRun(baseOpts({ condition: "C3", provider: p, n: 2, maxSurvivors: 1000 }));
    const { assignGroups } = await import("../src/mutants.js");
    const groups = assignGroups(BASE, "seed");
    for (const it of r.iterations) for (const id of it.survivor_ids) expect(groups.get(id)).toBe("feedback");
  });

  it("C3: para cedo quando não há sobreviventes no grupo feedback", async () => {
    const p = new MockProvider(() => goodTest(999));
    const r = await executeRun(baseOpts({ condition: "C3", provider: p, n: 5 }));
    expect(r.iterations).toHaveLength(1);
  });

  it("C2r: N+1 amostras independentes (sem sobreviventes no prompt)", async () => {
    const p = new MockProvider((_req, i) => goodTest(i));
    const r = await executeRun(baseOpts({ condition: "C2r", provider: p, n: 3 }));
    expect(r.iterations).toHaveLength(4);
    for (const c of p.calls) expect(c.user).not.toContain("did NOT detect");
    assertSchema(r);
  });

  it("reparo: teste que falha no original é reparado e o consumo conta", async () => {
    const ev = new FakeEvaluator();
    ev.failChecksUntil = 1;
    const p = new MockProvider(() => goodTest(0));
    const r = await executeRun(baseOpts({ condition: "C1", provider: p, evaluator: ev }));
    expect(p.calls).toHaveLength(2);
    expect(p.calls[1]!.user).toContain("not acceptable");
    expect(r.iterations[0]!.repair_attempts).toBe(1);
    expect(r.final.cost.repair_calls).toBe(1);
    expect(r.final.valid_rate).toBe(1);
    assertSchema(r);
  });

  it("descarta a iteração após esgotar os reparos e marca invalid_all_iterations", async () => {
    const ev = new FakeEvaluator();
    ev.failChecksUntil = 99;
    const p = new MockProvider(() => goodTest(0));
    const r = await executeRun(baseOpts({ condition: "C1", provider: p, evaluator: ev }));
    expect(p.calls).toHaveLength(3);
    expect(r.iterations[0]!.valid).toBe(false);
    expect(r.iterations[0]!.discard_reason).toBe("tests_fail_on_original");
    expect(r.status).toBe("invalid_all_iterations");
    expect(r.final.scores.ms_eval).toBeNull();
    assertSchema(r);
  });

  it("violação de guardrail (it.skip) dispara reparo sem rodar o Vitest", async () => {
    const ev = new FakeEvaluator();
    let calls = 0;
    const p = new MockProvider(() => (calls++ === 0 ? "```ts\nimport { it, expect } from \"vitest\";\nit.skip(\"a\", () => { expect(1).toBe(1); });\n```" : goodTest(0)));
    const r = await executeRun(baseOpts({ condition: "C1", provider: p, evaluator: ev }));
    expect(ev.checks).toHaveLength(1);
    expect(r.guardrails.forbidden_patterns_found).toContain("skip");
    expect(r.iterations[0]!.valid).toBe(true);
    assertSchema(r);
  });

  it("erro do provedor vira status provider_error e preserva o que já foi coletado", async () => {
    let n = 0;
    const p = new MockProvider(() => {
      if (n++ === 0) return goodTest(0);
      throw new ProviderError("quota", 429, false);
    });
    const r = await executeRun(baseOpts({ condition: "C3", provider: p, n: 3 }));
    expect(r.status).toBe("provider_error");
    expect(r.error).toContain("quota");
    expect(r.iterations).toHaveLength(1);
    assertSchema(r);
  });

  it("respeita o teto de tokens por módulo", async () => {
    const p = new MockProvider((_r, i) => ({ text: goodTest(i), tokensIn: 500, tokensOut: 500 }));
    const r = await executeRun(baseOpts({ condition: "C3", provider: p, n: 5, maxTokensPerModule: 1500 }));
    expect(r.status).toBe("budget_exhausted");
    expect(r.iterations.length).toBeLessThan(6);
    assertSchema(r);
  });

  it("registra flakiness e src alterado", async () => {
    const ev = new FakeEvaluator(true);
    ev.srcClean = false;
    const r = await executeRun(baseOpts({ condition: "C1", provider: new MockProvider(() => goodTest(0)), evaluator: ev }));
    expect(r.guardrails.flaky).toBe(true);
    expect(r.guardrails.src_diff_empty).toBe(false);
    assertSchema(r);
  });

  it("calcula gap_cov_ms = line_cov − ms_all", async () => {
    const r = await executeRun(baseOpts({ condition: "C0", rep: 0 }));
    expect(r.final.gap_cov_ms).toBeCloseTo(r.final.coverage.line_cov! - r.final.scores.ms_all!, 3);
  });
});
