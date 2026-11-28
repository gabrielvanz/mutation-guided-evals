import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";

describe("rate-limiter exportações principais", () => {
  it("deve exportar BYTES_POR_HORA com o valor correto", () => {
    expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
  });

  it("deve exportar criarLimitador, criarOrcamentoDeBytes e criarRateLimiter como funções", () => {
    expect(typeof criarLimitador).toBe("function");
    expect(typeof criarOrcamentoDeBytes).toBe("function");
    expect(typeof criarRateLimiter).toBe("function");
  });

  it("deve exportar uma função middleware por padrão", () => {
    expect(typeof rateLimiterModule).toBe("function");
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("deve retornar 0 para msAteLiberar quando não há consumo", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 10 });
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBe(0);
    expect(orcamento.duracaoMs).toBe(10000);
  });

  it("deve registrar penalidade sem lançar erro quando tamanho é positivo", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 10 });
    expect(() => orcamento.registrar("127.0.0.1", 100)).not.toThrow();
  });

  it("não deve registrar penalidade quando tamanho é zero ou negativo", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 10 });
    expect(() => orcamento.registrar("127.0.0.1", 0)).not.toThrow();
    expect(() => orcamento.registrar("127.0.0.1", -50)).not.toThrow();
  });
});

describe("criarLimitador", () => {
  it("deve permitir requisição quando nenhum limite é excedido", async () => {
    const mockGlobal = {
      consume: async () => {}
    };
    const mockPorIp = {
      consume: async () => {}
    };
    const mockOrcamento = {
      msAteLiberar: async () => 0,
      duracaoMs: 3600000
    };

    const verificar = criarLimitador({
      global: mockGlobal as any,
      porIp: mockPorIp as any,
      orcamento: mockOrcamento as any
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await verificar(req, res as any);
    expect(resultado).toBeNull();
  });

  it("deve ignorar verificação de orçamento para requisições HEAD", async () => {
    let orcamentoChamado = false;
    const mockOrcamento = {
      msAteLiberar: async () => {
        orcamentoChamado = true;
        return 1000;
      },
      duracaoMs: 3600000
    };
    const mockGlobal = { consume: async () => {} };
    const mockPorIp = { consume: async () => {} };

    const verificar = criarLimitador({
      global: mockGlobal as any,
      porIp: mockPorIp as any,
      orcamento: mockOrcamento as any
    });

    const req = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await verificar(req, res as any);
    expect(resultado).toBeNull();
    expect(orcamentoChamado).toBe(false);
  });
});

describe("criarRateLimiter", () => {
  it("deve chamar next() quando o limitador não retorna bloqueio", async () => {
    const limitador = async () => null;
    const middleware = criarRateLimiter({ limitador: limitador as any });

    let nextChamado = false;
    const req = {};
    const res = {};
    const next = () => {
      nextChamado = true;
    };

    await middleware(req, res, next);
    expect(nextChamado).toBe(true);
  });

  it("deve retornar 429 e mensagem de erro quando há bloqueio", async () => {
    const limitador = async () => ({ tipo: "requisicoes-por-ip", ms: 5000 });
    const middleware = criarRateLimiter({ limitador: limitador as any });

    let statusEnviado = 0;
    let corpoEnviado: any = null;
    let headersDefinidos: Record<string, string> = {};

    const req = { ip: "127.0.0.1" };
    const res = {
      set: (key: string, val: string) => {
        headersDefinidos[key] = val;
      },
      status: (st: number) => {
        statusEnviado = st;
        return {
          send: (body: any) => {
            corpoEnviado = body;
            return body;
          }
        };
      }
    };
    const next = () => {};

    await middleware(req, res as any, next);

    expect(statusEnviado).toBe(429);
    expect(headersDefinidos["Retry-After"]).toBe("5");
    expect(corpoEnviado.message).toContain("Foi detectado comportamento equivalente a teste de carga");
  });

  it("deve retornar 429 com mensagem de download excedido quando tipo é orcamento-de-bytes", async () => {
    const limitador = async () => ({ tipo: "orcamento-de-bytes", ms: 10000 });
    const middleware = criarRateLimiter({ limitador: limitador as any });

    let statusEnviado = 0;
    let corpoEnviado: any = null;

    const req = { ip: "127.0.0.1" };
    const res = {
      set: () => {},
      status: (st: number) => {
        statusEnviado = st;
        return {
          send: (body: any) => {
            corpoEnviado = body;
            return body;
          }
        };
      }
    };
    const next = () => {};

    await middleware(req, res as any, next);

    expect(statusEnviado).toBe(429);
    expect(corpoEnviado.message).toContain("Limite de dados baixados da API atingido");
  });
});
