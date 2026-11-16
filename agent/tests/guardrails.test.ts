import { describe, expect, it } from "vitest";
import { analyzeTestFile } from "../src/guardrails.js";
import { extractCode } from "../src/extract.js";

const HEAD = `import { describe, it, expect } from "vitest";\nimport { f } from "../../src/f";\n`;
const ok = (body: string) => analyzeTestFile(HEAD + body, { allowedImportSubstr: "src" });

describe("analyzeTestFile", () => {
  it("aceita um arquivo bom e conta testes e assertions", () => {
    const r = ok(`describe("f", () => { it("a", () => { expect(f(1)).toBe(2); expect(f(2)).toBe(3); }); it("b", () => { expect(f(0)).toBe(1); }); });`);
    expect(r.ok).toBe(true);
    expect(r.n_tests).toBe(2);
    expect(r.n_asserts).toBe(3);
  });
  it.each([
    ["it.skip", `it.skip("a", () => { expect(f(1)).toBe(2); });`, "skip"],
    ["describe.only", `describe.only("a", () => { it("b", () => { expect(f(1)).toBe(2); }); });`, "only"],
    ["it.todo", `it.todo("a");`, "todo"],
    ["xit", `xit("a", () => { expect(f(1)).toBe(2); });`, "skip"],
    ["expect(true)", `it("a", () => { expect(true).toBe(true); });`, "expect_true"],
    ["tautologia", `it("a", () => { expect(f(1)).toBe(f(1)); });`, "tautology"],
    ["sem assertion", `it("a", () => { f(1); });`, "no_assertion"],
    ["fetch", `it("a", async () => { await fetch("http://x"); expect(1).toBe(1); });`, "network"],
    ["Date.now", `it("a", () => { expect(f(Date.now())).toBe(1); });`, "clock"],
    ["new Date()", `it("a", () => { expect(f(+new Date())).toBe(1); });`, "clock"],
    ["Math.random", `it("a", () => { expect(f(Math.random())).toBe(1); });`, "random"],
  ])("rejeita %s", (_n, body, code) => {
    const r = ok(body);
    expect(r.ok).toBe(false);
    expect(r.violations).toContain(code);
  });
  it("rejeita imports fora de vitest e do módulo", () => {
    const r = analyzeTestFile(`import { it, expect } from "vitest";\nimport x from "lodash";\nit("a", () => { expect(x).toBe(1); });`);
    expect(r.violations).toContain("forbidden_import");
  });
  it("aceita Date.now quando há relógio falso", () => {
    const r = ok(`it("a", () => { vi.useFakeTimers(); expect(f(Date.now())).toBe(1); });`);
    expect(r.violations).not.toContain("clock");
  });
  it("reconhece helper local que contém a assertion", () => {
    const r = ok(`function check(x: number, y: number) { expect(f(x)).toBe(y); }\nit("a", () => { check(1, 2); });`);
    expect(r.violations).not.toContain("no_assertion");
    expect(r.ok).toBe(true);
  });
  it("arquivo sem testes não é ok", () => {
    expect(ok(`// vazio`).ok).toBe(false);
  });
});

describe("extractCode", () => {
  it("extrai o bloco ts", () => {
    expect(extractCode("texto\n```ts\nit('a', ()=>{});\n```\nfim")).toBe("it('a', ()=>{});\n");
  });
  it("prefere o bloco com testes", () => {
    const t = "```ts\nconst long = 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx';\n```\n```ts\nit('a', () => {});\n```";
    expect(extractCode(t)).toContain("it('a'");
  });
  it("trata bloco não fechado (resposta cortada)", () => {
    expect(extractCode("```ts\nit('a', () => {\n  expect(1).toBe(1);")).toContain("expect(1)");
  });
  it("retorna null sem código", () => {
    expect(extractCode("desculpe, não consigo")).toBeNull();
  });
});
