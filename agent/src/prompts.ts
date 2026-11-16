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

export interface InitialPromptInput {
  modulePath: string;
  importPath: string;
  source: string;
  /** Conteúdo do CLAUDE.md (convenções). null em C1. */
  conventions: string | null;
}

export function buildInitialPrompt(i: InitialPromptInput): string {
  const parts: string[] = [];
  parts.push(`Write a Vitest test file for the module \`${i.modulePath}\`.`);
  parts.push(`Import the module under test with this exact path: \`${i.importPath}\` (the test file lives in a different directory).`);
  if (i.conventions) {
    parts.push(`Project conventions (CLAUDE.md):\n<conventions>\n${i.conventions.trim()}\n</conventions>`);
  }
  parts.push(`Source of \`${i.modulePath}\`:\n\`\`\`ts\n${i.source}\n\`\`\``);
  parts.push("Return the complete test file.");
  return parts.join("\n\n");
}

export interface FeedbackPromptInput extends InitialPromptInput {
  currentTests: string;
  survivors: Survivor[];
  totalSurvivorsInFeedbackGroup: number;
}

export function formatSurvivor(s: Survivor, idx: number): string {
  const orig = s.original.length > 200 ? s.original.slice(0, 200) + "..." : s.original;
  const repl = s.replacement.length > 200 ? s.replacement.slice(0, 200) + "..." : s.replacement;
  const cov = s.status === "NoCoverage" ? " (no test executes this code)" : "";
  return `${idx + 1}. line ${s.line}, operator ${s.mutator}${cov}\n   line: ${s.lineText.trim()}\n   original fragment: ${JSON.stringify(orig)}\n   mutated fragment:  ${JSON.stringify(repl)}`;
}

export function buildFeedbackPrompt(i: FeedbackPromptInput): string {
  const parts: string[] = [];
  parts.push(`Improve the Vitest test file for the module \`${i.modulePath}\` (import path: \`${i.importPath}\`).`);
  if (i.conventions) parts.push(`Project conventions (CLAUDE.md):\n<conventions>\n${i.conventions.trim()}\n</conventions>`);
  parts.push(`Source of \`${i.modulePath}\`:\n\`\`\`ts\n${i.source}\n\`\`\``);
  parts.push(`Current test file (it passes on the original source):\n\`\`\`ts\n${i.currentTests}\n\`\`\``);
  parts.push(
    `A mutation testing tool changed the source in small ways, and the current tests did NOT detect the ${i.survivors.length} changes below ` +
      `(${i.totalSurvivorsInFeedbackGroup} undetected changes in total; a sample is shown). ` +
      `A change is detected only when at least one test fails on the mutated code.\n\n` +
      i.survivors.map(formatSurvivor).join("\n"),
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
}

export function buildRepairPrompt(i: RepairPromptInput): string {
  return [
    `The Vitest test file below for \`${i.modulePath}\` (import path: \`${i.importPath}\`) is not acceptable.`,
    `The source code is correct and must not be changed. Fix the TESTS so that they pass against the source and follow the task rules.`,
    `Source of \`${i.modulePath}\`:\n\`\`\`ts\n${i.source}\n\`\`\``,
    `Current test file:\n\`\`\`ts\n${i.currentTests}\n\`\`\``,
    `Problems:\n\`\`\`\n${truncate(i.problems, 6000)}\n\`\`\``,
    "Return the COMPLETE corrected test file.",
  ].join("\n\n");
}
