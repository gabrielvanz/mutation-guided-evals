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

  it("deve exportar uma função middleware padrão", () => {
    expect(typeof rateLimiterModule).toBe("function");
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("deve retornar 0 ms para liberar quando não há consumo", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 10 });
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBe(0);
  });

  it("deve registrar bytes e respeitar duracaoMs", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 5 });
    expect(orcamento.duracaoMs).toBe(5000);

    orcamento.registrar("127.0.0.1", 50);
    const msAntes = await orcamento.msAteLiberar("127.0.0.1");
    expect(msAntes).toBe(0);

    orcamento.registrar("127.0.0.1", 60);
    const msDepois = await orcamento.msAteLiberar("127.0.0.1");
    expect(msDepois).toBeGreaterThan(0);
  });

  it("não deve registrar penalidade para tamanhos menores ou iguais a zero", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 10 });
    orcamento.registrar("127.0.0.1", 0);
    orcamento.registrar("127.0.0.1", -50);
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBe(0);
  });
});

describe("criarLimitador", () => {
  it("deve retornar null quando nenhum limite for atingido", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {}, duration: 30 },
      orcamento: { msAteLiberar: async () => 0, duracaoMs: 3600000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      getHeader: () => null,
      on: (event: string, cb: () => void) => {}
    };

    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
  });

  it("deve barrar quando o orçamento de bytes for excedido", async () => {
    const limitador = criarLimitador({
      orcamento: { msAteLiberar: async () => 1500, duracaoMs: 3600000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({ tipo: "orcamento-de-bytes", ms: 1500 });
  });

  it("deve retornar erro no orçamento se msAteLiberar lançar exceção", async () => {
    const erroArmazenamento = new Error("Falha no redis");
    const limitador = criarLimitador({
      orcamento: {
        msAteLiberar: async () => {
          throw erroArmazenamento;
        },
        duracaoMs: 3600000
      }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({
      tipo: "orcamento-de-bytes",
      ms: 3600000,
      erro: erroArmazenamento
    });
  });

  it("deve ignorar verificação de orçamento para requisições HEAD ou fora da API", async () => {
    let orcamentoChamado = false;
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {}, duration: 30 },
      orcamento: {
        msAteLiberar: async () => {
          orcamentoChamado = true;
          return 1500;
        },
        duracaoMs: 3600000
      }
    });

    const reqHead = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
    const reqForaApi = { method: "GET", path: "/documentacao", ip: "127.0.0.1" };
    const res = { getHeader: () => null, on: () => {} };

    await limitador(reqHead, res);
    expect(orcamentoChamado).toBe(false);

    await limitador(reqForaApi, res);
    expect(orcamentoChamado).toBe(false);
  });

  it("deve barrar pelo limite global ou por ip quando consumidos", async () => {
    const { RateLimiterRes } = require("rate-limiter-flexible");
    const resObj = new RateLimiterRes();
    resObj.msBeforeNext = 5000;

    const limitadorGlobal = criarLimitador({
      global: {
        consume: async () => {
          throw resObj;
        }
      },
      porIp: { consume: async () => {} },
      orcamento: { msAteLiberar: async () => 0 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const resGlobal = await limitadorGlobal(req, res);
    expect(resGlobal).toEqual({ tipo: "requisicoes-global", ms: 5000 });
  });
});

describe("criarRateLimiter", () => {
  it("deve chamar next() se o limitador retornar null", async () => {
    const limitador = async () => null;
    const rateLimiter = criarRateLimiter({ limitador });

    const req = {};
    let nextChamado = false;
    const next = () => {
      nextChamado = true;
    };

    await rateLimiter(req, {}, next);
    expect(nextChamado).toBe(true);
  });

  it("deve retornar status 429 e cabeçalho Retry-After quando houver bloqueio", async () => {
    const limitador = async () => ({ tipo: "requisicoes-por-ip", ms: 12000 });
    const rateLimiter = criarRateLimiter({ limitador });

    const headers: Record<string, string> = {};
    let statusEnviado = 0;
    let corpoEnviado: any = null;

    const req = { ip: "127.0.0.1" };
    const res = {
      set: (chave: string, valor: string) => {
        headers[chave] = valor;
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

    await rateLimiter(req, res, () => {});

    expect(statusEnviado).toBe(429);
    expect(headers["Retry-After"]).toBe("12");
    expect(corpoEnviado).toHaveProperty("message");
  });

  it("deve tratar bloqueio com erro de armazenamento retornando 429", async () => {
    const limitador = async () => ({
      tipo: "requisicoes-global",
      ms: 3000,
      erro: new Error("Erro interno")
    });
    const rateLimiter = criarRateLimiter({ limitador });

    const headers: Record<string, string> = {};
    let statusEnviado = 0;

    const req = { ip: "127.0.0.1" };
    const res = {
      set: (chave: string, valor: string) => {
        headers[chave] = valor;
      },
      status: (st: number) => {
        statusEnviado = st;
        return {
          send: (body: any) => body
        };
      }
    };

    await rateLimiter(req, res, () => {});

    expect(statusEnviado).toBe(429);
    expect(headers["Retry-After"]).toBe("3");
  });
});
