import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { run } from "./exec.js";
import type { Coverage, StrykerReport } from "./types.js";
import { truncate } from "./util.js";

export interface Measurement {
  flaky: boolean;
  reruns: number;
  coverage: Coverage;
  report: StrykerReport;
  stryker_s: number;
  vitest_s: number;
}

export interface CheckResult {
  pass: boolean;
  output: string;
}

/** Contrato que o pipeline usa; a implementação real executa Vitest/Stryker, os testes usam um falso. */
export interface Evaluator {
  check(testSource: string): Promise<CheckResult>;
  measure(testSource: string): Promise<Measurement>;
  measureHuman(scope: "module" | "suite"): Promise<Measurement>;
  srcUnchanged(): Promise<boolean>;
}

export interface SubjectEvaluatorOptions {
  /** Checkout da biblioteca (com dependências, Stryker e @vitest/coverage-v8 instalados). */
  workdir: string;
  /** Caminho do módulo relativo ao workdir, ex.: src/query.ts */
  modulePath: string;
  humanTests: string[];
  /** Diretório onde guardar relatório do Stryker e saídas brutas do run. */
  artifactDir: string;
  moduleId: string;
  strykerConcurrency?: number;
  vitestTimeoutMs?: number;
  strykerTimeoutMs?: number;
  reruns?: number;
}

const GEN_DIR = "test/__generated__";

export class SubjectEvaluator implements Evaluator {
  private readonly o: Required<SubjectEvaluatorOptions>;

  constructor(o: SubjectEvaluatorOptions) {
    this.o = {
      strykerConcurrency: 1,
      vitestTimeoutMs: 120_000,
      strykerTimeoutMs: 40 * 60_000,
      reruns: 3,
      ...o,
    };
  }

  get generatedRelPath(): string {
    return `${GEN_DIR}/${this.o.moduleId}.gen.test.ts`;
  }

  /**
   * Caminho do script JS de entrada da ferramenta. Executado via `node` (sem shell) para funcionar igual
   * em Linux e Windows (onde `.bin/<nome>` só existe como .cmd/.ps1 e o spawn direto falha com ENOENT).
   */
  private bin(name: "vitest" | "stryker"): string {
    const entry = name === "vitest" ? "vitest/vitest.mjs" : "@stryker-mutator/core/bin/stryker.js";
    return path.join(this.o.workdir, "node_modules", entry);
  }

  private async writeVitestConfig(include: string[], coverage: boolean): Promise<string> {
    const cfg = `import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: ${JSON.stringify(include)},
    exclude: [],
    globals: false,
    testTimeout: 10000,
    typecheck: { enabled: false },
    ${coverage ? `coverage: { provider: "v8", include: [${JSON.stringify(this.o.modulePath)}], reporter: ["json-summary"], reportsDirectory: ${JSON.stringify(path.join(this.o.artifactDir, "coverage"))} },` : ""}
  },
});
`;
    const file = path.join(this.o.workdir, "vitest.eval.config.mjs");
    await writeFile(file, cfg);
    return file;
  }

  private async cleanGenerated(): Promise<void> {
    await rm(path.join(this.o.workdir, GEN_DIR), { recursive: true, force: true });
  }

  private async writeGenerated(source: string): Promise<void> {
    await this.cleanGenerated();
    await mkdir(path.join(this.o.workdir, GEN_DIR), { recursive: true });
    await writeFile(path.join(this.o.workdir, this.generatedRelPath), source);
  }

  private async vitest(include: string[], extra: string[] = [], coverage = false) {
    await this.writeVitestConfig(include, coverage);
    return run(process.execPath, [this.bin("vitest"), "run", "--config", "vitest.eval.config.mjs", "--reporter=default", ...extra], {
      cwd: this.o.workdir,
      timeoutMs: this.o.vitestTimeoutMs,
    });
  }

