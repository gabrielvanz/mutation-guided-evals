import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { loadConventions, loadExperiment, loadPricing, loadSplitSeed, loadSubjects, providerFromEnv } from "./config.js";
import { executeRun, runId, type ArtifactSink } from "./pipeline.js";
import { memorizationProbe } from "./probe.js";
import { SubjectEvaluator } from "./runner.js";
import type { Condition, RunResult } from "./types.js";
import { sha256 } from "./util.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const CONDITIONS: Condition[] = ["C0", "C1", "C2", "C2r", "C3"];
const RETRY_STATUSES = new Set(["provider_error", "stryker_error", "timeout"]);

/**
 * Um resultado anterior é definitivo (não precisa refazer) se terminou sem erro de infraestrutura E,
 * quando é uma condição com LLM, foi gerado pelo MESMO modelo (PROTOCOL/CLAUDE.md: não misturar modelos).
 * O baseline humano (C0) não usa modelo. Sem `model` (uso local sem LLM_MODEL), só o status conta.
 */
function isFinal(prev: RunResult, model: string | undefined): boolean {
  if (RETRY_STATUSES.has(prev.status)) return false;
  if (prev.condition === "C0") return true;
  return !model || prev.model?.model_id === model;
}

async function pkgVersion(workdir: string, name: string): Promise<string> {
  try {
    const p = JSON.parse(await readFile(path.join(workdir, "node_modules", name, "package.json"), "utf8")) as { version: string };
    return p.version;
  } catch {
    return "unknown";
  }
}

function gitSha(): string | undefined {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd: ROOT, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

function dirSink(dir: string): ArtifactSink {
  return {
    async write(name, content) {
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, name), content);
      return path.relative(ROOT, path.join(dir, name));
    },
  };
}

