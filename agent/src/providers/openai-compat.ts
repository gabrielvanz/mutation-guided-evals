import { ProviderError, RateLimiter, withRetry, type LLMProvider, type LLMRequest, type LLMResponse, type RetryOptions } from "./provider.js";

interface OpenAICompatOptions {
  apiKey: string;
  modelId: string;
  /** Ex.: https://api.groq.com/openai/v1 */
  baseUrl: string;
  name?: string;
  minIntervalMs?: number;
  fetchImpl?: typeof fetch;
  retry?: RetryOptions;
}

interface ChatResponse {
  choices?: { message?: { content?: string } }[];
  usage?: { prompt_tokens?: number; completion_tokens?: number };
  model?: string;
}

/** Provedor para qualquer endpoint compatível com /chat/completions (Groq, OpenRouter, vLLM...). */
export class OpenAICompatProvider implements LLMProvider {
  readonly name: string;
  readonly modelId: string;
  private readonly limiter: RateLimiter;
  private readonly fetchImpl: typeof fetch;

  constructor(private readonly o: OpenAICompatOptions) {
    this.name = o.name ?? "openai-compatible";
    this.modelId = o.modelId;
    this.limiter = new RateLimiter(o.minIntervalMs ?? 4000);
    this.fetchImpl = o.fetchImpl ?? fetch;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    return withRetry(async () => {
      await this.limiter.wait();
      const body: Record<string, unknown> = {
        model: this.modelId,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: req.user },
        ],
        temperature: req.temperature,
        max_tokens: req.maxOutputTokens,
      };
      if (req.topP !== null) body.top_p = req.topP;
      if (req.seed !== null) body.seed = req.seed;
      const t0 = Date.now();
      const res = await this.fetchImpl(`${this.o.baseUrl.replace(/\/$/, "")}/chat/completions`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${this.o.apiKey}` },
        body: JSON.stringify(body),
      });
      const text = await res.text();
      if (!res.ok) throw new ProviderError(`HTTP ${res.status}: ${text.slice(0, 400)}`, res.status, res.status === 429 || res.status >= 500);
      const json = JSON.parse(text) as ChatResponse;
      return {
        text: json.choices?.[0]?.message?.content ?? "",
        tokensIn: json.usage?.prompt_tokens ?? 0,
        tokensOut: json.usage?.completion_tokens ?? 0,
        modelId: json.model ?? this.modelId,
        latencyMs: Date.now() - t0,
        raw: json,
      };
    }, this.o.retry);
  }
}
