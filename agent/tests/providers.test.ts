import { describe, expect, it } from "vitest";
import { GeminiProvider } from "../src/providers/gemini.js";
import { OpenAICompatProvider } from "../src/providers/openai-compat.js";
import { ProviderError, parseRetryDelayMs } from "../src/providers/provider.js";
import { ngramOverlap } from "../src/probe.js";

const req = { system: "s", user: "u", temperature: 0.7, topP: null, maxOutputTokens: 100, seed: 5 };
const fastRetry = { maxRetries: 2, baseDelayMs: 1, maxDelayMs: 2 };
const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

describe("parseRetryDelayMs", () => {
  it("lê RetryInfo, o texto 'retry in Ns' e ignora o que não tem dica", () => {
    expect(parseRetryDelayMs(JSON.stringify({ error: { details: [{ "@type": "x" }, { retryDelay: "23s" }] } }))).toBe(23000);
    expect(parseRetryDelayMs(JSON.stringify({ error: { details: [{ retryDelay: "0.5s" }] } }))).toBe(500);
    expect(parseRetryDelayMs("Quota exceeded. Please retry in 12.4s.")).toBe(12400);
    expect(parseRetryDelayMs(JSON.stringify({ error: { status: "UNAVAILABLE" } }))).toBeNull();
    expect(parseRetryDelayMs("")).toBeNull();
  });
});

describe("GeminiProvider", () => {
  it("lê texto e tokens (incluindo thoughts) e envia seed e chave no header", async () => {
    let seen: { url: string; init: RequestInit } | null = null;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m-1", minIntervalMs: 0, retry: fastRetry, thinkingBudget: 0,
      fetchImpl: (async (url: string, init: RequestInit) => {
        seen = { url, init };
        return json(200, { candidates: [{ content: { parts: [{ text: "oi" }, { text: "pensando", thought: true }] } }], usageMetadata: { promptTokenCount: 10, candidatesTokenCount: 4, thoughtsTokenCount: 6 }, modelVersion: "m-1-001" });
      }) as unknown as typeof fetch,
    });
    const r = await p.generate(req);
    expect(r.text).toBe("oi");
    expect(r.tokensIn).toBe(10);
    expect(r.tokensOut).toBe(10);
    expect(r.modelId).toBe("m-1-001");
    const body = JSON.parse(String(seen!.init.body));
    expect(body.generationConfig.seed).toBe(5);
    expect(body.generationConfig.thinkingConfig).toEqual({ thinkingBudget: 0 });
    expect((seen!.init.headers as Record<string, string>)["x-goog-api-key"]).toBe("K");
    expect(seen!.url).toContain("models/m-1:generateContent");
  });
  it("usa thinkingLevel (Gemini 3.x) e nunca envia thinkingBudget junto", async () => {
    let body: { generationConfig: Record<string, unknown> } | null = null;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m-1", minIntervalMs: 0, retry: fastRetry, thinkingBudget: 0, thinkingLevel: "minimal",
      fetchImpl: (async (_u: string, init: RequestInit) => {
        body = JSON.parse(String(init.body));
        return json(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] });
      }) as unknown as typeof fetch,
    });
    await p.generate(req);
    expect(body!.generationConfig.thinkingConfig).toEqual({ thinkingLevel: "minimal" });
  });
  it("recupera de uma sequência longa de 503 (alta demanda) dentro do orçamento padrão de retentativas", async () => {
    let n = 0;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m", minIntervalMs: 0, retry: { ...fastRetry, maxRetries: 10 },
      fetchImpl: (async () => (++n <= 9 ? json(503, { error: { status: "UNAVAILABLE" } }) : json(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] }))) as unknown as typeof fetch,
    });
    expect((await p.generate(req)).text).toBe("ok");
    expect(n).toBe(10);
  });
  it("trata falha de rede como transitória e tenta de novo", async () => {
    let n = 0;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m", minIntervalMs: 0, retry: fastRetry,
      fetchImpl: (async () => {
        if (++n < 3) throw new TypeError("fetch failed");
        return json(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] });
      }) as unknown as typeof fetch,
    });
    expect((await p.generate(req)).text).toBe("ok");
    expect(n).toBe(3);
  });
  it("respeita o retryDelay sugerido pelo servidor (RetryInfo)", async () => {
    let n = 0;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m", minIntervalMs: 0, retry: fastRetry,
      fetchImpl: (async () =>
        ++n === 1
          ? json(429, { error: { status: "RESOURCE_EXHAUSTED", details: [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay: "0.3s" }] } })
          : json(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] })) as unknown as typeof fetch,
    });
    const t0 = Date.now();
    await p.generate(req);
    expect(Date.now() - t0).toBeGreaterThanOrEqual(280); // o backoff próprio seria ~1-2 ms
  });
  it("não retenta erro de requisição inválida (400)", async () => {
    let n = 0;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m", minIntervalMs: 0, retry: fastRetry,
      fetchImpl: (async () => (++n, json(400, { error: { status: "INVALID_ARGUMENT" } }))) as unknown as typeof fetch,
    });
    await expect(p.generate(req)).rejects.toThrow(/HTTP 400/);
    expect(n).toBe(1);
  });
  it("tenta de novo em 429 e depois tem sucesso", async () => {
    let n = 0;
    const p = new GeminiProvider({
      apiKey: "K", modelId: "m", minIntervalMs: 0, retry: fastRetry,
      fetchImpl: (async () => (++n < 3 ? json(429, { error: "quota" }) : json(200, { candidates: [{ content: { parts: [{ text: "ok" }] } }] }))) as unknown as typeof fetch,
    });
    expect((await p.generate(req)).text).toBe("ok");
    expect(n).toBe(3);
  });
  it("desiste após o máximo de tentativas com ProviderError", async () => {
    const p = new GeminiProvider({ apiKey: "K", modelId: "m", minIntervalMs: 0, retry: fastRetry, fetchImpl: (async () => json(429, {})) as unknown as typeof fetch });
    await expect(p.generate(req)).rejects.toBeInstanceOf(ProviderError);
  });
  it("não tenta de novo em 400", async () => {
    let n = 0;
    const p = new GeminiProvider({ apiKey: "K", modelId: "m", minIntervalMs: 0, retry: fastRetry, fetchImpl: (async () => (n++, json(400, {}))) as unknown as typeof fetch });
    await expect(p.generate(req)).rejects.toBeInstanceOf(ProviderError);
    expect(n).toBe(1);
  });
});

