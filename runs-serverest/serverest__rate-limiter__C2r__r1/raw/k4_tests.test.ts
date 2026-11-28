import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";

describe("rate-limiter exportações e funções", () => {
  it("deve exportar a constante BYTES_POR_HORA", () => {
    expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
  });

  describe("criarOrcamentoDeBytes", () => {
    it("deve retornar msAteLiberar como 0 quando não houver consumo", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 10 });
      const ms = await orcamento.msAteLiberar("chave-1");
      expect(ms).toBe(0);
      expect(orcamento.duracaoMs).toBe(10000);
    });

    it("deve registrar penalidade com tamanho maior que zero", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 50, segundos: 5 });
      orcamento.registrar("chave-2", 10);
      const ms = await orcamento.msAteLiberar("chave-2");
      expect(ms).toBe(0);
    });

    it("não deve registrar penalidade com tamanho menor ou igual a zero", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 50, segundos: 5 });
      orcamento.registrar("chave-3", 0);
      orcamento.registrar("chave-3", -10);
      const ms = await orcamento.msAteLiberar("chave-3");
      expect(ms).toBe(0);
    });
  });

  describe("criarLimitador", () => {
    it("deve permitir a requisição quando nenhum limite for atingido", async () => {
      const limitador = criarLimitador({
        global: { consume: async () => {} } as any,
        porIp: { consume: async () => {} } as any,
        orcamento: {
          msAteLiberar: async () => 0,
          registrar: () => {},
          duracaoMs: 1000
        } as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {
        getHeader: () => 100,
        on: (event: string, cb: Function) => {
          if (event === "close") cb();
        }
      };

      const resultado = await limitador(req, res);
      expect(resultado).toBeNull();
    });

    it("deve barrar requisição quando o orçamento de bytes for excedido", async () => {
      const limitador = criarLimitador({
        orcamento: {
          msAteLiberar: async () => 5000,
          duracaoMs: 1000
        } as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "orcamento-de-bytes",
        ms: 5000
      });
    });

    it("deve lidar com erro ao verificar o orçamento de bytes", async () => {
      const limitador = criarLimitador({
        orcamento: {
          msAteLiberar: async () => {
            throw new Error("Erro de armazenamento");
          },
          duracaoMs: 3600000
        } as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "orcamento-de-bytes",
        ms: 3600000,
        erro: expect.any(Error)
      });
    });

    it("deve ignorar verificação de orçamento de bytes para requisições HEAD", async () => {
      const orcamentoMock = {
        msAteLiberar: async () => 5000,
        duracaoMs: 1000
      };
      const limitador = criarLimitador({
        global: { consume: async () => {} } as any,
        porIp: { consume: async () => {} } as any,
        orcamento: orcamentoMock as any
      });

      const req = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toBeNull();
    });

    it("deve barrar requisição quando o limite global for excedido", async () => {
      const limitador = criarLimitador({
        global: {
          consume: async () => {
            throw new Error("Erro genérico sem msBeforeNext");
          },
          duration: 30
        } as any,
        porIp: { consume: async () => {} } as any,
        orcamento: {
          msAteLiberar: async () => 0,
          duracaoMs: 1000
        } as any
      });

      const req = { method: "GET", path: "/outra-rota", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "requisicoes-global",
        ms: 30000,
        erro: expect.any(Error)
      });
    });
  });

  describe("criarRateLimiter", () => {
    it("deve chamar next() se o limitador retornar null", async () => {
      const limitadorMock = async () => null;
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any });

      let nextCalled = false;
      const next = () => {
        nextCalled = true;
      };

      await rateLimiter({}, {}, next);
      expect(nextCalled).toBe(true);
    });

    it("deve responder com status 429 e cabeçalho Retry-After quando houver bloqueio", async () => {
      const limitadorMock = async () => ({
        tipo: "requisicoes-por-ip",
        ms: 15000
      });
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any });

      const headers: Record<string, string> = {};
      let statusCode = 200;
      let responseBody: any = null;

      const res = {
        set: (key: string, val: string) => {
          headers[key] = val;
        },
        status: (code: number) => {
          statusCode = code;
          return {
            send: (body: any) => {
              responseBody = body;
              return body;
            }
          };
        }
      };

      const req = { ip: "127.0.0.1" };
      const next = () => {};

      await rateLimiter(req, res, next);

      expect(statusCode).toBe(429);
      expect(headers["Retry-After"]).toBe("15");
      expect(responseBody).toEqual({
        message: "Foi detectado comportamento equivalente a teste de carga, não execute teste de carga nesse ambiente. Leia a documentação: https://github.com/ServeRest/ServeRest#teste-de-carga"
      });
    });
  });

  describe("middleware principal exportado", () => {
    it("deve ser uma função", () => {
      expect(typeof rateLimiterModule).toBe("function");
    });
  });
});
