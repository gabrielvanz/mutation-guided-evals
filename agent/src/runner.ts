import { copyFile, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
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
  /** Todos os arquivos mutados (unidades de API com vários arquivos). Padrão: [modulePath]. */
  mutatePaths?: string[];
  humanTests: string[];
  /** Diretório onde guardar relatório do Stryker e saídas brutas do run. */
  artifactDir: string;
  moduleId: string;
  strykerConcurrency?: number;
  vitestTimeoutMs?: number;
  strykerTimeoutMs?: number;
  reruns?: number;
  /**
   * Como o baseline humano (C0) é executado. Os testes GERADOS pelo LLM sempre rodam no Vitest; só a suíte humana
   * muda. "mocha" é usado por sujeitos cuja suíte original não é Vitest (ex.: ServeRest). Padrão: "vitest".
   */
  humanRunner?: "vitest" | "mocha";
  /** Configuração da suíte humana em Mocha (usada quando humanRunner = "mocha"). */
  mocha?: MochaConfig;
  /** Pastas (relativas ao workdir) restauradas com `git checkout` antes de cada execução de testes (ex.: bancos em arquivo). */
  resetPaths?: string[];
  /** Pathspec do `git diff` que garante que o código-fonte não foi alterado. Padrão: ["src"]. */
  srcPathspec?: string[];
  /** Variáveis de ambiente extras para as execuções de teste (Vitest, Mocha e Stryker). */
  testEnv?: Record<string, string>;
  /**
   * Script CommonJS (de agent/assets) carregado com `--require` em TODAS as execuções de teste (Vitest, Mocha e Stryker),
   * para que as condições C0 a C3 rodem no mesmo ambiente. "nedb-em-memoria": bancos NeDB em memória, com a semente
   * versionada e sem gravação em disco.
   */
  preload?: "nedb-em-memoria";
  /**
   * `false` desliga o `vitest.related` do Stryker. Necessário quando o código sob teste é CommonJS carregado por `require`
   * (fora do grafo de módulos do Vite): sem isso o Stryker não encontra testes relacionados aos arquivos mutados.
   */
  vitestRelated?: boolean;
}

const PRELOAD_FILE = ".eval-preload.cjs";
const NYCRC_FILE = ".nycrc.eval.json";
const PRELOAD_ASSETS: Record<string, string> = { "nedb-em-memoria": "nedb-em-memoria.cjs" };

export interface MochaConfig {
  /** Arquivos/globs do escopo "suite" do baseline humano. */
  suiteSpecs: string[];
  /** Módulos carregados antes dos testes (`--require`), relativos ao workdir. */
  require?: string[];
  /** Carregados só quando algum spec é de integração (caminho contém `test/integration`). */
  integrationRequire?: string[];
  timeoutMs?: number;
}

const GEN_DIR = "test/__generated__";

export class SubjectEvaluator implements Evaluator {
  private readonly o: Required<Omit<SubjectEvaluatorOptions, "preload" | "mutatePaths" | "vitestRelated">> & Pick<SubjectEvaluatorOptions, "preload" | "mutatePaths" | "vitestRelated">;