async function cmdRun(argv: string[]): Promise<number> {
  const { values: v } = parseArgs({
    args: argv,
    options: {
      library: { type: "string" },
      module: { type: "string" },
      condition: { type: "string" },
      rep: { type: "string", default: "1" },
      workdir: { type: "string" },
      out: { type: "string", default: path.join(ROOT, "runs") },
      // conjunto alternativo de sujeitos (extensão), ex.: data/subjects-serverest.json; o padrão é o experimento principal
      subjects: { type: "string" },
      n: { type: "string" },
      "c0-scope": { type: "string", default: "module" },
      force: { type: "boolean", default: false },
      "memo-file": { type: "string" },
    },
  });
  if (!v.library || !v.module || !v.condition || !v.workdir) throw new Error("uso: run --library L --module M --condition C0|C1|C2|C2r|C3 --rep R --workdir DIR");
  const condition = v.condition as Condition;
  if (!CONDITIONS.includes(condition)) throw new Error(`condição inválida: ${v.condition}`);
  const rep = condition === "C0" ? 0 : Number(v.rep);
  const c0Scope = (v["c0-scope"] as "module" | "suite") ?? "module";

  const [cfg, subjects, pricing, splitSeed] = await Promise.all([loadExperiment(ROOT), loadSubjects(ROOT, v.subjects), loadPricing(ROOT), loadSplitSeed(ROOT)]);
  const lib = subjects.libraries.find((l) => l.name === v.library);
  const mod = lib?.modules.find((m) => m.id === v.module);
  if (!lib || !mod) throw new Error(`módulo não encontrado em data/subjects.json: ${v.library}/${v.module}`);

  const id = runId(lib.name, mod.id, condition, rep, condition === "C0" ? c0Scope : undefined);
  // absoluto: o Stryker resolve o caminho do relatório a partir do workdir, não do cwd do agente
  const runDir = path.join(path.resolve(v.out!), id);
  const resultFile = path.join(runDir, "result.json");
  if (existsSync(resultFile) && !v.force) {
    const prev = JSON.parse(await readFile(resultFile, "utf8")) as RunResult;
    if (isFinal(prev, process.env.LLM_MODEL)) {
      console.log(`[skip] ${id} já existe (status=${prev.status}). Use --force para refazer.`);
      return 0;
    }
  }
  // Refazendo (erro anterior, ou resultado de outro modelo): limpa o diretório para não sobrar raw/ antigo.
  if (existsSync(runDir)) await rm(runDir, { recursive: true, force: true });

  const workdir = path.resolve(v.workdir);
  const mutatePaths = mod.mutatePaths && mod.mutatePaths.length > 0 ? mod.mutatePaths : [mod.path];
  // Unidade de um arquivo: o texto do arquivo (como sempre foi). Unidade de API: todos os arquivos mutados, com cabeçalho.
  const source =
    mutatePaths.length === 1
      ? await readFile(path.join(workdir, mod.path), "utf8")
      : (await Promise.all(mutatePaths.map(async (p) => `// ===== file: ${p} =====\n${await readFile(path.join(workdir, p), "utf8")}`))).join("\n");
  const contextFiles = await Promise.all((mod.contextFiles ?? []).map(async (p) => ({ path: p, content: await readFile(path.join(workdir, p), "utf8") })));
  const humanSources = await Promise.all(mod.humanTests.map((t) => readFile(path.join(workdir, t), "utf8")));
  const needsLLM = condition !== "C0";
  const provider = needsLLM ? providerFromEnv(cfg) : null;
  const conventions = condition === "C0" || condition === "C1" ? null : await loadConventions(ROOT, lib.name);
  const memo = v["memo-file"] && existsSync(v["memo-file"]) ? (JSON.parse(await readFile(v["memo-file"], "utf8")) as Record<string, { similarity: number; stratum: "low" | "high" }>)[`${lib.name}/${mod.id}`] : undefined;

  const evaluator = new SubjectEvaluator({
    workdir,
    modulePath: mod.path,
    mutatePaths,
    humanTests: mod.humanTests,
    artifactDir: path.join(runDir, "work"),
    moduleId: mod.id,
    strykerConcurrency: cfg.stryker_concurrency,
    reruns: cfg.vitest_reruns,
    humanRunner: lib.humanRunner,
    mocha: lib.mocha,
    resetPaths: lib.resetPaths,
    srcPathspec: lib.srcPathspec,
    testEnv: lib.testEnv,
    preload: lib.preload,
    vitestRelated: lib.vitestRelated,
  });

  console.log(`[run] ${id}`);
  const result = await executeRun({
    subject: { library: lib.name, repo: lib.repo, commit: lib.commit, license: lib.license, module: { id: mod.id, path: mod.path, loc: mod.loc, humanTests: mod.humanTests, mutatePaths } },
    condition,
    rep,
    n: v.n ? Number(v.n) : cfg.n_iterations,
    provider,
    evaluator,
    source,
    importPath: mod.importPath,
    sourceLang: lib.language === "js" ? "js" : undefined,
    promptNotes: lib.promptNotes,
    kind: lib.kind === "api" ? "api" : undefined,
    allowedImports: lib.allowedImports,
    contextFiles: contextFiles.length > 0 ? contextFiles : undefined,
    conventions,
    splitSeed,
    temperature: cfg.temperature,
    topP: cfg.top_p,
    maxOutputTokens: cfg.max_output_tokens,
    maxRepairs: cfg.max_repairs,
    maxSurvivors: cfg.max_survivors_in_prompt,
    maxTokensPerModule: cfg.max_tokens_per_module ?? undefined,
    pricing,
    tooling: {
      node: process.version,
      vitest: await pkgVersion(workdir, "vitest"),
      ...(lib.humanRunner === "mocha" ? { mocha: await pkgVersion(workdir, "mocha") } : {}),
      stryker: await pkgVersion(workdir, "@stryker-mutator/core"),
      split_seed: splitSeed,
      claude_md_sha256: conventions ? sha256(conventions) : null,
      git_sha_agent: gitSha(),
    },
    artifacts: dirSink(path.join(runDir, "raw")),
    c0Scope,
    humanTestSources: humanSources,
    memorization: memo ? { probe_similarity: memo.similarity, stratum: memo.stratum } : null,
  });
  result.artifacts = { raw_dir: path.relative(ROOT, path.join(runDir, "raw")) };
  await mkdir(runDir, { recursive: true });
  await writeFile(resultFile, JSON.stringify(result, null, 2));
  const f = result.final;
  console.log(
    `[done] ${id} status=${result.status} k*=${result.selected_iteration} ms_eval=${f.scores.ms_eval} ms_all=${f.scores.ms_all} line=${f.coverage.line_cov} tokens=${f.cost.tokens_in + f.cost.tokens_out}`,
  );
  // O motivo da falha só existia dentro do result.json; mostra no log (o persist descarta runs com erro de infraestrutura).
  if (result.error) console.error(`[erro] ${id}: ${result.error}`);
  // 2 = erro de infraestrutura (cota, 503, timeout): o run é refeito. Qualquer outro desfecho (inclusive
  // invalid_all_iterations, que é resultado do experimento e entra na análise) sai com 0 e NÃO deve ser repetido.
  return RETRY_STATUSES.has(result.status) ? 2 : 0;
}

async function cmdMatrix(argv: string[]): Promise<number> {
  const { values: v } = parseArgs({
    args: argv,
    options: {
      conditions: { type: "string", default: "C1,C2,C2r,C3" },
      reps: { type: "string" },
      library: { type: "string" },
      // omite runs que já têm result.json em runs/ (status final); provider_error/stryker_error/timeout são refeitos
      "skip-done": { type: "boolean", default: false },
      subjects: { type: "string" },
      // pasta de resultados consultada por --skip-done (padrão: runs/)
      out: { type: "string" },
    },
  });
  const cfg = await loadExperiment(ROOT);
  const subjects = await loadSubjects(ROOT, v.subjects);
  const reps = v.reps ? Number(v.reps) : cfg.repetitions;
  const include: { library: string; module: string; condition: string; rep: number }[] = [];
  for (const lib of subjects.libraries) {
    if (v.library && v.library !== lib.name) continue;
    for (const m of lib.modules) {
      for (const c of v.conditions!.split(",")) {
        if (c === "C0") include.push({ library: lib.name, module: m.id, condition: c, rep: 0 });
        else for (let r = 1; r <= reps; r++) include.push({ library: lib.name, module: m.id, condition: c, rep: r });
      }
    }
  }
  const pending = v["skip-done"] ? await filterPending(include, v.out ?? path.join(ROOT, "runs")) : include;
  if (v["skip-done"]) console.error(`[matrix] ${include.length - pending.length} de ${include.length} runs já concluídos; ${pending.length} pendentes`);
  console.log(JSON.stringify({ include: pending }));
  return 0;
}

