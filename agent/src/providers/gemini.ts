import { ProviderError, RateLimiter, withRetry, type LLMProvider, type LLMRequest, type LLMResponse, type RetryOptions } from "./provider.js";

interface GeminiOptions {
  apiKey: string;
  modelId: string;
  baseUrl?: string;
  minIntervalMs?: number;
  /** 0 desativa o "thinking" (custo e variância menores). undefined = padrão do modelo. */
  thinkingBudget?: number;
  /**
   * Modelos Gemini 3.x recusam `thinkingBudget: 0` (HTTP 400) e usam níveis ("minimal", "low", ...).
   * A API não aceita os dois juntos: se definido, tem prioridade sobre thinkingBudget.
   */
  thinkingLevel?: string;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
}

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string; thought?: boolean }[] }; finishReason?: string }[];
  usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  modelVersion?: string;
  promptFeedback?: { blockReason?: string };
}

export class GeminiProvider implements LLMProvider {
  readonly name = "google-ai-studio";
  readonly modelId: string;
  private readonly limiter: RateLimiter;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly o: GeminiOptions) {
    this.modelId = o.modelId;
    this.limiter = new RateLimiter(o.minIntervalMs ?? 4000);
    this.baseUrl = o.baseUrl ?? "https://generativelanguage.googleapis.com/v1beta";
    this.fetchImpl = o.fetchImpl ?? fetch;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    return withRetry(async () => {
      await this.limiter.wait();
      const generationConfig: Record<string, unknown> = {
        temperature: req.temperature,
        maxOutputTokens: req.maxOutputTokens,
      };
      if (req.topP !== null) generationConfig.topP = req.topP;
      if (req.seed !== null) generationConfig.seed = req.seed;
      if (this.o.thinkingLevel !== undefined) generationConfig.thinkingConfig = { thinkingLevel: this.o.thinkingLevel };
      else if (this.o.thinkingBudget !== undefined) generationConfig.thinkingConfig = { thinkingBudget: this.o.thinkingBudget };

      const t0 = Date.now();
      const res = await this.fetchImpl(`${this.baseUrl}/models/${encodeURIComponent(this.modelId)}:generateContent`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": this.o.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: req.system }] },
          contents: [{ role: "user", parts: [{ text: req.user }] }],
          generationConfig,
        }),
      });
      const bodyText = await res.text();
      if (!res.ok) {
        const retriable = res.status === 429 || res.status >= 500;
        throw new ProviderError(`Gemini HTTP ${res.status}: ${bodyText.slice(0, 400)}`, res.status, retriable);
      }
      const json = JSON.parse(bodyText) as GeminiResponse;
      if (json.promptFeedback?.blockReason) {
        throw new ProviderError(`Gemini bloqueou o prompt: ${json.promptFeedback.blockReason}`, 400, false);
      }
      const parts = json.candidates?.[0]?.content?.parts ?? [];
      const text = parts.filter((p) => !p.thought).map((p) => p.text ?? "").join("");
      const u = json.usageMetadata ?? {};
      return {
        text,
        tokensIn: u.promptTokenCount ?? 0,
        tokensOut: (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0),
        modelId: json.modelVersion ?? this.modelId,
        latencyMs: Date.now() - t0,
        raw: json,
      };
    }, this.o.retry);
  }
}
