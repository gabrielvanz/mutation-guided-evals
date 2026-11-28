import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { analyzeTestFile } from "../src/guardrails.js";
import { buildInitialPrompt, buildFeedbackPrompt, buildRepairPrompt, formatSurvivor, systemPromptFor, SYSTEM_PROMPT, SYSTEM_PROMPT_API } from "../src/prompts.js";
import { buildMochaRc, buildStrykerConfig, nycArgs, summarizeCoverage } from "../src/runner.js";
import type { SubjectsFile } from "../src/config.js";

const ROOT = path.resolve(import.meta.dirname, "../..");
const readSubjects = (f: string) => JSON.parse(readFileSync(path.join(ROOT, f), "utf8")) as SubjectsFile;
const serverest = readSubjects("data/subjects-serverest.json").libraries.find((l) => l.name === "serverest");
const RUN_ID_MODULE = /^[A-Za-z0-9._/-]+$/;

describe("suporte a sujeitos JavaScript com baseline Mocha", () => {
  it("buildMochaRc só inclui `require` quando há itens (require vazio quebra o mocha-runner no Node 24)", () => {
    const rc = buildMochaRc(["test/unit/a.test.js"], { suiteSpecs: [] });
    expect("require" in rc).toBe(false);
    expect(rc.spec).toEqual(["test/unit/a.test.js"]);
    expect(rc.exit).toBe(true);
  });

  it("buildMochaRc carrega o setup de integração só quando algum spec é de integração", () => {
    const cfg = { suiteSpecs: [], require: ["a.js"], integrationRequire: ["test/integration/utils/global.js"] };
    expect(buildMochaRc(["test/unit/x.test.js"], cfg).require).toEqual(["a.js"]);
    expect(buildMochaRc(["test/integration/usuarios/get.test.js"], cfg).require).toEqual(["a.js", "test/integration/utils/global.js"]);
    expect(buildMochaRc(["test\\integration\\usuarios\\get.test.js"], cfg).require).toEqual(["a.js", "test/integration/utils/global.js"]);
  });

  it("nycArgs mede só o módulo, sem --all e sem exigir limiar", () => {
    const a = nycArgs("/tmp/cov", "src/utils/x.js");
    expect(a).toContain("--nycrc-path=.nycrc.eval.json");
    expect(a).toContain("--include=src/utils/x.js");
    expect(a).toContain("--all=false");
    expect(a).toContain("--check-coverage=false");
    expect(a).toContain("--reporter=json-summary");
  });

  it("buildStrykerConfig do Vitest mantém a configuração usada nas 9 unidades originais", () => {
    const c = buildStrykerConfig({ runner: "vitest", modulePath: "src/query.ts", reportFile: "r.json", concurrency: 2 });
    expect(c).toMatchObject({
      testRunner: "vitest",
      plugins: ["@stryker-mutator/vitest-runner"],
      coverageAnalysis: "perTest",
      mutate: ["src/query.ts"],
      reporters: ["json"],
      jsonReporter: { fileName: "r.json" },
      vitest: { configFile: "vitest.eval.config.mjs" },
      concurrency: 2,
      timeoutMS: 10000,
      timeoutFactor: 1.5,
      disableTypeChecks: true,
      incremental: false,
      cleanTempDir: true,
    });
  });

  it("buildStrykerConfig do Mocha usa o mocha-runner e o rc gerado", () => {
    const c = buildStrykerConfig({ runner: "mocha", modulePath: "src/x.js", reportFile: "r.json", concurrency: 1 });
    expect(c).toMatchObject({ testRunner: "mocha", plugins: ["@stryker-mutator/mocha-runner"], mochaOptions: { config: ".mocharc.json" } });
    expect(c).not.toHaveProperty("vitest");
  });
});

