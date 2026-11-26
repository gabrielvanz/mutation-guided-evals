/**
 * V3 — operadores (PROTOCOL.md §11): reavalia os testes finais selecionados de cada run com um SEGUNDO conjunto de
 * mutantes, distinto dos operadores do Stryker. O Stryker já usa todos os seus operadores; por isso o segundo conjunto
 * é próprio (AST do TypeScript), com operadores que o Stryker não implementa:
 *   NUM_UP / NUM_DOWN  literal numérico n -> n+1 / n-1
 *   RET_UNDEF          `return expr` -> `return undefined`
 *   ARG_SWAP           f(a, b, ...) -> f(b, a, ...)
 * Os mutantes são injetados por um plugin do Vite (nada é escrito no código-fonte do sujeito).
 *
 * uso: npx tsx analysis/sensitivity_v3.ts --out analysis/out [--only run_id,...] [--jobs 6]
 * saída: analysis/out/v3_runs.csv
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { spawn } from "node:child_process";
import ts from "typescript";

const ROOT = process.cwd();
const args = process.argv.slice(2);
const opt = (n: string, d: string) => (args.includes(n) ? args[args.indexOf(n) + 1]! : d);
const OUT = opt("--out", "analysis/out");
const JOBS = Number(opt("--jobs", "6"));
const ONLY = opt("--only", "") ? new Set(opt("--only", "").split(",")) : null;
const TIMEOUT_MS = 30_000;

interface Mutant { id: string; op: string; s: number; e: number; r: string; line: number }

function genMutants(file: string): Mutant[] {
  const text = fs.readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, text, ts.ScriptTarget.ES2022, true);
  const out: Mutant[] = [];
  const add = (op: string, n: ts.Node, r: string, s = n.getStart(sf), e = n.getEnd()) => {
    const line = sf.getLineAndCharacterOfPosition(s).line + 1;
    out.push({ id: `${op}@${s}`, op, s, e, r, line });
  };
  const inType = (n: ts.Node): boolean => {
    for (let p: ts.Node | undefined = n; p; p = p.parent) if (ts.isTypeNode(p)) return true;
    return false;
  };
  const visit = (n: ts.Node): void => {
    if (ts.isNumericLiteral(n) && !inType(n)) {
      const v = Number(n.text);
      if (Number.isFinite(v)) {
        add("NUM_UP", n, String(v + 1));
        add("NUM_DOWN", n, String(v - 1));
      }
    } else if (ts.isReturnStatement(n) && n.expression && n.expression.getText(sf) !== "undefined") {
      add("RET_UNDEF", n.expression, "undefined");
    } else if (ts.isCallExpression(n) && n.arguments.length >= 2) {
      const [a, b] = [n.arguments[0]!, n.arguments[1]!];
      const ta = a.getText(sf);
      const tb = b.getText(sf);
      if (ta !== tb && !ts.isSpreadElement(a) && !ts.isSpreadElement(b)) {
        // troca os dois primeiros argumentos preservando o restante
        add("ARG_SWAP", n, `${tb}, ${ta}`, a.getStart(sf), b.getEnd());
      }
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);
  return out;
}

const CONFIG = `import { defineConfig } from "vitest/config";
import fs from "node:fs";
const target = (process.env.V3_TARGET || "").replace(/\\\\/g, "/");
const mutant = process.env.V3_MUTANT ? JSON.parse(fs.readFileSync(process.env.V3_MUTANT, "utf8")) : null;
export default defineConfig({
  plugins: [{
    name: "v3-mutant", enforce: "pre",
    transform(code, id) {
      if (!mutant || !id.replace(/\\\\/g, "/").endsWith(target)) return null;
      return { code: code.slice(0, mutant.s) + mutant.r + code.slice(mutant.e), map: null };
    },
  }],
  test: { include: [process.env.V3_TEST], exclude: [], globals: false, testTimeout: 10000, typecheck: { enabled: false } },
});
`;

type Verdict = "killed" | "survived" | "invalid";

function runVitest(lib: string, testRel: string, target: string, mutantFile: string | null, tag: string): Promise<Verdict | "base_fail"> {
  return new Promise((resolve) => {
    const cwd = path.join(ROOT, "subjects", lib);
    const outFile = path.join(cwd, `.v3_${tag}.json`);
    const bin = path.join(cwd, "node_modules", "vitest", "vitest.mjs");
    const env = { ...process.env, V3_TARGET: target, V3_TEST: testRel, ...(mutantFile ? { V3_MUTANT: mutantFile } : {}) };
    const p = spawn(process.execPath, [bin, "run", "--config", "vitest.v3.config.mjs", "--reporter=json", `--outputFile=${outFile}`], { cwd, env, stdio: "ignore" });
    let timedOut = false;
    const t = setTimeout(() => { timedOut = true; p.kill("SIGKILL"); }, TIMEOUT_MS);
    p.on("close", (code) => {
      clearTimeout(t);
      let verdict: Verdict | "base_fail";
      try {
        const j = JSON.parse(fs.readFileSync(outFile, "utf8"));
        const failedTests = j.numFailedTests ?? 0;
        if (code === 0) verdict = mutantFile ? "survived" : "survived";
        else if (failedTests > 0) verdict = mutantFile ? "killed" : "base_fail";
        else verdict = mutantFile ? "invalid" : "base_fail"; // suíte não carregou (erro de transformação/execução)
      } catch {
        verdict = timedOut ? (mutantFile ? "killed" : "base_fail") : mutantFile ? "invalid" : "base_fail";
      }
      if (timedOut && mutantFile) verdict = "killed"; // laço infinito = detectado (igual ao Timeout do Stryker)
      fs.rmSync(outFile, { force: true });
      resolve(verdict);
    });
  });
}

async function pool<T>(items: T[], n: number, fn: (x: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) await fn(items[i++]!); }));
}

interface Job { runId: string; cond: string; rep: number; lib: string; mod: string; modPath: string; testFiles: string[]; tmp: string[] }

async function main() {
  const runsDir = path.join(ROOT, "runs");
  const jobs: Job[] = [];
  for (const d of fs.readdirSync(runsDir).sort()) {
    const rf = path.join(runsDir, d, "result.json");
    if (!fs.existsSync(rf)) continue;
    const r = JSON.parse(fs.readFileSync(rf, "utf8"));
    if (r.condition === "C0-suite" || r.status !== "ok" || r.repetition > 3) continue;
    if (ONLY && !ONLY.has(d)) continue;
    const lib: string = r.subject.library;
    const mod = path.basename(r.subject.module_path, ".ts");
    let testFiles: string[];
    if (r.condition === "C0") testFiles = r.subject.human_test_files;
    else {
      const f = path.join(runsDir, d, "raw", `k${r.selected_iteration}_tests.test.ts`);
      if (!fs.existsSync(f)) continue;
      testFiles = [path.relative(ROOT, f)];
    }
    jobs.push({ runId: d, cond: r.condition, rep: r.repetition, lib, mod, modPath: r.subject.module_path, testFiles, tmp: [] });
  }
  console.log(`runs a reavaliar: ${jobs.length}`);

  const libs = [...new Set(jobs.map((j) => j.lib))];
  for (const l of libs) fs.writeFileSync(path.join(ROOT, "subjects", l, "vitest.v3.config.mjs"), CONFIG);

  // mutantes por módulo (cache)
  const mutCache = new Map<string, Mutant[]>();
  const mutants = (j: Job) => {
    const k = `${j.lib}/${j.modPath}`;
    if (!mutCache.has(k)) mutCache.set(k, genMutants(path.join(ROOT, "subjects", j.lib, j.modPath)));
    return mutCache.get(k)!;
  };

  // cache por (módulo, sha256 do conteúdo dos testes)
  const cache = new Map<string, { killed: number; survived: number; invalid: number; base_fail: boolean }>();
  const rows: string[] = ["run_id,cond,rep,lib,module,n_mutants,killed,survived,invalid,v3_score,ok"];
  const results: Record<string, unknown> = {};

  let doneRuns = 0;
  for (const j of jobs) {
    const muts = mutants(j);
    const key = `${j.lib}/${j.modPath}/` + crypto.createHash("sha256").update(j.testFiles.map((f) => {
      const abs = j.cond === "C0" ? path.join(ROOT, "subjects", j.lib, f) : path.join(ROOT, f);
      return fs.readFileSync(abs, "utf8");
    }).join("\n--\n")).digest("hex");
    let res = cache.get(key);
    if (!res) {
      const subj = path.join(ROOT, "subjects", j.lib);
      const hash = key.slice(-8);
      let testRel: string;
      const created: string[] = [];
      if (j.cond === "C0") {
        testRel = j.testFiles.map((f) => f).join("|");
      } else {
        testRel = `test/__generated__/v3_${hash}.test.ts`;
        fs.mkdirSync(path.join(subj, "test", "__generated__"), { recursive: true });
        fs.copyFileSync(path.join(ROOT, j.testFiles[0]!), path.join(subj, testRel));
        created.push(path.join(subj, testRel));
      }
      // vitest aceita vários arquivos via include glob; para C0 usa o primeiro (único nos módulos selecionados) ou o conjunto
      const includeRel = j.cond === "C0" ? (j.testFiles.length === 1 ? j.testFiles[0]! : `{${j.testFiles.join(",")}}`) : testRel;
      const base = await runVitest(j.lib, includeRel, j.modPath, null, `${hash}_base`);
      if (base === "base_fail") {
        res = { killed: 0, survived: 0, invalid: 0, base_fail: true };
      } else {
        let killed = 0, survived = 0, invalid = 0;
        await pool(muts, JOBS, async (m) => {
          const mf = path.join(subj, `.v3_${hash}_${m.id.replace(/\W/g, "_")}.mut.json`);
          fs.writeFileSync(mf, JSON.stringify(m));
          const v = (await runVitest(j.lib, includeRel, j.modPath, mf, `${hash}_${m.id.replace(/\W/g, "_")}`)) as Verdict;
          fs.rmSync(mf, { force: true });
          if (v === "killed") killed++; else if (v === "survived") survived++; else invalid++;
        });
        res = { killed, survived, invalid, base_fail: false };
      }
      for (const f of created) fs.rmSync(f, { force: true });
      cache.set(key, res);
    }
    const valid = res.killed + res.survived;
    const score = valid > 0 && !res.base_fail ? (100 * res.killed) / valid : NaN;
    rows.push([j.runId, j.cond, j.rep, j.lib, j.mod, muts.length, res.killed, res.survived, res.invalid, Number.isNaN(score) ? "" : score.toFixed(4), !res.base_fail].join(","));
    results[j.runId] = res;
    doneRuns++;
    console.log(`[${doneRuns}/${jobs.length}] ${j.runId}: ${res.base_fail ? "BASE FAIL" : `${score.toFixed(1)}% (${res.killed}/${valid}, inválidos ${res.invalid})`}`);
    fs.writeFileSync(path.join(OUT, "v3_runs.csv"), rows.join("\n") + "\n");
  }
  for (const l of libs) fs.rmSync(path.join(ROOT, "subjects", l, "vitest.v3.config.mjs"), { force: true });
}

main().catch((e) => { console.error(e); process.exit(1); });
