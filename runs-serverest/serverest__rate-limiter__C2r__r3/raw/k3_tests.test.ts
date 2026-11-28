import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";

describe("rate-limiter exports", () => {
  it("should export BYTES_POR_HORA as a number", () => {
    expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("should create an orçamento with default values and allow registering and checking consumption", async () => {
    const orcamento = criarOrcamentoDeBytes();
    expect(orcamento.duracaoMs).toBe(3600 * 1000);

    const msInicial = await orcamento.msAteLiberar("127.0.0.1");
    expect(msInicial).toBe(0);

    orcamento.registrar("127.0.0.1", 100);
    const msAposRegistro = await orcamento.msAteLiberar("127.0.0.1");
    expect(msAposRegistro).toBe(0);
  });

  it("should ignore zero or negative sizes when registering", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 10, segundos: 60 });
    orcamento.registrar("127.0.0.1", 0);
    orcamento.registrar("127.0.0.1", -5);
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBe(0);
  });
});

describe("criarLimitador", () => {
  it("should return null when limits are not exceeded", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} } as any,
      porIp: { consume: async () => {} } as any,
      orcamento: {
        msAteLiberar: async () => 0,
        duracaoMs: 1000
      } as any
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
  });

  it("should block when byte budget is exceeded", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} } as any,
      porIp: { consume: async () => {} } as any,
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

  it("should handle budget storage error", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} } as any,
      porIp: { consume: async () => {} } as any,
      orcamento: {
        msAteLiberar: async () => {
          throw new Error("Erro storage");
        },
        duracaoMs: 1000
      } as any
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({
      tipo: "orcamento-de-bytes",
      ms: 1000,
      erro: expect.any(Error)
    });
  });
});

describe("criarRateLimiter", () => {
  it("should call next() when limitador returns null", async () => {
    const limitador = async () => null;
    const rateLimiter = criarRateLimiter({ limitador });

    const req = {};
    const res = {};
    let nextChamado = false;
    const next = () => {
      nextChamado = true;
    };

    await rateLimiter(req, res, next);
    expect(nextChamado).toBe(true);
  });

  it("should respond with 429 when request is blocked", async () => {
    const limitador = async () => ({
      tipo: "requisicoes-por-ip",
      ms: 5000
    });
    const rateLimiter = criarRateLimiter({ limitador });

    const req = { ip: "127.0.0.1" };
    const headers: Record<string, string> = {};
    let statusEnviado = 0;
    let corpoEnviado: any = null;

    const res = {
      set: (nome: string, valor: string) => {
        headers[nome] = valor;
      },
      status: (codigo: number) => {
        statusEnviado = codigo;
        return res;
      },
      send: (corpo: any) => {
        corpoEnviado = corpo;
        return res;
      }
    };

    const next = () => {};

    await rateLimiter(req, res, next);
    expect(statusEnviado).toBe(429);
    expect(headers["Retry-After"]).toBe("5");
    expect(corpoEnviado).toEqual({ message: "Foi detectado comportamento equivalente a teste de carga, não execute teste de carga nesse ambiente. Leia a documentação: https://github.com/ServeRest/ServeRest#teste-de-carga" });
  });
});

describe("default exported middleware", () => {
  it("should bypass rate limiting in test environment", async () => {
    const req = {};
    let etapasIgnoradas = false;
    let nextChamado = false;

    const res = {
      locals: {
        etapas: {
          ignorar: () => {
            etapasIgnoradas = true;
          }
        }
      }
    };

    const next = () => {
      nextChamado = true;
    };

    await rateLimiterModule(req, res, next);
    expect(etapasIgnoradas).toBe(true);
    expect(nextChamado).toBe(true);
  });
});
