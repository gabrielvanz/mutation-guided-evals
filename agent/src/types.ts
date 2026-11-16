export type Condition = "C0" | "C1" | "C2" | "C2r" | "C3";

export type MutantStatus =
  | "Killed"
  | "Survived"
  | "NoCoverage"
  | "Timeout"
  | "CompileError"
  | "RuntimeError"
  | "Ignored"
  | "Pending";

export interface Position {
  line: number;
  column: number;
}

export interface StrykerMutant {
  id: string;
  mutatorName: string;
  replacement?: string;
  status: MutantStatus;
  location: { start: Position; end: Position };
}

export interface StrykerFile {
  language?: string;
  source: string;
  mutants: StrykerMutant[];
}

/** Subconjunto do mutation-testing-report-schema que o agente consome. */
export interface StrykerReport {
  schemaVersion: string;
  files: Record<string, StrykerFile>;
}

export type Group = "feedback" | "eval";

export interface MutantCounts {
  killed: number;
  survived: number;
  no_coverage: number;
  timeout: number;
  compile_error: number;
  runtime_error: number;
  ignored: number;
}

export interface Scores {
  ms_eval: number | null;
  ms_feedback: number | null;
  ms_all: number | null;
  ms_covered: number | null;
  ms_killable?: number | null;
}

export interface Survivor {
  key: string;
  file: string;
  line: number;
  mutator: string;
  status: "Survived" | "NoCoverage";
  original: string;
  replacement: string;
  lineText: string;
}

export interface Coverage {
  line_cov: number | null;
  branch_cov: number | null;
}

export interface Cost {
  calls: number;
  repair_calls: number;
  tokens_in: number;
  tokens_out: number;
  usd_ref: number;
  wall_s: number;
  stryker_s: number;
}

export interface TestStats {
  n_tests: number;
  n_asserts: number;
  sha256: string;
}

export type DiscardReason =
  | "tests_fail_on_original"
  | "guardrail_violation"
  | "provider_error"
  | "unparseable_response"
  | "stryker_error";

export interface IterationRecord {
  k: number;
  valid: boolean;
  discard_reason: DiscardReason | null;
  repair_attempts: number;
  scores: Scores;
  coverage: Coverage;
  mutants_eval?: MutantCounts;
  mutants_feedback?: MutantCounts;
  survivors_sent: number;
  survivor_ids: string[];
  best_k_so_far: number | null;
  cost_cumulative: Cost;
  tests: TestStats;
  prompt_file?: string;
  response_file?: string;
}

export type ForbiddenPattern =
  | "skip"
  | "todo"
  | "only"
  | "expect_true"
  | "tautology"
  | "no_assertion"
  | "forbidden_import"
  | "network"
  | "clock"
  | "random";

export interface RunResult {
  schema_version: "0.1";
  run_id: string;
  started_at: string;
  finished_at: string;
  status: "ok" | "invalid_all_iterations" | "budget_exhausted" | "provider_error" | "stryker_error" | "timeout";
  error: string | null;
  subject: {
    library: string;
    repo: string;
    commit: string;
    license: string;
    module_path: string;
    module_loc: number;
    mutants_total: number;
    human_test_files: string[];
  };
  condition: Condition;
  repetition: number;
  c0_scope?: "module" | "suite";
  model: {
    provider: string;
    model_id: string;
    temperature: number;
    top_p: number | null;
    seed: number | null;
    max_output_tokens: number;
    sdk_version?: string;
  } | null;
  tooling: {
    node: string;
    vitest: string;
    stryker: string;
    stryker_config_sha256?: string;
    split_seed: string;
    claude_md_sha256: string | null;
    git_sha_agent?: string;
  };
  memorization?: { probe_similarity: number; stratum: "low" | "high" } | null;
  iterations: IterationRecord[];
  selected_iteration: number;
  final: {
    scores: Scores;
    coverage: Coverage;
    cost: Cost;
    tests: TestStats;
    gap_cov_ms: number | null;
    valid_rate: number;
    tokens_per_pp: number | null;
  };
  guardrails: {
    src_diff_empty: boolean;
    forbidden_patterns_found: ForbiddenPattern[];
    flaky: boolean;
    reruns: number;
  };
  artifacts?: { raw_dir?: string; stryker_report?: string; final_test_file?: string };
}