async function filterPending<T extends { library: string; module: string; condition: string; rep: number }>(all: T[], runsDir: string): Promise<T[]> {
  const pending: T[] = [];
  for (const e of all) {
    const id = runId(e.library, e.module, e.condition as Condition, e.rep, e.condition === "C0" ? "module" : undefined);
    const file = path.join(runsDir, id, "result.json");
    let done = false;
    if (existsSync(file)) {
      try {
        done = isFinal(JSON.parse(await readFile(file, "utf8")) as RunResult, process.env.LLM_MODEL);
      } catch {
        done = false; // result.json ilegível: refaz
      }
    }
    if (!done) pending.push(e);
  }
  return pending;
}

async function findResults(dir: string): Promise<string[]> {
  if (!existsSync(dir)) return [];
  const out: string[] = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) out.push(...(await findResults(path.join(dir, e.name))));
    else if (e.name === "result.json") out.push(path.join(dir, e.name));
  }
  return out;
}

async function cmdValidate(argv: string[]): Promise<number> {
  const { values: v } = parseArgs({ args: argv, options: { dir: { type: "string", default: path.join(ROOT, "runs") } } });
  const schema = JSON.parse(await readFile(path.join(ROOT, "schemas/run-result.schema.json"), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats.default(ajv);
  const validate = ajv.compile(schema);
  const files = await findResults(v.dir!);
  let bad = 0;
  let skipped = 0;
  for (const f of files) {
    const j = JSON.parse(await readFile(f, "utf8"));
    // Erros de infraestrutura (ex.: 429) não são dado do experimento: serão refeitos e a análise já os ignora.
    if (RETRY_STATUSES.has(j.status)) {
      skipped++;
      console.warn(`IGNORADO ${f} (status=${j.status}; será refeito)`);
      continue;
    }
    if (!validate(j)) {
      bad++;
      console.error(`INVÁLIDO ${f}`);
      console.error(ajv.errorsText(validate.errors, { separator: "\n  " }));
    }
  }
  const checked = files.length - skipped;
  console.log(`${checked - bad}/${checked} result.json válidos` + (skipped ? ` (${skipped} com erro de infraestrutura ignorados)` : ""));
  return bad === 0 ? 0 : 1;
}

async function cmdProbe(argv: string[]): Promise<number> {
  const { values: v } = parseArgs({
    args: argv,
    options: { workdirs: { type: "string" }, out: { type: "string", default: path.join(ROOT, "data/memorization.json") }, subjects: { type: "string" } },
  });
  if (!v.workdirs) throw new Error("uso: probe --workdirs ufo=/p/ufo,defu=/p/defu,... [--subjects data/subjects-serverest.json --out data/memorization-serverest.json]");
  const dirs = Object.fromEntries(v.workdirs.split(",").map((kv) => kv.split("=") as [string, string]));
  const [cfg, subjects] = await Promise.all([loadExperiment(ROOT), loadSubjects(ROOT, v.subjects)]);
  const provider = providerFromEnv(cfg);
  const res: Record<string, { similarity: number; stratum?: string }> = {};
  for (const lib of subjects.libraries) {
    const wd = dirs[lib.name];
    if (!wd) continue;
    for (const m of lib.modules) {
      const main = m.humanTests[0]!;
      const text = await readFile(path.join(wd, main), "utf8");
      const r = await memorizationProbe(provider, text, main);
      res[`${lib.name}/${m.id}`] = { similarity: Number(r.similarity.toFixed(4)) };
      console.log(`[probe] ${lib.name}/${m.id} sim=${r.similarity.toFixed(3)}`);
    }
  }
  const sims = Object.values(res).map((r) => r.similarity).sort((a, b) => a - b);
  const median = sims.length % 2 ? sims[(sims.length - 1) / 2]! : (sims[sims.length / 2 - 1]! + sims[sims.length / 2]!) / 2;
  for (const r of Object.values(res)) r.stratum = r.similarity > median ? "high" : "low";
  await writeFile(v.out!, JSON.stringify({ model: provider.modelId, median, modules: res }, null, 2));
  // formato plano consumido por `run --memo-file`
  await writeFile(v.out!.replace(/\.json$/, ".flat.json"), JSON.stringify(res, null, 2));
  return 0;
}

const [cmd, ...rest] = process.argv.slice(2);
const table: Record<string, (a: string[]) => Promise<number>> = { run: cmdRun, matrix: cmdMatrix, validate: cmdValidate, probe: cmdProbe };
const fn = cmd ? table[cmd] : undefined;
if (!fn) {
  console.error("comandos: run | matrix | validate | probe");
  process.exit(64);
}
fn(rest).then(
  (code) => process.exit(code),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
