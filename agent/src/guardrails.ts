import ts from "typescript";
import type { ForbiddenPattern } from "./types.js";

export interface GuardrailReport {
  ok: boolean;
  violations: ForbiddenPattern[];
  messages: string[];
  n_tests: number;
  n_asserts: number;
}

const TEST_FNS = new Set(["it", "test"]);
const SUITE_FNS = new Set(["describe", "it", "test"]);
const FORBIDDEN_MODIFIERS: Record<string, ForbiddenPattern> = {
  skip: "skip",
  skipIf: "skip",
  todo: "todo",
  only: "only",
  runIf: "skip",
};
const LEGACY_SKIP = new Set(["xit", "xdescribe", "xtest"]);
const LEGACY_ONLY = new Set(["fit", "fdescribe"]);

function rootIdentifier(e: ts.Expression): string | null {
  let cur: ts.Expression = e;
  for (;;) {
    if (ts.isIdentifier(cur)) return cur.text;
    if (ts.isPropertyAccessExpression(cur)) cur = cur.expression;
    else if (ts.isCallExpression(cur)) cur = cur.expression;
    else if (ts.isElementAccessExpression(cur)) cur = cur.expression;
    else if (ts.isNonNullExpression(cur) || ts.isParenthesizedExpression(cur)) cur = cur.expression;
    else if (ts.isAwaitExpression(cur)) cur = cur.expression;
    else return null;
  }
}

function isAssertionCall(n: ts.CallExpression): boolean {
  const callee = n.expression;
  if (ts.isIdentifier(callee)) return callee.text === "expect" || callee.text === "assert";
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    const o = callee.expression.text;
    return (o === "expect" && callee.name.text === "soft") || o === "assert";
  }
  return false;
}

function isExpectCall(n: ts.CallExpression): boolean {
  return ts.isIdentifier(n.expression) && n.expression.text === "expect";
}

/** Padrões comparados com `it.each`/`test.each`: tabela de casos, conta como 1 teste declarado. */
function isTestDeclaration(n: ts.CallExpression): boolean {
  const callee = n.expression;
  if (ts.isIdentifier(callee)) return TEST_FNS.has(callee.text);
  if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression)) {
    return TEST_FNS.has(callee.expression.text) && ["concurrent", "sequential", "fails"].includes(callee.name.text);
  }
  if (ts.isCallExpression(callee) && ts.isPropertyAccessExpression(callee.expression)) {
    const ex = callee.expression;
    return ts.isIdentifier(ex.expression) && TEST_FNS.has(ex.expression.text) && ex.name.text === "each";
  }
  return false;
}

function getCallback(n: ts.CallExpression): ts.FunctionLikeDeclaration | null {
  for (const a of n.arguments) {
    if (ts.isArrowFunction(a) || ts.isFunctionExpression(a)) return a;
  }
  return null;
}

