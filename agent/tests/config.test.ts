import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { loadExperiment, loadSubjects, providerFromEnv } from "../src/config.js";

const ROOT = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

describe("providerFromEnv", () => {
  const cfg = JSON.parse(readFileSync(path.join(ROOT, "config/experiment.json"), "utf8"));
  it("exige LLM_MODEL", () => {
    expect(() => providerFromEnv(cfg, { GEMINI_API_KEY: "k" })).toThrow(/LLM_MODEL/);
  });
  it("recusa aliases móveis como -latest (reprodutibilidade)", () => {
    expect(() => providerFromEnv(cfg, { GEMINI_API_KEY: "k", LLM_MODEL: "gemini-flash-lite-latest" })).toThrow(/alias/);
  });
  it("exige a chave de API", () => {
    expect(() => providerFromEnv(cfg, { LLM_MODEL: "m-001" })).toThrow(/GEMINI_API_KEY/);
  });
  it("cria o provedor Gemini com ID exato", () => {
    const p = providerFromEnv(cfg, { GEMINI_API_KEY: "k", LLM_MODEL: "m-001" });
    expect(p.name).toBe("google-ai-studio");
    expect(p.modelId).toBe("m-001");
  });
  it("cria provedor compatível com OpenAI quando solicitado", () => {
    const p = providerFromEnv(cfg, { LLM_PROVIDER: "openai", LLM_MODEL: "m", LLM_API_KEY: "k", LLM_BASE_URL: "https://x/v1" });
    expect(p.modelId).toBe("m");
  });
});

describe("data/subjects.json", () => {
  it("tem commits de 40 hex, licença e módulos com testes humanos e import path coerente", async () => {
    const s = await loadSubjects(ROOT);
    expect(s.libraries.length).toBeGreaterThan(0);
    for (const l of s.libraries) {
      expect(l.commit).toMatch(/^[0-9a-f]{40}$/);
      expect(l.license).toBeTruthy();
      expect(l.modules.length).toBeGreaterThan(0);
      for (const m of l.modules) {
        expect(m.humanTests.length, `${l.name}/${m.id}`).toBeGreaterThan(0);
        expect(m.importPath).toBe("../../" + m.path.replace(/\.ts$/, ""));
        expect(m.loc).toBeGreaterThan(0);
      }
    }
  });
  it("ids de módulo são únicos dentro de cada biblioteca", async () => {
    const s = await loadSubjects(ROOT);
    for (const l of s.libraries) expect(new Set(l.modules.map((m) => m.id)).size).toBe(l.modules.length);
  });
});

describe("experimento", () => {
  it("usa N e parâmetros do protocolo", async () => {
    const c = await loadExperiment(ROOT);
    expect(c.n_iterations).toBe(5);
    expect(c.temperature).toBe(0.7);
    expect(c.max_repairs).toBe(2);
  });
  it("matrix gera módulo × condição × repetição (C0 só uma vez, rep 0)", () => {
    const out = execFileSync(process.execPath, ["node_modules/tsx/dist/cli.mjs", "agent/src/cli.ts", "matrix", "--conditions", "C0,C3", "--reps", "2", "--library", "defu"], { cwd: ROOT, encoding: "utf8" });
    const { include } = JSON.parse(out) as { include: { library: string; module: string; condition: string; rep: number }[] };
    expect(include).toEqual([
      { library: "defu", module: "defu", condition: "C0", rep: 0 },
      { library: "defu", module: "defu", condition: "C3", rep: 1 },
      { library: "defu", module: "defu", condition: "C3", rep: 2 },
    ]);
  });
});
