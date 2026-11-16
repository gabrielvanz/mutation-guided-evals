import type { LLMProvider, LLMRequest, LLMResponse } from "./provider.js";

export type MockResponder = (req: LLMRequest, callIndex: number) => string | { text: string; tokensIn?: number; tokensOut?: number };

/** Provedor determinístico para testes e dry-runs: nunca acessa a rede. */
export class MockProvider implements LLMProvider {
  readonly name = "mock";
  readonly modelId: string;
  readonly calls: LLMRequest[] = [];

  constructor(
    private readonly responder: MockResponder,
    modelId = "mock-1",
  ) {
    this.modelId = modelId;
  }

  async generate(req: LLMRequest): Promise<LLMResponse> {
    const idx = this.calls.length;
    this.calls.push(req);
    const r = this.responder(req, idx);
    const text = typeof r === "string" ? r : r.text;
    return {
      text,
      tokensIn: typeof r === "string" ? Math.ceil((req.system.length + req.user.length) / 4) : (r.tokensIn ?? Math.ceil((req.system.length + req.user.length) / 4)),
      tokensOut: typeof r === "string" ? Math.ceil(text.length / 4) : (r.tokensOut ?? Math.ceil(text.length / 4)),
      modelId: this.modelId,
      latencyMs: 1,
    };
  }
}
