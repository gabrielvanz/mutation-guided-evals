import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";
import { DOWNLOAD_LIMIT_EXCEEDED, LOAD_TEST_DETECTED, SERVER_BUSY } from "../../src/utils/constants";
const { RateLimiterRes } = require("rate-limiter-flexible");

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

    it("deve usar valores padrão corretos quando omitidos", async () => {
      const orcamento = criarOrcamentoDeBytes();
      expect(orcamento.duracaoMs).toBe(3600000);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
    });

    it("deve registrar penalidade para tamanho maior que zero e ignorar tamanho menor ou igual a zero", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 5, segundos: 5 });
      orcamento.registrar("127.0.0.1", 0);
      orcamento.registrar("127.0.0.1", -10);
      let ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);

      orcamento.registrar("127.0.0.1", 6);
      ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBeGreaterThan(0);
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

    it("deve registrar o evento 'close' para contagem de bytes quando a rota for da API (case-insensitive)", async () => {
      let registeredKey = "";
      let registeredSize = 0;
      const orcamentoMock = {
        msAteLiberar: async () => 0,
        registrar: (chave: string, tamanho: number) => {
          registeredKey = chave;
          registeredSize = tamanho;
        },
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
        orcamento: orcamentoMock as any
      });

      const req = { method: "GET", path: "/Usuarios/123", ip: "127.0.0.1" };
      const listeners: Record<string, () => void> = {};
      const res = {
        on: (event: string, cb: () => void) => {
          listeners[event] = cb;
        },
        getHeader: (name: string) => (name === "Content-Length" ? "150" : null)
      };

      const resultado = await limitador(req, res);
      expect(resultado).toBeNull();

      expect(listeners["close"]).toBeDefined();
      listeners["close"]();

      expect(registeredKey).toBe("127.0.0.1");
      expect(registeredSize).toBe(150);
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

    it("deve barrar requisição pelo limite global quando consumido", async () => {
      const orcamentoMock = {
        msAteLiberar: async () => 0,
        duracaoMs: 3600000
      };
      const resGlobal = new RateLimiterRes();
      resGlobal.msBeforeNext = 12000;
      const globalMock = {
        consume: async () => { throw resGlobal; },
        duration: 30
      };
      const porIpMock = {
        consume: async () => { throw new Error("Não deve chamar por IP se global falhar"); },
        duration: 30
      };

      const limitador = criarLimitador({
        global: globalMock as any,
        porIp: porIpMock as any,
        orcamento: orcamentoMock as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: () => {} };

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "requisicoes-global",
        ms: 12000
      });
    });

    it("deve barrar requisição pelo limite por IP quando o global passar mas o IP falhar", async () => {
      const orcamentoMock = {
        msAteLiberar: async () => 0,
        duracaoMs: 3600000
      };
      const globalMock = {
        consume: async () => {},
        duration: 30
      };
      const resIp = new RateLimiterRes();
      resIp.msBeforeNext = 8000;
      const porIpMock = {
        consume: async () => { throw resIp; },
        duration: 30
      };

      const limitador = criarLimitador({
        global: globalMock as any,
        porIp: porIpMock as any,
        orcamento: orcamentoMock as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: () => {} };

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "requisicoes-por-ip",
        ms: 8000
      });
    });

    it("deve tratar erro genérico de armazenamento no consumo como falha fechada do limite", async () => {
      const orcamentoMock = {
        msAteLiberar: async () => 0,
        duracaoMs: 3600000
      };
      const globalMock = {
        consume: async () => { throw new Error("Erro interno global"); },
        duration: 30
      };
      const porIpMock = {
        consume: async () => {},
        duration: 30
      };

      const limitador = criarLimitador({
        global: globalMock as any,
        porIp: porIpMock as any,
        orcamento: orcamentoMock as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: () => {} };

      const resultado = await limitador(req, res);
      expect(resultado).toEqual({
        tipo: "requisicoes-global",
        ms: 30000,
        erro: expect.any(Error)
      });
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

    it("deve retornar 429 e enviar mensagem de erro correta para requisicoes-por-ip", async () => {
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
      expect(corpoEnviado).toEqual({ message: LOAD_TEST_DETECTED });
    });

    it("deve retornar 429 e enviar mensagem de erro correta para orcamento-de-bytes", async () => {
      const limitadorMock = async () => ({ tipo: "orcamento-de-bytes", ms: 3000 });
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
      expect(corpoEnviado).toEqual({ message: DOWNLOAD_LIMIT_EXCEEDED });
    });

    it("deve retornar 429 e enviar mensagem de erro correta para requisicoes-global", async () => {
      const limitadorMock = async () => ({ tipo: "requisicoes-global", ms: 3000 });
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
      expect(corpoEnviado).toEqual({ message: SERVER_BUSY });
    });

    it("deve lidar com bloqueio devido a erro de armazenamento", async () => {
      const limitadorMock = async () => ({ tipo: "requisicoes-por-ip", ms: 3000, erro: new Error("Storage down") });
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any, maximoDeMarcas: 5 });

      let statusEnviado = 0;
      let corpoEnviado: any = null;

      const res = {
        set: () => {},
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
      expect(corpoEnviado).toEqual({ message: LOAD_TEST_DETECTED });
    });

    it("deve respeitar folga de janela e reutilizar marca de bloqueio se chamada repetida imediatamente", async () => {
      let chamadaCount = 0;
      const limitadorMock = async () => {
        chamadaCount++;
        return { tipo: "requisicoes-por-ip", ms: 10000 };
      };
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any, maximoDeMarcas: 5 });

      let statusEnviado = 0;
      const res = {
        set: () => {},
        status: (s: number) => {
          statusEnviado = s;
          return { send: () => {} };
        }
      };
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const next = () => {};

      await rateLimiter(req, res, next);
      await rateLimiter(req, res, next);

      expect(statusEnviado).toBe(429);
      expect(chamadaCount).toBe(2);
    });

    it("deve limpar marcas expiradas e respeitar limite máximo de marcas no mapa", async () => {
      let chamadaCount = 0;
      const limitadorMock = async () => {
        chamadaCount++;
        return { tipo: "requisicoes-por-ip", ms: 10 };
      };
      const rateLimiter = criarRateLimiter({ limitador: limitadorMock as any, maximoDeMarcas: 1 });

      let statusEnviado = 0;
      const res = {
        set: () => {},
        status: (s: number) => {
          statusEnviado = s;
          return { send: () => {} };
        }
      };
      const next = () => {};

      const req1 = { method: "GET", path: "/usuarios", ip: "1.1.1.1" };
      const req2 = { method: "GET", path: "/usuarios", ip: "2.2.2.2" };

      await rateLimiter(req1, res, next);
      await rateLimiter(req2, res, next);

      const req1Again = { method: "GET", path: "/usuarios", ip: "1.1.1.1" };
      await rateLimiter(req1Again, res, next);
      expect(chamadaCount).toBe(3);
      expect(statusEnviado).toBe(429);
    });
  });

  describe("middleware principal", () => {
    it("deve ignorar o rate limiter no ambiente de testes e chamar next com suporte seguro a etapas", async () => {
      let proximoChamado = false;
      const next = () => { proximoChamado = true; };
      let ignorarChamado = false;
      const res = {
        locals: {
          etapas: {
            ignorar: () => { ignorarChamado = true; }
          }
        }
      };
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };

      await rateLimiterModule(req, res, next);
      expect(proximoChamado).toBe(true);
      expect(ignorarChamado).toBe(true);
    });

    it("deve lidar com res.locals.etapas sem a função ignorar de forma segura", async () => {
      let proximoChamado = false;
      const next = () => { proximoChamado = true; };
      const res = {
        locals: {
          etapas: { ignorar: () => {} }
        }
      };
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };

      await rateLimiterModule(req, res, next);
      expect(proximoChamado).toBe(true);
    });
  });
});