describe("prompts: nota e linguagem do sujeito são opcionais", () => {
  const base = { modulePath: "src/q.ts", importPath: "../../src/q", source: "export const a = 1;", conventions: null };

  it("sem nota nem linguagem, o prompt é o mesmo das bibliotecas TypeScript", () => {
    const p = buildInitialPrompt(base);
    expect(p).not.toContain("Note about this project");
    expect(p).toContain("```ts\nexport const a = 1;\n```");
  });

  it("com nota e linguagem js, o prompt traz a nota e o bloco js (inicial, feedback e conserto)", () => {
    const extra = { sourceLang: "js", notes: "CommonJS modules." };
    expect(buildInitialPrompt({ ...base, ...extra })).toContain("Note about this project: CommonJS modules.");
    expect(buildInitialPrompt({ ...base, ...extra })).toContain("```js\nexport const a = 1;\n```");
    const fb = buildFeedbackPrompt({ ...base, ...extra, currentTests: "t", survivors: [], totalSurvivorsInFeedbackGroup: 0 });
    expect(fb).toContain("Note about this project: CommonJS modules.");
    expect(fb).toContain("```js\n");
    const rp = buildRepairPrompt({ modulePath: "m", importPath: "i", source: "s", currentTests: "t", problems: "p", ...extra });
    expect(rp).toContain("Note about this project: CommonJS modules.");
  });
});

describe("data/subjects-serverest.json: sujeito ServeRest (extensão, fora do experimento principal)", () => {
  it("não aparece em data/subjects.json, para não entrar na matriz nem na análise principais", () => {
    expect(readSubjects("data/subjects.json").libraries.some((l) => l.name === "serverest")).toBe(false);
  });

  it("está registrado com commit fixo, Mocha como baseline humano e módulos JavaScript", () => {
    expect(serverest).toBeDefined();
    expect(serverest!.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(serverest!.pm).toBe("npm");
    expect(serverest!.language).toBe("js");
    expect(serverest!.humanRunner).toBe("mocha");
    expect(serverest!.mocha?.suiteSpecs.length).toBeGreaterThan(0);
    expect(serverest!.srcPathspec).toContain(":(exclude)src/data");
    expect(serverest!.preload).toBe("nedb-em-memoria");
  });

  it("os módulos têm ids únicos e válidos no run_id, caminho .js e importPath coerente", () => {
    const ids = serverest!.modules.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of serverest!.modules) {
      expect(m.id).toMatch(RUN_ID_MODULE);
      expect(m.id).not.toContain("__");
      expect(m.path).toMatch(/^src\/.+\.js$/);
      expect(m.importPath).toBe("../../" + m.path.replace(/\.js$/, ""));
      expect(m.humanTests.length).toBeGreaterThan(0);
    }
  });

  it("existem os arquivos de convenções e eles não mencionam teste de mutação", () => {
    for (const lib of ["serverest", "serverest-api"]) {
      const text = readFileSync(path.join(ROOT, "conventions", lib, "CLAUDE.md"), "utf8");
      expect(text.length).toBeGreaterThan(100);
      expect(text).not.toMatch(/mutation|mutante|mutação/i);
    }
  });
});

