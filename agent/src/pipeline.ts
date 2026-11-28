import { analyzeTestFile } from "./guardrails.js";
import { extractCode } from "./extract.js";
import { assignGroups, computeScores, countFeedbackSurvivors, selectSurvivors, totalMutants } from "./mutants.js";
import { buildFeedbackPrompt, buildInitialPrompt, buildRepairPrompt, systemPromptFor, type ContextFile } from "./prompts.js";
import { ProviderError, type LLMProvider, type LLMResponse } from "./providers/provider.js";
import type { Evaluator, Measurement } from "./runner.js";
import type {
  Condition,
  Cost,
  DiscardReason,
  ForbiddenPattern,
  IterationRecord,
  RunResult,
  Scores,
  TestStats,
} from "./types.js";
import { round, seedFrom, sha256 } from "./util.js";

export interface ArtifactSink {
  write(name: string, content: string): Promise<string>;
}

export interface Pricing {
  reference_model: string;
  usd_per_mtok_in: number;
  usd_per_mtok_out: number;
}

export interface RunOptions {
  subject: {
    library: string;
    repo: string;
    commit: string;
    license: string;
    module: { id: string; path: string; loc: number; humanTests: string[]; mutatePaths?: string[] };
  };
  condition: Condition;
  rep: number;
  /** Número de iterações de feedback (C3) / amostras extras (C2r). */
  n: number;
  provider: LLMProvider | null;
  evaluator: Evaluator;
  source: string;
  importPath: string;
  conventions: string | null;
  splitSeed: string;
  temperature: number;
  topP: number | null;
  maxOutputTokens: number;
  maxRepairs: number;
  maxSurvivors: number;
  maxTokensPerModule?: number;
  pricing: Pricing;
  tooling: RunResult["tooling"];
  artifacts: ArtifactSink;
  now?: () => Date;
  c0Scope?: "module" | "suite";
  humanTestSources?: string[];
  memorization?: RunResult["memorization"];
  /** Linguagem do módulo no bloco de código dos prompts (padrão "ts") e nota fixa do sujeito. Ausentes nas bibliotecas TypeScript. */
  sourceLang?: string;
  promptNotes?: string | null;
  /** "api": testes via HTTP (supertest). Ausente nas bibliotecas TypeScript originais. */
  kind?: "unit" | "api";
  /** Pacotes permitidos nos testes gerados além do Vitest (ex.: ["supertest"]). */
  allowedImports?: string[];
  contextFiles?: ContextFile[];
}

class CostMeter {
  calls = 0;
  repairCalls = 0;
  tokensIn = 0;
  tokensOut = 0;
  strykerS = 0;
  constructor(
    private readonly pricing: Pricing,
    private readonly t0: number,
    private readonly now: () => Date,
  ) {}
  addLLM(r: LLMResponse, repair: boolean): void {
    this.calls++;
    if (repair) this.repairCalls++;
    this.tokensIn += r.tokensIn;
    this.tokensOut += r.tokensOut;
  }
  get tokens(): number {
    return this.tokensIn + this.tokensOut;
  }
  snapshot(): Cost {
    return {
      calls: this.calls,
      repair_calls: this.repairCalls,
      tokens_in: this.tokensIn,
      tokens_out: this.tokensOut,
      usd_ref: round((this.tokensIn / 1e6) * this.pricing.usd_per_mtok_in + (this.tokensOut / 1e6) * this.pricing.usd_per_mtok_out, 6) ?? 0,
      wall_s: round((this.now().getTime() - this.t0) / 1000, 2) ?? 0,
      stryker_s: round(this.strykerS, 2) ?? 0,
    };
  }
}

const NULL_SCORES: Scores = { ms_eval: null, ms_feedback: null, ms_all: null, ms_covered: null };

function statsOf(source: string, allowedImportSubstr?: string, allowedImports?: string[]): TestStats {
  const g = analyzeTestFile(source, { allowedImportSubstr, allowedImports });
  return { n_tests: g.n_tests, n_asserts: g.n_asserts, sha256: sha256(source) };
}

interface ValidIteration {
  k: number;
  source: string;
  meas: Measurement;
  ms_feedback: number | null;
}

export function runId(library: string, moduleId: string, condition: Condition, rep: number, c0Scope?: "module" | "suite"): string {
  const cond = condition === "C0" && c0Scope === "suite" ? "C0-suite" : condition;
  return `${library}__${moduleId}__${cond}__r${rep}`;
}