function containsAssertion(node: ts.Node): boolean {
  let found = false;
  const visit = (x: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(x) && isAssertionCall(x)) {
      found = true;
      return;
    }
    ts.forEachChild(x, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

function hasHelperCall(node: ts.Node, helpers: Set<string>): boolean {
  let found = false;
  const visit = (x: ts.Node): void => {
    if (found) return;
    if (ts.isCallExpression(x) && ts.isIdentifier(x.expression) && helpers.has(x.expression.text)) {
      found = true;
      return;
    }
    ts.forEachChild(x, visit);
  };
  ts.forEachChild(node, visit);
  return found;
}

export interface GuardrailOptions {
  /** Prefixo permitido para imports relativos do módulo sob teste (ex.: "../../src"). */
  allowedImportSubstr?: string;
  /** Pacotes (além de "vitest") cujo import é permitido, ex.: ["supertest"]. */
  allowedImports?: string[];
}

export function analyzeTestFile(source: string, opts: GuardrailOptions = {}): GuardrailReport {
  const sf = ts.createSourceFile("generated.test.ts", source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
  const violations = new Set<ForbiddenPattern>();
  const messages: string[] = [];
  let nTests = 0;
  let nAsserts = 0;
  const flag = (v: ForbiddenPattern, msg: string): void => {
    violations.add(v);
    messages.push(msg);
  };

  const mitigations = {
    clock: /vi\.(useFakeTimers|setSystemTime)\s*\(/.test(source),
    random: /vi\.spyOn\s*\(\s*Math\s*,\s*["']random["']/.test(source) || /vi\.stubGlobal\s*\(\s*["']Math["']/.test(source),
  };

  // helpers locais que contêm assertions (ex.: function check(x){ expect(...) }) contam como assertion no teste
  const helperNames = new Set<string>();
  const collectHelpers = (x: ts.Node): void => {
    if (ts.isFunctionDeclaration(x) && x.name && x.body && containsAssertion(x.body)) helperNames.add(x.name.text);
    if (
      ts.isVariableDeclaration(x) &&
      ts.isIdentifier(x.name) &&
      x.initializer &&
      (ts.isArrowFunction(x.initializer) || ts.isFunctionExpression(x.initializer)) &&
      containsAssertion(x.initializer)
    ) {
      helperNames.add(x.name.text);
    }
    ts.forEachChild(x, collectHelpers);
  };
  collectHelpers(sf);

  const visit = (n: ts.Node): void => {
    // imports permitidos: vitest e o módulo sob teste
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const spec = n.moduleSpecifier.text;
      const okVitest = spec === "vitest";
      const okRel = spec.startsWith(".") && (!opts.allowedImportSubstr || spec.includes(opts.allowedImportSubstr));
      const okExtra = opts.allowedImports?.includes(spec) ?? false;
      if (!okVitest && !okRel && !okExtra) {
        const allowed = ['"vitest"', ...(opts.allowedImports ?? []).map((a) => `"${a}"`), "o módulo sob teste"].join(", ");
        flag("forbidden_import", `import não permitido: "${spec}" (só ${allowed})`);
      }
      if (/^(node:)?(http|https|net|dgram|tls|http2)$/.test(spec)) flag("network", `import de rede: "${spec}"`);
    }
    if (ts.isCallExpression(n)) {
      const callee = n.expression;
      // modificadores proibidos: it.skip, describe.only, test.todo ...
      if (ts.isPropertyAccessExpression(callee) && ts.isIdentifier(callee.expression) && SUITE_FNS.has(callee.expression.text)) {
        const mod = FORBIDDEN_MODIFIERS[callee.name.text];
        if (mod) flag(mod, `${callee.expression.text}.${callee.name.text} é proibido`);
      }
      if (ts.isIdentifier(callee)) {
        if (LEGACY_SKIP.has(callee.text)) flag("skip", `${callee.text} é proibido`);
        if (LEGACY_ONLY.has(callee.text)) flag("only", `${callee.text} é proibido`);
        if (callee.text === "fetch") flag("network", "uso de fetch");
      }
      if (isExpectCall(n)) {
        nAsserts++;
        const arg = n.arguments[0];
        if (arg && (arg.kind === ts.SyntaxKind.TrueKeyword || arg.kind === ts.SyntaxKind.FalseKeyword)) {
          flag("expect_true", "expect(true/false) literal não testa nada");
        }
        // tautologia: expect(X).toBe(X) / toEqual(X) com mesmo texto literal
        const parent = n.parent;
        if (arg && parent && ts.isPropertyAccessExpression(parent) && ts.isCallExpression(parent.parent)) {
          const matcher = parent.name.text;
          const margs = parent.parent.arguments;
          if (["toBe", "toEqual", "toStrictEqual"].includes(matcher) && margs[0] && margs[0].getText(sf) === arg.getText(sf)) {
            flag("tautology", `expect(${arg.getText(sf)}).${matcher}(${margs[0].getText(sf)}) é tautologia`);
          }
        }
      } else if (isAssertionCall(n)) {
        nAsserts++;
      }
      if (ts.isPropertyAccessExpression(callee)) {
        const text = callee.getText(sf);
        if (text === "Date.now" || text === "performance.now") {
          if (!mitigations.clock) flag("clock", `uso de ${text} sem relógio falso`);
        }
        if (text === "Math.random" || text === "crypto.randomUUID" || text === "crypto.getRandomValues") {
          if (!mitigations.random) flag("random", `uso de ${text} sem controle`);
        }
      }
      if (isTestDeclaration(n)) {
        nTests++;
        const cb = getCallback(n);
        if (cb && cb.body && !containsAssertion(cb.body) && !hasHelperCall(cb.body, helperNames)) {
          flag("no_assertion", "teste sem nenhuma assertion");
        }
      }
    }
    if (ts.isNewExpression(n)) {
      const t = n.expression.getText(sf);
      if (t === "Date" && (!n.arguments || n.arguments.length === 0) && !mitigations.clock) {
        flag("clock", "new Date() sem argumentos e sem relógio falso");
      }
      if (t === "XMLHttpRequest" || t === "WebSocket") flag("network", `uso de ${t}`);
    }
    ts.forEachChild(n, visit);
  };
  visit(sf);

  // `rootIdentifier` fica exportado para diagnósticos futuros
  void rootIdentifier;

  return {
    ok: violations.size === 0 && nTests > 0,
    violations: [...violations],
    messages: nTests === 0 ? [...messages, "nenhum teste (it/test) encontrado"] : messages,
    n_tests: nTests,
    n_asserts: nAsserts,
  };
}