describe("unidades de API (vários arquivos mutados, testes via supertest)", () => {
  const BS = String.fromCharCode(92);
  const apiLib = JSON.parse(readFileSync(path.join(ROOT, "data/subjects-serverest.json"), "utf8")).libraries.find((l: { name: string }) => l.name === "serverest-api") as SubjectsFile["libraries"][number];

  it("nycArgs e buildStrykerConfig aceitam vários arquivos", () => {
    expect(nycArgs("/c", ["src/a.js", "src/b.js"]).filter((a) => a.startsWith("--include="))).toEqual(["--include=src/a.js", "--include=src/b.js"]);
    const c = buildStrykerConfig({ runner: "mocha", modulePath: ["src/a.js", "src/b.js"], reportFile: "r.json", concurrency: 1 });
    expect(c.mutate).toEqual(["src/a.js", "src/b.js"]);
  });

  it("summarizeCoverage: um arquivo mantém o percentual; vários somam linhas e ramos", () => {
    const j = {
      ["C:" + BS + "w" + BS + "src" + BS + "a.js"]: { lines: { pct: 50, total: 10, covered: 5 }, branches: { pct: 0, total: 4, covered: 0 } },
      "/w/src/b.js": { lines: { pct: 100, total: 30, covered: 30 }, branches: { pct: 100, total: 6, covered: 6 } },
      total: { lines: { pct: 87.5, total: 40, covered: 35 }, branches: { pct: 60, total: 10, covered: 6 } },
    };
    expect(summarizeCoverage(j, ["src/a.js"])).toEqual({ line_cov: 50, branch_cov: 0 });
    expect(summarizeCoverage(j, ["src/a.js", "src/b.js"])).toEqual({ line_cov: 87.5, branch_cov: 60 });
    expect(summarizeCoverage(j, ["src/nao-existe.js", "src/outro.js"])).toEqual({ line_cov: null, branch_cov: null });
  });

  it("guardrail: supertest só é aceito quando listado em allowedImports", () => {
    const code = [
      'import { it, expect } from "vitest";',
      'import request from "supertest";',
      'import app from "../../src/app";',
      'it("a", async () => { expect(typeof request(app).get).toBe("function"); });',
    ].join("\n");
    expect(analyzeTestFile(code, { allowedImportSubstr: "src" }).violations).toContain("forbidden_import");
    expect(analyzeTestFile(code, { allowedImportSubstr: "src", allowedImports: ["supertest"] }).ok).toBe(true);
    const other = code.replace("supertest", "axios");
    expect(analyzeTestFile(other, { allowedImportSubstr: "src", allowedImports: ["supertest"] }).violations).toContain("forbidden_import");
  });

  it("prompts de API: sistema próprio, arquivos de contexto e arquivo do sobrevivente", () => {
    expect(systemPromptFor()).toBe(SYSTEM_PROMPT);
    expect(systemPromptFor("unit")).toBe(SYSTEM_PROMPT);
    expect(systemPromptFor("api")).toBe(SYSTEM_PROMPT_API);
    expect(SYSTEM_PROMPT_API).toContain("supertest");
    const base = { modulePath: "the usuarios API", importPath: "../../src/app", source: "// file a", conventions: null, kind: "api" as const, contextFiles: [{ path: "src/routes/x-route.js", content: "router.get('/')" }] };
    const p = buildInitialPrompt(base);
    expect(p).toContain("API unit");
    expect(p).toContain("Read-only context file `src/routes/x-route.js`");
    const surv = { key: "k", file: "src/services/a.js", line: 7, mutator: "ConditionalExpression", status: "Survived" as const, original: "x", replacement: "true", lineText: "if (x) {" };
    expect(formatSurvivor(surv, 0, true)).toContain("file src/services/a.js, line 7");
    expect(formatSurvivor(surv, 0)).toContain("1. line 7");
    const fb = buildFeedbackPrompt({ ...base, currentTests: "t", survivors: [surv], totalSurvivorsInFeedbackGroup: 1 });
    expect(fb).toContain("file src/services/a.js, line 7");
  });

  it("serverest-api está registrado como unidades de API com mais de um arquivo mutado", () => {
    expect(apiLib.kind).toBe("api");
    expect(apiLib.allowedImports).toEqual(["supertest"]);
    expect(apiLib.humanRunner).toBe("mocha");
    expect(apiLib.modules.length).toBeGreaterThan(1);
    for (const m of apiLib.modules) {
      expect(m.id).not.toContain("__");
      expect(m.path).toBe("api/" + m.id);
      expect(m.importPath).toBe("../../src/app");
      expect(m.mutatePaths!.length).toBeGreaterThan(1);
      for (const f of m.mutatePaths!) expect(f).toMatch(/^src\/.+\.js$/);
    }
  });
});
