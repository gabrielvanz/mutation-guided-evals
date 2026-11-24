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
    /** Espera mínima pedida pelo servidor (RetryInfo / "retry in Ns"), em ms. */
    readonly retryAfterMs: number | null = null,
  ) {
    super(message);
    this.name = "ProviderError";
  }
}

/**
 * Extrai do corpo de erro do Google o tempo de espera sugerido pelo servidor:
 * `error.details[].retryDelay` (google.rpc.RetryInfo, ex.: "23s" ou "0.5s") ou o texto "Please retry in 23.4s".
 */
export function parseRetryDelayMs(body: string): number | null {
  try {
    const details = (JSON.parse(body) as { error?: { details?: { retryDelay?: unknown }[] } }).error?.details ?? [];
    for (const d of details) {
      const m = typeof d.retryDelay === "string" ? /^([0-9]+(?:\.[0-9]+)?)s$/.exec(d.retryDelay) : null;
      if (m) return Math.round(Number(m[1]) * 1000);
    }
  } catch {
    /* corpo não é JSON: tenta o texto */
  }
  const t = /retry in ([0-9]+(?:\.[0-9]+)?)s/i.exec(body);
  return t ? Math.round(Number(t[1]) * 1000) : null;
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
  /** Teto para a espera pedida pelo servidor (padrão 5 min). */
  maxRetryAfterMs?: number;
}

// 10 retentativas: 5, 10, 20, 40, 80 e 5×120 s ≈ 12 min por chamada. Picos de "high demand" (503) do Google costumam
// durar mais que os ~4 min do ajuste anterior (6 retentativas, teto de 90 s).
export const DEFAULT_RETRY: RetryOptions = { maxRetries: 10, baseDelayMs: 5000, maxDelayMs: 120000, maxRetryAfterMs: 300000 };

/**
 * Executa `fn` com backoff exponencial em erros marcados como retriable (429, 5xx, rede).
 * Se o servidor indicou quanto esperar (retryAfterMs), espera pelo menos isso.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = DEFAULT_RETRY): Promise<T> {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (e) {
      const retriable = e instanceof ProviderError && e.retriable;
      if (!retriable || attempt >= opts.maxRetries) throw e;
      const backoff = Math.min(opts.maxDelayMs, opts.baseDelayMs * 2 ** attempt) * (0.75 + Math.random() * 0.5);
      const hinted = e.retryAfterMs != null ? Math.min(e.retryAfterMs, opts.maxRetryAfterMs ?? 300000) : 0;
      attempt++;
      await sleep(Math.max(backoff, hinted));
    }
  }
}