  constructor(o: SubjectEvaluatorOptions) {
    this.o = {
      strykerConcurrency: 1,
      vitestTimeoutMs: 120_000,
      strykerTimeoutMs: 40 * 60_000,
      reruns: 3,
      humanRunner: "vitest",
      mocha: { suiteSpecs: [] },
      resetPaths: [],
      srcPathspec: ["src"],
      testEnv: {},
      ...(Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined)) as unknown as SubjectEvaluatorOptions),
    };
  }

  /** Arquivos mutados e cobertos pela unidade. */
  private get mutateList(): string[] {
    return this.o.mutatePaths && this.o.mutatePaths.length > 0 ? this.o.mutatePaths : [this.o.modulePath];
  }

  get generatedRelPath(): string {
    return `${GEN_DIR}/${this.o.moduleId}.gen.test.ts`;
  }

  /**
   * Caminho do script JS de entrada da ferramenta. Executado via `node` (sem shell) para funcionar igual
   * em Linux e Windows (onde `.bin/<nome>` só existe como .cmd/.ps1 e o spawn direto falha com ENOENT).
   */
  private bin(name: "vitest" | "stryker" | "mocha" | "nyc"): string {
    const entry = { vitest: "vitest/vitest.mjs", stryker: "@stryker-mutator/core/bin/stryker.js", mocha: "mocha/bin/mocha.js", nyc: "nyc/bin/nyc.js" }[name];
    return path.join(this.o.workdir, "node_modules", entry);
  }

  /** Copia o script de preload para o workdir (relativo ao cwd dos processos de teste). */
  private async ensurePreload(): Promise<void> {
    if (!this.o.preload) return;
    await copyFile(path.resolve(import.meta.dirname, "../assets", PRELOAD_ASSETS[this.o.preload]!), path.join(this.o.workdir, PRELOAD_FILE));
  }

  /** Restaura as pastas de estado (ex.: bancos NeDB versionados) para que cada execução parta do mesmo estado. */
  private async resetState(): Promise<void> {
    for (const p of this.o.resetPaths) await run("git", ["checkout", "--", p], { cwd: this.o.workdir, timeoutMs: 30_000 });
  }

  private childEnv(): NodeJS.ProcessEnv | undefined {
    return Object.keys(this.o.testEnv).length > 0 ? this.o.testEnv : undefined;
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
    ${Object.keys(this.o.testEnv).length > 0 ? `env: ${JSON.stringify(this.o.testEnv)},` : ""}
    ${this.o.preload ? `poolOptions: { forks: { execArgv: ["--require", "./${PRELOAD_FILE}"] } },` : ""}
    ${coverage ? `coverage: { provider: "v8", include: ${JSON.stringify(this.mutateList)}, reporter: ["json-summary"], reportsDirectory: ${JSON.stringify(path.join(this.o.artifactDir, "coverage"))} },` : ""}
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
    await this.resetState();
    await this.ensurePreload();
    return run(process.execPath, [this.bin("vitest"), "run", "--config", "vitest.eval.config.mjs", "--reporter=default", ...extra], {
      cwd: this.o.workdir,
      timeoutMs: this.o.vitestTimeoutMs,
      env: this.childEnv(),
    });
  }

  private async writeMochaConfig(specs: string[]): Promise<void> {
    await this.ensurePreload();
    const cfg = this.o.preload ? { ...this.o.mocha, require: [`./${PRELOAD_FILE}`, ...(this.o.mocha.require ?? [])] } : this.o.mocha;
    await writeFile(path.join(this.o.workdir, ".mocharc.json"), JSON.stringify(buildMochaRc(specs, cfg), null, 2));
  }

  /** Executa a suíte humana no Mocha; com `coverage`, sob o nyc (json-summary restrito ao módulo). */
  private async mochaRun(specs: string[], coverage = false) {
    await this.writeMochaConfig(specs);
    await this.resetState();
    await writeFile(path.join(this.o.workdir, NYCRC_FILE), JSON.stringify({ "check-coverage": false, exclude: ["test/**"] }, null, 2));
    const mocha = [this.bin("mocha"), "--config", ".mocharc.json"];
    const args = coverage ? [this.bin("nyc"), ...nycArgs(path.join(this.o.artifactDir, "coverage"), this.mutateList), process.execPath, ...mocha] : mocha;
    return run(process.execPath, args, { cwd: this.o.workdir, timeoutMs: this.o.vitestTimeoutMs * 3, env: this.childEnv() });
  }

  async check(testSource: string): Promise<CheckResult> {
    await this.writeGenerated(testSource);
    const r = await this.vitest([this.generatedRelPath]);
    if (r.timedOut) return { pass: false, output: "TIMEOUT: a execução dos testes excedeu o limite (possível laço infinito)." };
    const out = truncate(`${r.stdout}\n${r.stderr}`.replace(/\u001b\[[0-9;]*m/g, ""), 8000);
    return { pass: r.code === 0, output: out };
  }

  private async coverageRun(include: string[], human = false): Promise<Coverage> {
    await rm(path.join(this.o.artifactDir, "coverage"), { recursive: true, force: true });
    const r = human && this.o.humanRunner === "mocha" ? await this.mochaRun(include, true) : await this.vitest(include, ["--coverage.enabled=true"], true);
    const f = path.join(this.o.artifactDir, "coverage", "coverage-summary.json");
    if (r.code !== 0 || !existsSync(f)) return { line_cov: null, branch_cov: null };
    const j = JSON.parse(await readFile(f, "utf8")) as CoverageSummary;
    return summarizeCoverage(j, this.mutateList);
  }

  private async rerunsFlaky(include: string[], human = false): Promise<boolean> {
    for (let i = 0; i < this.o.reruns; i++) {
      const r = human && this.o.humanRunner === "mocha" ? await this.mochaRun(include) : await this.vitest(include);
      if (r.code !== 0) return true;
    }
    return false;
  }

  private async stryker(include: string[], human = false): Promise<{ report: StrykerReport; seconds: number }> {
    const useMocha = human && this.o.humanRunner === "mocha";
    if (useMocha) await this.writeMochaConfig(include);
    else await this.writeVitestConfig(include, false);
    await this.resetState();
    await this.ensurePreload();
    const reportRel = path.join(this.o.artifactDir, "stryker-report.json");
    await rm(reportRel, { force: true });
    const cfg = buildStrykerConfig({
      runner: useMocha ? "mocha" : "vitest",
      modulePath: this.mutateList,
      reportFile: reportRel,
      concurrency: this.o.strykerConcurrency,
      vitestRelated: this.o.vitestRelated,
    });
    const cfgFile = path.join(this.o.workdir, "stryker.eval.config.json");
    await writeFile(cfgFile, JSON.stringify(cfg, null, 2));
    const r = await run(process.execPath, [this.bin("stryker"), "run", "stryker.eval.config.json"], {
      cwd: this.o.workdir,
      timeoutMs: this.o.strykerTimeoutMs,
      env: this.childEnv(),
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
    const include = scope === "module" ? this.o.humanTests : this.o.humanRunner === "mocha" ? this.o.mocha.suiteSpecs : await this.allHumanTests();
    return this.measureInclude(include, true);
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

  private async measureInclude(include: string[], human = false): Promise<Measurement> {
    const t0 = Date.now();
    const flaky = await this.rerunsFlaky(include, human);
    const coverage = await this.coverageRun(include, human);
    const vitest_s = (Date.now() - t0) / 1000;
    const { report, seconds } = await this.stryker(include, human);
    return { flaky, reruns: this.o.reruns, coverage, report, stryker_s: seconds, vitest_s };
  }

  async srcUnchanged(): Promise<boolean> {
    const r = await run("git", ["diff", "--quiet", "--", ...this.o.srcPathspec], { cwd: this.o.workdir, timeoutMs: 30_000 });
    return r.code === 0;
  }
}

/** `.mocharc` gerado para a execução (specs controlados pelo experimento, não pelo rc do projeto). */
export function buildMochaRc(specs: string[], cfg: MochaConfig): Record<string, unknown> {
  const integration = specs.some((s) => s.replaceAll("\\", "/").includes("test/integration"));
  const require = [...(cfg.require ?? []), ...(integration ? (cfg.integrationRequire ?? []) : [])];
  // `require: []` quebra o mocha-runner do Stryker no Node 24 (ERR_MODULE_NOT_FOUND em esm-utils): a chave só entra se houver itens.
  return { spec: specs, ...(require.length > 0 ? { require } : {}), timeout: cfg.timeoutMs ?? 30_000, exit: true, color: false };
}

/** Argumentos do nyc para medir só o(s) módulo(s) sob teste (sem `--all`, relatório json-summary). */
export function nycArgs(reportDir: string, modulePath: string | string[]): string[] {
  const include = (Array.isArray(modulePath) ? modulePath : [modulePath]).map((p) => `--include=${p}`);
  // rc próprio: o .nycrc.json do projeto exclui módulos (inclusive alguns do experimento) e exige 100% de cobertura.
  return [`--nycrc-path=${NYCRC_FILE}`, "--reporter=json-summary", `--report-dir=${reportDir}`, `--temp-dir=${path.join(reportDir, ".nyc_output")}`, "--all=false", "--check-coverage=false", ...include];
}

export type CoverageSummary = Record<string, { lines: { pct: number; total?: number; covered?: number }; branches: { pct: number; total?: number; covered?: number } }>;

/**
 * Cobertura do(s) arquivo(s) mutado(s) a partir de um coverage-summary (json-summary). Com um arquivo, é o percentual
 * dele (como sempre foi); com vários, a soma de linhas/ramos cobertos sobre o total de todos eles.
 */
export function summarizeCoverage(j: CoverageSummary, mutate: string[]): Coverage {
  const norm = (k: string): string => k.replaceAll("\\", "/");
  const entries = mutate.map((m) => Object.entries(j).find(([k]) => k !== "total" && norm(k).endsWith(m))?.[1]);
  if (mutate.length === 1) {
    const v = entries[0] ?? j.total;
    return { line_cov: v ? v.lines.pct : null, branch_cov: v ? v.branches.pct : null };
  }
  const found = entries.filter((e): e is NonNullable<typeof e> => e !== undefined);
  if (found.length === 0) return { line_cov: null, branch_cov: null };
  const pct = (get: (e: (typeof found)[number]) => { total?: number; covered?: number }): number | null => {
    const total = found.reduce((n, e) => n + (get(e).total ?? 0), 0);
    const covered = found.reduce((n, e) => n + (get(e).covered ?? 0), 0);
    return total > 0 ? Math.round((covered / total) * 10000) / 100 : null;
  };
  return { line_cov: pct((e) => e.lines), branch_cov: pct((e) => e.branches) };
}

export interface StrykerConfigInput {
  runner: "vitest" | "mocha";
  /** Arquivo(s) a mutar. */
  modulePath: string | string[];
  reportFile: string;
  concurrency: number;
  /** `false` desliga o `vitest.related` (código CommonJS fora do grafo do Vite). Ausente: configuração original. */
  vitestRelated?: boolean;
}

/** Configuração do Stryker do experimento. Para o Vitest é a mesma usada nas 9 unidades originais. */
export function buildStrykerConfig(i: StrykerConfigInput): Record<string, unknown> {
  const base = {
    coverageAnalysis: "perTest",
    mutate: Array.isArray(i.modulePath) ? i.modulePath : [i.modulePath],
    reporters: ["json"],
    jsonReporter: { fileName: i.reportFile },
    concurrency: i.concurrency,
    timeoutMS: 10000,
    timeoutFactor: 1.5,
    disableTypeChecks: true,
    incremental: false,
    cleanTempDir: true,
  };
  if (i.runner === "mocha") {
    return { testRunner: "mocha", plugins: ["@stryker-mutator/mocha-runner"], mochaOptions: { config: ".mocharc.json" }, ...base };
  }
  return {
    testRunner: "vitest",
    plugins: ["@stryker-mutator/vitest-runner"],
    vitest: { configFile: "vitest.eval.config.mjs", ...(i.vitestRelated === false ? { related: false } : {}) },
    ...base,
  };
}
