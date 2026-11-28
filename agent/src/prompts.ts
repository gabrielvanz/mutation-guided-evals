import type { Survivor } from "./types.js";
import { truncate } from "./util.js";

export const SYSTEM_PROMPT = `You are an expert TypeScript engineer who writes unit tests with Vitest.

Task rules (apply to every request):
- Reply with exactly ONE complete test file inside a single \`\`\`ts code block, and nothing else of substance.
- The first imports must be: import { describe, it, expect } from "vitest"; and an import of the module under test using exactly the import path given in the request.
- Do not import anything else (no other packages, no Node built-ins, no fixtures, no type-testing libraries).
- Test only what the module exports. Never modify the source code under test and never mock the module under test.
- Tests must be deterministic: no network, no real clock, no randomness, no timers, no file system.
- Every test must contain at least one assertion with expect(). Do not use .skip, .only, .todo, or tautologies such as expect(true).toBe(true).
- All tests must pass against the source code shown to you.`;

export const SYSTEM_PROMPT_API = `You are an expert Node.js engineer who writes API-level tests with Vitest and supertest.

Task rules (apply to every request):
- Reply with exactly ONE complete test file inside a single \`\`\`ts code block, and nothing else of substance.
- The first imports must be: import { describe, it, expect } from "vitest"; import request from "supertest"; and a default import of the Express app using exactly the import path given in the request.
- Do not import anything else (no other packages, no Node built-ins, no fixtures, and never the controllers, services or models directly).
- Exercise the API only through HTTP requests made with supertest against the imported app, for example request(app).get("/path"). Never modify the source code and never mock the app or its modules.
- Tests must be deterministic: no real network, no real clock, no timers, no file system. The database is in memory and shared by all the tests of the file: each test must create the data it needs, with unique values, and must not depend on data created by other tests or on the order of execution.
- Every test must contain at least one assertion with expect(). Do not use .skip, .only, .todo, or tautologies such as expect(true).toBe(true).
- All tests must pass against the source code shown to you.`;

export const systemPromptFor = (kind?: "unit" | "api"): string => (kind === "api" ? SYSTEM_PROMPT_API : SYSTEM_PROMPT);

/** Arquivo de contexto somente leitura mostrado no prompt (ex.: arquivo de rotas). */
export interface ContextFile {
  path: string;
  content: string;
}

const contextBlock = (files: ContextFile[] | undefined): string[] =>
  (files ?? []).map((f) => `Read-only context file \`${f.path}\` (it is NOT mutated or tested directly; use it to learn the API):\n\`\`\`js\n${f.content}\n\`\`\``);

export interface InitialPromptInput {
  modulePath: string;
  importPath: string;
  source: string;
  /** Conteúdo do CLAUDE.md (convenções). null em C1. */
  conventions: string | null;
  /** Linguagem do módulo sob teste, para o bloco de código do prompt. Padrão: "ts". */
  sourceLang?: string;
  /** Nota fixa do sujeito (ex.: o módulo é CommonJS). Ausente nas bibliotecas TypeScript originais. */
  notes?: string | null;
  /** "api": a unidade é testada via HTTP com supertest; `modulePath` descreve a unidade e `importPath` é o do app. */
  kind?: "unit" | "api";
  contextFiles?: ContextFile[];
}

export function buildInitialPrompt(i: InitialPromptInput): string {
  const parts: string[] = [];
  if (i.kind === "api") {
    parts.push(`Write a Vitest + supertest test file for this API unit: ${i.modulePath}.`);
    parts.push(`Import the Express app with this exact path: \`${i.importPath}\` (default import; the test file lives in a different directory).`);
  } else {
    parts.push(`Write a Vitest test file for the module \`${i.modulePath}\`.`);
    parts.push(`Import the module under test with this exact path: \`${i.importPath}\` (the test file lives in a different directory).`);
  }
  if (i.notes) parts.push(`Note about this project: ${i.notes.trim()}`);
  if (i.conventions) {
    parts.push(`Project conventions (CLAUDE.md):\n<conventions>\n${i.conventions.trim()}\n</conventions>`);
  }
  parts.push(...contextBlock(i.contextFiles));
  parts.push(`Source of \`${i.modulePath}\`:\n\`\`\`${i.sourceLang ?? "ts"}\n${i.source}\n\`\`\``);
  parts.push("Return the complete test file.");
  return parts.join("\n\n");
}