export async function executeRun(o: RunOptions): Promise<RunResult> {
  const now = o.now ?? (() => new Date());
  const startedAt = now();
  const meter = new CostMeter(o.pricing, startedAt.getTime(), now);
  const iterations: IterationRecord[] = [];
  const valids: ValidIteration[] = [];
  const violationsSeen = new Set<ForbiddenPattern>();
  let status: RunResult["status"] = "ok";
  let error: string | null = null;
  let bestK: number | null = null;
  const claudeMdSha = o.conventions ? sha256(o.conventions) : null;
  const importSubstr = "src";
  // Nome da unidade nos prompts: o caminho do módulo; nas unidades de API, o nome e os arquivos que são mutados.
  const promptUnit =
    o.kind === "api" && o.subject.module.mutatePaths
      ? `the ${o.subject.module.id} API (files under test: ${o.subject.module.mutatePaths.join(", ")})`
      : o.subject.module.path;

  const pickBest = (): ValidIteration | null => {
    let best: ValidIteration | null = null;
    for (const v of valids) {
      const s = v.ms_feedback ?? -1;
      if (!best || s > (best.ms_feedback ?? -1)) best = v;
    }
    return best;
  };

  const record = (rec: Omit<IterationRecord, "best_k_so_far" | "cost_cumulative">): IterationRecord => {
    const full: IterationRecord = { ...rec, best_k_so_far: bestK, cost_cumulative: meter.snapshot() };
    iterations.push(full);
    return full;
  };

  /** Gera (e repara) um arquivo de testes que passe nos guardrails e no código original. */
  const produce = async (
    k: number,
    firstPrompt: string,
    seedParts: (string | number)[],
    fallbackCurrent: string | null,
  ): Promise<{ source: string | null; repairs: number; reason: DiscardReason | null; promptFile: string; responseFile: string }> => {
    if (!o.provider) throw new Error("provider ausente para condição com LLM");
    let prompt = firstPrompt;
    let current: string | null = fallbackCurrent;
    let reason: DiscardReason | null = null;
    let promptFile = "";
    let responseFile = "";
    for (let attempt = 0; attempt <= o.maxRepairs; attempt++) {
      const resp = await o.provider.generate({
        system: systemPromptFor(o.kind),
        user: prompt,
        temperature: o.temperature,
        topP: o.topP,
        maxOutputTokens: o.maxOutputTokens,
        seed: seedFrom(...seedParts, attempt),
      });
      meter.addLLM(resp, attempt > 0);
      const pf = await o.artifacts.write(`k${k}_a${attempt}_prompt.txt`, prompt);
      const rf = await o.artifacts.write(`k${k}_a${attempt}_response.txt`, resp.text);
      if (attempt === 0) {
        promptFile = pf;
        responseFile = rf;
      }
      const code = extractCode(resp.text);
      let problems: string;
      if (!code) {
        reason = "unparseable_response";
        problems = "The reply did not contain a complete ```ts code block with a test file.";
      } else {
        current = code;
        const g = analyzeTestFile(code, { allowedImportSubstr: importSubstr, allowedImports: o.allowedImports });
        g.violations.forEach((v) => violationsSeen.add(v));
        if (!g.ok) {
          reason = "guardrail_violation";
          problems = g.messages.join("\n") || "guardrail violation";
        } else {
          const chk = await o.evaluator.check(code);
          if (chk.pass) return { source: code, repairs: attempt, reason: null, promptFile, responseFile };
          reason = "tests_fail_on_original";
          problems = chk.output;
        }
      }
      prompt = buildRepairPrompt({
        modulePath: promptUnit,
        importPath: o.importPath,
        source: o.source,
        currentTests: current ?? "(no valid test file was produced)",
        problems,
        sourceLang: o.sourceLang,
        notes: o.promptNotes,
        kind: o.kind,
        contextFiles: o.contextFiles,
      });
    }
    return { source: null, repairs: o.maxRepairs, reason, promptFile, responseFile };
  };

  const finishIteration = async (
    k: number,
    p: { source: string | null; repairs: number; reason: DiscardReason | null; promptFile: string; responseFile: string },
    survivorsSent: { count: number; ids: string[] },
  ): Promise<ValidIteration | null> => {
    if (!p.source) {
      record({
        k,
        valid: false,
        discard_reason: p.reason ?? "tests_fail_on_original",
        repair_attempts: p.repairs,
        scores: NULL_SCORES,
        coverage: { line_cov: null, branch_cov: null },
        survivors_sent: survivorsSent.count,
        survivor_ids: survivorsSent.ids,
        tests: { n_tests: 0, n_asserts: 0, sha256: "" },
        prompt_file: p.promptFile,
        response_file: p.responseFile,
      });
      return null;
    }
    const meas = await o.evaluator.measure(p.source);
    meter.strykerS += meas.stryker_s;
    await o.artifacts.write(`k${k}_stryker-report.json`, JSON.stringify(meas.report));
    await o.artifacts.write(`k${k}_tests.test.ts`, p.source);
    const groups = assignGroups(meas.report, o.splitSeed);
    const b = computeScores(meas.report, groups);
    const v: ValidIteration = { k, source: p.source, meas, ms_feedback: b.scores.ms_feedback };
    valids.push(v);
    bestK = pickBest()!.k;
    record({
      k,
      valid: true,
      discard_reason: null,
      repair_attempts: p.repairs,
      scores: b.scores,
      coverage: meas.coverage,
      mutants_eval: b.eval,
      mutants_feedback: b.feedback,
      survivors_sent: survivorsSent.count,
      survivor_ids: survivorsSent.ids,
      tests: statsOf(p.source, importSubstr, o.allowedImports),
      prompt_file: p.promptFile,
      response_file: p.responseFile,
    });
    return v;
  };

  const overBudget = (): boolean => o.maxTokensPerModule !== undefined && meter.tokens >= o.maxTokensPerModule;

  try {
    if (o.condition === "C0") {
      const scope = o.c0Scope ?? "module";
      const meas = await o.evaluator.measureHuman(scope);
      meter.strykerS += meas.stryker_s;
      await o.artifacts.write(`k0_stryker-report.json`, JSON.stringify(meas.report));
      const groups = assignGroups(meas.report, o.splitSeed);
      const b = computeScores(meas.report, groups);
      let nTests = 0;
      let nAsserts = 0;
      for (const s of o.humanTestSources ?? []) {
        const g = analyzeTestFile(s);
        nTests += g.n_tests;
        nAsserts += g.n_asserts;
      }
      valids.push({ k: 0, source: (o.humanTestSources ?? []).join("\n"), meas, ms_feedback: b.scores.ms_feedback });
      bestK = 0;
      record({
        k: 0,
        valid: true,
        discard_reason: null,
        repair_attempts: 0,
        scores: b.scores,
        coverage: meas.coverage,
        mutants_eval: b.eval,
        mutants_feedback: b.feedback,
        survivors_sent: 0,
        survivor_ids: [],
        tests: { n_tests: nTests, n_asserts: nAsserts, sha256: sha256((o.humanTestSources ?? []).join("\n")) },
      });
    } else {
      const conv = o.condition === "C1" ? null : o.conventions;
      const initialPrompt = buildInitialPrompt({
        modulePath: promptUnit,
        importPath: o.importPath,
        source: o.source,
        conventions: conv,
        sourceLang: o.sourceLang,
        notes: o.promptNotes,
        kind: o.kind,
        contextFiles: o.contextFiles,
      });
      const base = [o.subject.library, o.subject.module.id, o.condition, o.rep];

      if (o.condition === "C1" || o.condition === "C2") {
        const p = await produce(0, initialPrompt, [...base, 0], null);
        await finishIteration(0, p, { count: 0, ids: [] });
      } else if (o.condition === "C2r") {
        for (let k = 0; k <= o.n; k++) {
          if (k > 0 && overBudget()) {
            status = "budget_exhausted";
            break;
          }
          const p = await produce(k, initialPrompt, [...base, k], null);
          await finishIteration(k, p, { count: 0, ids: [] });
        }
      } else {
        // C3
        const p0 = await produce(0, initialPrompt, [...base, 0], null);
        await finishIteration(0, p0, { count: 0, ids: [] });
        for (let k = 1; k <= o.n; k++) {
          const best = pickBest();
          if (!best) {
            // sem arquivo válido para melhorar: tenta nova geração inicial como C2
            if (overBudget()) {
              status = "budget_exhausted";
              break;
            }
            const pr = await produce(k, initialPrompt, [...base, k], null);
            await finishIteration(k, pr, { count: 0, ids: [] });
            continue;
          }
          const groups = assignGroups(best.meas.report, o.splitSeed);
          const totalSurv = countFeedbackSurvivors(best.meas.report, groups);
          if (totalSurv === 0) break; // critério de parada: nada a melhorar no grupo feedback
          if (overBudget()) {
            status = "budget_exhausted";
            break;
          }
          const survivors = selectSurvivors(best.meas.report, groups, {
            limit: o.maxSurvivors,
            seed: `${o.splitSeed}|${o.subject.library}|${o.subject.module.id}|${o.rep}|${k}`,
          });
          const prompt = buildFeedbackPrompt({
            modulePath: promptUnit,
            importPath: o.importPath,
            source: o.source,
            conventions: conv,
            sourceLang: o.sourceLang,
            notes: o.promptNotes,
            kind: o.kind,
            contextFiles: o.contextFiles,
            currentTests: best.source,
            survivors,
            totalSurvivorsInFeedbackGroup: totalSurv,
          });
          const p = await produce(k, prompt, [...base, k], best.source);
          await finishIteration(k, p, { count: survivors.length, ids: survivors.map((s) => s.key) });
        }
      }
    }
  } catch (e) {
    if (e instanceof ProviderError) {
      status = "provider_error";
      error = e.message;
    } else {
      status = "stryker_error";
      error = e instanceof Error ? e.message : String(e);
    }
  }

  const best = pickBest();
  if (status === "ok" && !best) status = "invalid_all_iterations";
  const bestRec = best ? iterations.find((i) => i.k === best.k && i.valid)! : null;
  const k0 = iterations.find((i) => i.k === 0 && i.valid);
  const finalCost = meter.snapshot();
  const attempted = iterations.length;
  const validCount = iterations.filter((i) => i.valid).length;
  const gain = bestRec && k0 && bestRec.scores.ms_eval !== null && k0.scores.ms_eval !== null ? bestRec.scores.ms_eval - k0.scores.ms_eval : null;
  const tokensPerPp = gain !== null && gain > 0 && o.condition !== "C1" && o.condition !== "C2" && o.condition !== "C0" ? round(meter.tokens / gain, 2) : null;

  const finishedAt = now();
  const lineCov = bestRec?.coverage.line_cov ?? null;
  const msAll = bestRec?.scores.ms_all ?? null;
  const srcClean = await o.evaluator.srcUnchanged().catch(() => false);

  const moduleReportTotal = best ? totalMutants(best.meas.report) : 0;

  return {
    schema_version: "0.1",
    run_id: runId(o.subject.library, o.subject.module.id, o.condition, o.rep, o.c0Scope),
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    status,
    error,
    subject: {
      library: o.subject.library,
      repo: o.subject.repo,
      commit: o.subject.commit,
      license: o.subject.license,
      module_path: o.subject.module.path,
      ...(o.subject.module.mutatePaths && o.subject.module.mutatePaths.length > 1 ? { mutate_paths: o.subject.module.mutatePaths } : {}),
      module_loc: o.subject.module.loc,
      mutants_total: moduleReportTotal,
      human_test_files: o.subject.module.humanTests,
    },
    condition: o.condition,
    repetition: o.rep,
    ...(o.condition === "C0" ? { c0_scope: o.c0Scope ?? "module" } : {}),
    model: o.provider
      ? {
          provider: o.provider.name,
          model_id: o.provider.modelId,
          temperature: o.temperature,
          top_p: o.topP,
          seed: null,
          max_output_tokens: o.maxOutputTokens,
        }
      : null,
    tooling: { ...o.tooling, claude_md_sha256: o.condition === "C0" || o.condition === "C1" ? null : claudeMdSha },
    memorization: o.memorization ?? null,
    iterations,
    selected_iteration: best?.k ?? 0,
    final: {
      scores: bestRec?.scores ?? NULL_SCORES,
      coverage: bestRec?.coverage ?? { line_cov: null, branch_cov: null },
      cost: finalCost,
      tests: bestRec?.tests ?? { n_tests: 0, n_asserts: 0, sha256: "" },
      gap_cov_ms: lineCov !== null && msAll !== null ? round(lineCov - msAll, 4) : null,
      valid_rate: attempted === 0 ? 0 : round(validCount / attempted, 4) ?? 0,
      tokens_per_pp: tokensPerPp,
    },
    guardrails: {
      src_diff_empty: srcClean,
      forbidden_patterns_found: [...violationsSeen],
      flaky: best?.meas.flaky ?? false,
      reruns: best?.meas.reruns ?? 0,
    },
  };
}
