/**
 * Teste de fumaça ponta a ponta: executor REAL (Vitest + cobertura + Stryker) com provedor MOCK.
 * Não acessa a rede nem LLM. Valida o encanamento e produz um result.json de verdade.
 *
 * uso: npx tsx agent/scripts/smoke.ts --workdir ../subjects/ufo --module query --out /tmp/smoke
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { loadExperiment, loadPricing, loadSplitSeed, loadSubjects } from "../src/config.js";
import { executeRun } from "../src/pipeline.js";
import { MockProvider } from "../src/providers/mock.js";
import { SubjectEvaluator } from "../src/runner.js";

const { values: v } = parseArgs({ options: { workdir: { type: "string" }, module: { type: "string", default: "query" }, library: { type: "string", default: "ufo" }, out: { type: "string", default: "/tmp/smoke" }, replies: { type: "string" } } });
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const cfg = await loadExperiment(ROOT);
const subjects = await loadSubjects(ROOT);
const lib = subjects.libraries.find((l) => l.name === v.library)!;
const mod = lib.modules.find((m) => m.id === v.module)!;
const workdir = path.resolve(v.workdir!);
const replies: string[] = JSON.parse(await readFile(v.replies!, "utf8"));
const wrap = (s: string) => "```ts\n" + s + "\n```";

const out = path.resolve(v.out!);
await mkdir(out, { recursive: true });
const provider = new MockProvider((_req, i) => wrap(replies[Math.min(i, replies.length - 1)]!), "mock-smoke");
const evaluator = new SubjectEvaluator({ workdir, modulePath: mod.path, humanTests: mod.humanTests, artifactDir: path.join(out, "work"), moduleId: mod.id, strykerConcurrency: 1, reruns: 3 });
const result = await executeRun({
  subject: { library: lib.name, repo: lib.repo, commit: lib.commit, license: lib.license, module: { id: mod.id, path: mod.path, loc: mod.loc, humanTests: mod.humanTests } },
  condition: "C3", rep: 1, n: replies.length - 1, provider, evaluator,
  source: await readFile(path.join(workdir, mod.path), "utf8"), importPath: mod.importPath, conventions: "# smoke conventions",
  splitSeed: await loadSplitSeed(ROOT), temperature: cfg.temperature, topP: null, maxOutputTokens: cfg.max_output_tokens,
  maxRepairs: cfg.max_repairs, maxSurvivors: cfg.max_survivors_in_prompt, pricing: await loadPricing(ROOT),
  tooling: { node: process.version, vitest: "smoke", stryker: "smoke", split_seed: "smoke", claude_md_sha256: null },
  artifacts: { write: async (n, c) => { await writeFile(path.join(out, n), c); return n; } },
});
await writeFile(path.join(out, "result.json"), JSON.stringify(result, null, 2));
console.log(JSON.stringify({ status: result.status, error: result.error, selected: result.selected_iteration, iters: result.iterations.map((i) => ({ k: i.k, valid: i.valid, why: i.discard_reason, fb: i.scores.ms_feedback, ev: i.scores.ms_eval, all: i.scores.ms_all, line: i.coverage.line_cov, sent: i.survivors_sent, repairs: i.repair_attempts })), guardrails: result.guardrails, cost: result.final.cost }, null, 1));