describe("OpenAICompatProvider", () => {
  it("lê choices e usage", async () => {
    const p = new OpenAICompatProvider({
      apiKey: "K", modelId: "m", baseUrl: "https://x/v1/", minIntervalMs: 0, retry: fastRetry,
      fetchImpl: (async (url: string) => {
        expect(url).toBe("https://x/v1/chat/completions");
        return json(200, { choices: [{ message: { content: "yo" } }], usage: { prompt_tokens: 3, completion_tokens: 2 }, model: "m" });
      }) as unknown as typeof fetch,
    });
    const r = await p.generate(req);
    expect(r).toMatchObject({ text: "yo", tokensIn: 3, tokensOut: 2 });
  });
});

describe("ngramOverlap (probe de memorização)", () => {
  it("1 para texto idêntico, 0 para texto sem relação", () => {
    const t = "expect(withQuery('/a', { foo: 1 })).toBe('/a?foo=1'); expect(getQuery('/a?x=1')).toEqual({ x: '1' });";
    expect(ngramOverlap(t, t)).toBe(1);
    expect(ngramOverlap(t, "completamente diferente aqui agora mesmo sem nada")).toBe(0);
  });
  it("é parcial para sobreposição parcial", () => {
    const a = "one two three four five six seven eight nine ten";
    const b = "one two three four five six alpha beta gamma delta";
    const v = ngramOverlap(a, b);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
});