  async check(testSource: string): Promise<CheckResult> {
    await this.writeGenerated(testSource);
    const r = await this.vitest([this.generatedRelPath]);
    if (r.timedOut) return { pass: false, output: "TIMEOUT: a execução dos testes excedeu o limite (possível laço infinito)." };
    const out = truncate(`${r.stdout}\n${r.stderr}`.replace(/\u001b\[[0-9;]*m/g, ""), 8000);
    return { pass: r.code === 0, output: out };
  }

  private async coverageRun(include: string[]): Promise<Coverage> {
    await rm(path.join(this.o.artifactDir, "coverage"), { recursive: true, force: true });
    const r = await this.vitest(include, ["--coverage.enabled=true"], true);
    const f = path.join(this.o.artifactDir, "coverage", "coverage-summary.json");
    if (r.code !== 0 || !existsSync(f)) return { line_cov: null, branch_cov: null };
    const j = JSON.parse(await readFile(f, "utf8")) as Record<string, { lines: { pct: number }; branches: { pct: number } }>;
    const entry = Object.entries(j).find(([k]) => k !== "total" && k.endsWith(this.o.modulePath)) ?? ["total", j.total];
    const v = entry[1];
    return { line_cov: v ? v.lines.pct : null, branch_cov: v ? v.branches.pct : null };
  }

  private async rerunsFlaky(include: string[]): Promise<boolean> {
    for (let i = 0; i < this.o.reruns; i++) {
      const r = await this.vitest(include);
      if (r.code !== 0) return true;
    }
    return false;
  }

  private async stryker(include: string[]): Promise<{ report: StrykerReport; seconds: number }> {
    await this.writeVitestConfig(include, false);
    const reportRel = path.join(this.o.artifactDir, "stryker-report.json");
    await rm(reportRel, { force: true });
    const cfg = {
      testRunner: "vitest",
      plugins: ["@stryker-mutator/vitest-runner"],
      coverageAnalysis: "perTest",
      mutate: [this.o.modulePath],
      reporters: ["json"],
      jsonReporter: { fileName: reportRel },
      vitest: { configFile: "vitest.eval.config.mjs" },
      concurrency: this.o.strykerConcurrency,
      timeoutMS: 10000,
      timeoutFactor: 1.5,
      disableTypeChecks: true,
      incremental: false,
      cleanTempDir: true,
    };
    const cfgFile = path.join(this.o.workdir, "stryker.eval.config.json");
    await writeFile(cfgFile, JSON.stringify(cfg, null, 2));
    const r = await run(process.execPath, [this.bin("stryker"), "run", "stryker.eval.config.json"], {
      cwd: this.o.workdir,
      timeoutMs: this.o.strykerTimeoutMs,
    });
    if (!existsSync(reportRel)) {
      throw new Error(`Stryker não gerou relatório (code=${r.code}, timeout=${r.timedOut}): ${truncate(r.stdout + r.stderr, 2000)}`);
    }
    const report = JSON.parse(await readFile(reportRel, "utf8")) as StrykerReport;
    return { report, seconds: r.ms / 1000 };
  }

  async measure(testSource: string): Promise<Measurement> {
    await this.writeGenerated(testSource);
    return this.measureInclude([this.generatedRelPath]);
  }

  async measureHuman(scope: "module" | "suite"): Promise<Measurement> {
    await this.cleanGenerated();
    const include = scope === "module" ? this.o.humanTests : await this.allHumanTests();
    return this.measureInclude(include);
  }

  private async allHumanTests(): Promise<string[]> {
    const dir = path.join(this.o.workdir, "test");
    const out: string[] = [];
    const walk = async (d: string): Promise<void> => {
      for (const e of await readdir(d, { withFileTypes: true })) {
        const p = path.join(d, e.name);
        if (e.isDirectory()) {
          if (e.name !== "__generated__" && e.name !== "fixture" && e.name !== "fixtures" && e.name !== "bench") await walk(p);
        } else if (/\.(test|spec)\.[cm]?[tj]s$/.test(e.name)) out.push(path.relative(this.o.workdir, p));
      }
    };
    await walk(dir);
    return out;
  }

  private async measureInclude(include: string[]): Promise<Measurement> {
    const t0 = Date.now();
    const flaky = await this.rerunsFlaky(include);
    const coverage = await this.coverageRun(include);
    const vitest_s = (Date.now() - t0) / 1000;
    const { report, seconds } = await this.stryker(include);
    return { flaky, reruns: this.o.reruns, coverage, report, stryker_s: seconds, vitest_s };
  }

  async srcUnchanged(): Promise<boolean> {
    const r = await run("git", ["diff", "--quiet", "--", "src"], { cwd: this.o.workdir, timeoutMs: 30_000 });
    return r.code === 0;
  }
}
