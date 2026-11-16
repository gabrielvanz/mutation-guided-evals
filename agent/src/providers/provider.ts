import { sleep } from "../util.js";

export interface LLMRequest {
  system: string;
  user: string;
  temperature: number;
  topP: number | null;
  maxOutputTokens: number;
  seed: number | null;
}

export interface LLMResponse {
  text: string;
  tokensIn: number;
  tokensOut: number;
  modelId: string;
  latencyMs: number;
  raw?: unknown;
}

export interface LLMProvider {
  readonly name: string;
  readonly modelId: string;
  generate(req: LLMRequest): Promise<LLMResponse>;
}

export class ProviderError extends Error {
  constructor(
    message: string,
    readonly status: number | null = null,
    readonly retriable = false,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/** Espaça as requisições para respeitar o limite por minuto do tier gratuito. */
export class RateLimiter {
  private next = 0;
  constructor(private readonly minIntervalMs: number) {}
  async wait(): Promise<void> {
    const now = Date.now();
    const at = Math.max(now, this.next);
    this.next = at + this.minIntervalMs;
    if (at > now) await sleep(at - now);
  }
}

export interface RetryOptions {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

export const DEFAULT_RETRY: RetryOptions = { maxRetries: 6, baseDelayMs: 5000, maxDelayMs: 90000 };

/** Executa `fn` com backoff exponencial em erros marcados como retriable (429, 5xx). */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = DEFAULT_RETRY): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      const retriable = e instanceof ProviderError && e.retriable;
      if (!retriable || attempt >= opts.maxRetries) throw e;
      const delay = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** attempt) * (0.75 + Math.random() * 0.5);
      attempt++;
      await sleep(delay);
    }
  }
}
