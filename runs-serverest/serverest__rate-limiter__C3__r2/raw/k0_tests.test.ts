import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";

describe("rate-limiter exportações e funções", () => {
  it("deve exportar a constante BYTES_POR_HORA corretamente", () => {
    expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
  });

  describe("criarOrcamentoDeBytes", () => {
    it("deve retornar msAteLiberar igual a zero quando não há consumo excedido", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 10 });
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
      expect(orcamento.duracaoMs).toBe(10000);
    });

    it("deve registrar penalidade para tamanho maior que zero", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 50, segundos: 5 });
      orcamento.registrar("127.0.0.1", 10);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
    });

    it("não deve registrar penalidade para tamanho zero ou negativo", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 50, segundos: 5 });
      orcamento.registrar("127.0.0.1", 0);
      orcamento.registrar("127.0.0.1", -10);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
    });
  });

  describe("criarLimitador", () => {
    it("deve permitir requisição quando nenhum limite for atingido", async () => {
      const limitadorFingido = {
        msAteLiberar: async () => 0,
        duracaoMs: 1000
      };
      const globalMock = {
        consume: async () => {},
        duration: 30
      };
      const porIpMock = {
        consume: async () => {},
        duration: 30
      };

      const limitador = criarLimitador({
        global: globalMock as any,
        porIp: porIpMock as any,
        orcamento: limitadorFingido as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: () => {} };

      const resultado = await limitador(req, res);
      expect(resultado).toBeNull();
    });

    it("deve bloquear requisição quando o orçamento de bytes for excedido", async () => {
      const limitadorFingido = {
        msAteLiberar: async () => 5000,
        duracaoMs: 3600000
      };

      const limitador = criarLimitador({
        global: {} as any,
        porIp: {} as any,
        orcamento: limitadorFingido as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "orcamento-de-bytes",
        ms: 5000
      });
    });

    it("deve lidar com erro ao verificar orçamento de bytes", async () => {
      const limitadorFingido = {
        msAteLiberar: async () => { throw new Error("Erro de armazenamento"); },
        duracaoMs: 3600000
      };

      const limitador = criarLimitador({
        global: {} as any,
        porIp: {} as any,
        orcamento: limitadorFingido as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado?.tipo).toBe("orcamento-de-bytes");
      expect(resultado?.ms).toBe(3600000);
      expect(resultado?.erro).toBeInstanceOf(Error);
    });

    it("deve ignorar verificação de orçamento de bytes em requisições HEAD", async () => {
      let chamado = false;
      const limitadorFingido = {
        msAteLiberar: async () => {
          chamado = true;
          return 5000;
        },
        duracaoMs: 3600000
      };

      const globalMock = {
        consume: async () => {},
        duration: 30
      };
      const porIpMock = {
        consume: async () => {},
        duration: 30
      };

      const limitador = criarLimitador({
        global: globalMock as any,
        porIp: porIpMock as any,
        orcamento: limitadorFingido as any
      });

      const req = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: () => {} };

      const resultado = await limitador(req, res);
      expect(chamado).toBe(false);
      expect(resultado).toBeNull();
    });
  });

  describe("criarRateLimiter", () => {
    it("deve chamar next() quando o limitador retorna null", async () => {
      const limitadorMock = async () => null;
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any });

      let proximoChamado = false;
      const next = () => { proximoChamado = true; };
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      await rateLimiter(req, res, next);
      expect(proximoChamado).toBe(true);
    });

    it("deve retornar 429 e enviar mensagem de erro quando houver bloqueio", async () => {
      const limitadorMock = async () => ({ tipo: "requisicoes-por-ip", ms: 5000 });
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any });

      const headers: Record<string, string> = {};
      let statusEnviado = 0;
      let corpoEnviado: any = null;

      const res = {
        set: (key: string, value: string) => { headers[key] = value; },
        status: (s: number) => {
          statusEnviado = s;
          return {
            send: (body: any) => {
              corpoEnviado = body;
              return body;
            }
          };
        }
      };

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const next = () => {};

      await rateLimiter(req, res, next);

      expect(statusEnviado).toBe(429);
      expect(headers["Retry-After"]).toBe("5");
      expect(corpoEnviado).toHaveProperty("message");
    });
  });

  describe("middleware principal", () => {
    it("deve ignorar o rate limiter no ambiente de testes e chamar next", async () => {
      let proximoChamado = false;
      const next = () => { proximoChamado = true; };
      const res = {
        locals: {
          etapas: {
            ignorar: () => {}
          }
        }
      };
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };

      await rateLimiterModule(req, res, next);
      expect(proximoChamado).toBe(true);
    });
  });
});