export interface FeedbackPromptInput extends InitialPromptInput {
  currentTests: string;
  survivors: Survivor[];
  totalSurvivorsInFeedbackGroup: number;
}

export function formatSurvivor(s: Survivor, idx: number, showFile = false): string {
  const orig = s.original.length > 200 ? s.original.slice(0, 200) + "..." : s.original;
  const repl = s.replacement.length > 200 ? s.replacement.slice(0, 200) + "..." : s.replacement;
  const cov = s.status === "NoCoverage" ? " (no test executes this code)" : "";
  const where = showFile ? `file ${s.file}, line ${s.line}` : `line ${s.line}`;
  return `${idx + 1}. ${where}, operator ${s.mutator}${cov}\n   line: ${s.lineText.trim()}\n   original fragment: ${JSON.stringify(orig)}\n   mutated fragment:  ${JSON.stringify(repl)}`;
}

export function buildFeedbackPrompt(i: FeedbackPromptInput): string {
  const parts: string[] = [];
  parts.push(
    i.kind === "api"
      ? `Improve the Vitest + supertest test file for this API unit: ${i.modulePath} (app import path: \`${i.importPath}\`).`
      : `Improve the Vitest test file for the module \`${i.modulePath}\` (import path: \`${i.importPath}\`).`,
  );
  if (i.notes) parts.push(`Note about this project: ${i.notes.trim()}`);
  if (i.conventions) parts.push(`Project conventions (CLAUDE.md):\n<conventions>\n${i.conventions.trim()}\n</conventions>`);
  parts.push(...contextBlock(i.contextFiles));
  parts.push(`Source of \`${i.modulePath}\`:\n\`\`\`${i.sourceLang ?? "ts"}\n${i.source}\n\`\`\``);
  parts.push(`Current test file (it passes on the original source):\n\`\`\`ts\n${i.currentTests}\n\`\`\``);
  parts.push(
    `A mutation testing tool changed the source in small ways, and the current tests did NOT detect the ${i.survivors.length} changes below ` +
      `(${i.totalSurvivorsInFeedbackGroup} undetected changes in total; a sample is shown). ` +
      `A change is detected only when at least one test fails on the mutated code.\n\n` +
      i.survivors.map((s, n) => formatSurvivor(s, n, i.kind === "api")).join("\n"),
  );
  parts.push(
    "Return the COMPLETE updated test file. Keep the existing tests that are valuable, and add tests with precise assertions on concrete expected values " +
      "that would fail if the code behaved like the mutated versions. Do not write tests that merely replicate the mutated code. " +
      "All tests must still pass on the ORIGINAL source shown above.",
  );
  return parts.join("\n\n");
}

export interface RepairPromptInput {
  modulePath: string;
  importPath: string;
  source: string;
  currentTests: string;
  problems: string;
  sourceLang?: string;
  notes?: string | null;
  kind?: "unit" | "api";
  contextFiles?: ContextFile[];
}

export function buildRepairPrompt(i: RepairPromptInput): string {
  return [
    `The Vitest test file below for \`${i.modulePath}\` (import path: \`${i.importPath}\`) is not acceptable.`,
    `The source code is correct and must not be changed. Fix the TESTS so that they pass against the source and follow the task rules.`,
    ...(i.notes ? [`Note about this project: ${i.notes.trim()}`] : []),
    ...contextBlock(i.contextFiles),
    `Source of \`${i.modulePath}\`:\n\`\`\`${i.sourceLang ?? "ts"}\n${i.source}\n\`\`\``,
    `Current test file:\n\`\`\`ts\n${i.currentTests}\n\`\`\``,
    `Problems:\n\`\`\`\n${truncate(i.problems, 6000)}\n\`\`\``,
    "Return the COMPLETE corrected test file.",
  ].join("\n\n");
}
