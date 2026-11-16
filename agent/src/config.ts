import { readFile } from "node:fs/promises";
import path from "node:path";
import { GeminiProvider } from "./providers/gemini.js";
import { OpenAICompatProvider } from "./providers/openai-compat.js";
import { MockProvider } from "./providers/mock.js";
import type { LLMProvider } from "./providers/provider.js";
import type { Pricing } from "./pipeline.js";

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
  min_interval_ms: number;
}

export interface ModuleSpec {
  id: string;
  path: string;
  loc: number;
  humanTests: string[];
  importPath: string;
}

export interface LibrarySpec {
  name: string;
  repo: string;
  commit: string;
  license: string;
  pnpm: string;
  modules: ModuleSpec[];
}

export interface SubjectsFile {
  schema_version: string;
  libraries: LibrarySpec[];
}

const readJson = async <T>(file: string): Promise<T> => JSON.parse(await readFile(file, "utf8")) as T;

export const loadExperiment = (root: string) => readJson<ExperimentConfig>(path.join(root, "config/experiment.json"));
export const loadSubjects = (root: string) => readJson<SubjectsFile>(path.join(root, "data/subjects.json"));
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
