import { readFile } from "node:fs/promises";
import path from "node:path";
import { GeminiProvider } from "./providers/gemini.js";
import { OpenAICompatProvider } from "./providers/openai-compat.js";
import { MockProvider } from "./providers/mock.js";
import type { LLMProvider } from "./providers/provider.js";
import type { Pricing } from "./pipeline.js";
import type { MochaConfig } from "./runner.js";

export interface ExperimentConfig {
  n_iterations: number;
  repetitions: number;
  temperature: number;
  top_p: number | null;
  max_output_tokens: number;
  max_repairs: number;
  max_survivors_in_prompt: number;
  max_tokens_per_module: number | null;
  vitest_reruns: number;
  stryker_concurrency: number;
  thinking_budget: number | null;
  /** Gemini 3.x: "minimal" | "low" | ... (tem prioridade sobre thinking_budget). */
  thinking_level?: string | null;
  min_interval_ms: number;
}

export interface ModuleSpec {
  id: string;
  path: string;
  loc: number;
  humanTests: string[];
  importPath: string;
  /** Todos os arquivos mutados pela unidade. Padrão: só `path`. Usado nas unidades de API (vários arquivos). */
  mutatePaths?: string[];
  /** Arquivos de contexto somente leitura mostrados no prompt (ex.: arquivos de rota, OpenAPI). */
  contextFiles?: string[];
}

export interface LibrarySpec {
  name: string;
  repo: string;
  commit: string;
  license: string;
  /** Versão do pnpm (sujeitos pnpm). Vazio/ausente em sujeitos npm. */
  pnpm?: string;
  /** Gerenciador de pacotes do sujeito. Padrão: "pnpm". */
  pm?: "pnpm" | "npm";
  /** Linguagem dos módulos sob teste. Os testes gerados são sempre TypeScript/Vitest. Padrão: "ts". */
  language?: "ts" | "js";
  /** Como o baseline humano (C0) é executado. Padrão: "vitest". */
  humanRunner?: "vitest" | "mocha";
  mocha?: MochaConfig;
  /** Pastas restauradas via `git checkout` antes de cada execução (bancos em arquivo versionados). */
  resetPaths?: string[];
  /** Pathspec do `git diff` que prova que o código-fonte não mudou. Padrão: ["src"]. */
  srcPathspec?: string[];
  /** Variáveis de ambiente das execuções de teste. */
  testEnv?: Record<string, string>;
  /** Preload CommonJS (agent/assets) usado em todas as execuções de teste do sujeito. */
  preload?: "nedb-em-memoria";
  /** `false` desliga o `vitest.related` do Stryker (módulos CommonJS carregados por `require`). */
  vitestRelated?: boolean;
  /** "unit": testes de unidade do módulo (padrão). "api": testes de API via HTTP (supertest) sobre o app Express. */
  kind?: "unit" | "api";
  /** Pacotes permitidos nos testes gerados além do Vitest (ex.: ["supertest"] nas unidades de API). */
  allowedImports?: string[];
  /** Nota fixa incluída nos prompts (ex.: formato dos módulos). */
  promptNotes?: string;
  modules: ModuleSpec[];
}

export interface SubjectsFile {
  schema_version: string;
  libraries: LibrarySpec[];
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;

export const loadExperiment = (root: string) => readJson<ExperimentConfig>(path.join(root, "config/experiment.json"));
/** `file` permite carregar outro conjunto de sujeitos (extensões, ex.: data/subjects-serverest.json) sem tocar no principal. */
export const loadSubjects = (root: string, file = "data/subjects.json") => readJson<SubjectsFile>(path.resolve(root, file));
export const loadPricing = (root: string) => readJson<Pricing>(path.join(root, "config/pricing.json"));
export const loadSplitSeed = async (root: string) => (await readJson<{ split_seed: string }>(path.join(root, "config/split.json"))).split_seed;

export async function loadConventions(root: string, library: string): Promise<string> {
  const base = await readFile(path.join(root, "conventions/_base.md"), "utf8");
  const lib = await readFile(path.join(root, "conventions", library, "CLAUDE.md"), "utf8");
  return `${base.trim()}\n\n${lib.trim()}\n`;
}

/** Cria o provedor a partir de variáveis de ambiente. O ID do modelo é obrigatório (reprodutibilidade). */
export function providerFromEnv(cfg: ExperimentConfig, env: NodeJS.ProcessEnv = process.env, override?: string): LLMProvider {
  const kind = override ?? env.LLM_PROVIDER ?? "gemini";
  if (kind === "mock") {
    throw new Error("provider 'mock' deve ser construído pelo chamador com um responder");
  }
  const modelId = env.LLM_MODEL;
  if (!modelId) throw new Error("Defina LLM_MODEL com o ID exato do modelo (não use aliases como '-latest').");
  if (/latest/i.test(modelId)) throw new Error(`LLM_MODEL="${modelId}" parece um alias móvel; fixe uma versão exata.`);
  if (kind === "gemini") {
    const apiKey = env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY ausente");
    return new GeminiProvider({
      apiKey,
      modelId,
      minIntervalMs: Number(env.LLM_MIN_INTERVAL_MS) || cfg.min_interval_ms,
      thinkingBudget: cfg.thinking_budget ?? undefined,
      thinkingLevel: cfg.thinking_level ?? undefined,
    });
  }
  if (kind === "openai") {
    const apiKey = env.LLM_API_KEY;
    const baseUrl = env.LLM_BASE_URL;
    if (!apiKey || !baseUrl) throw new Error("LLM_API_KEY e LLM_BASE_URL são obrigatórios para provider=openai");
    return new OpenAICompatProvider({ apiKey, baseUrl, modelId, name: env.LLM_PROVIDER_NAME ?? "openai-compatible", minIntervalMs: Number(env.LLM_MIN_INTERVAL_MS) || cfg.min_interval_ms });
  }
  throw new Error(`provider desconhecido: ${kind}`);
}

export { MockProvider };
