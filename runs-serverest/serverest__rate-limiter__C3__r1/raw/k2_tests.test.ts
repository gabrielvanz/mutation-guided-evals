import { describe, it, expect, vi } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";
import { DOWNLOAD_LIMIT_EXCEEDED, LOAD_TEST_DETECTED, SERVER_BUSY } from "../../src/utils/constants";
const { RateLimiterRes } = require("rate-limiter-flexible");

describe("rate-limiter exports", () => {
  it("should export BYTES_POR_HORA as a number", () => {
    expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
  });

  it("should export criarOrcamentoDeBytes as a function", () => {
    expect(typeof criarOrcamentoDeBytes).toBe("function");
  });

  it("should export criarLimitador as a function", () => {
    expect(typeof criarLimitador).toBe("function");
  });

  it("should export criarRateLimiter as a function", () => {
    expect(typeof criarRateLimiter).toBe("function");
  });

  it("should export a default function middleware", () => {
    expect(typeof rateLimiterModule).toBe("function");
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("should create an orçamento object with default duration and methods", () => {
    const orcamento = criarOrcamentoDeBytes();
    expect(orcamento).toHaveProperty("msAteLiberar");
    expect(orcamento).toHaveProperty("registrar");
    expect(orcamento.duracaoMs).toBe(3600000);
  });

  it("should return 0 msAteLiberar when no consumption exists", async () => {
    const orcamento = criarOrcamentoDeBytes();
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBe(0);
  });

  it("should not fail when registering 0 or negative bytes", async () => {
    const orcamento = criarOrcamentoDeBytes();
    expect(() => orcamento.registrar("127.0.0.1", 0)).not.toThrow();
    expect(() => orcamento.registrar("127.0.0.1", -100)).not.toThrow();
  });

  it("should register positive bytes and check msAteLiberar", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 60 });
    expect(await orcamento.msAteLiberar("127.0.0.1")).toBe(0);
    orcamento.registrar("127.0.0.1", 150);
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBeGreaterThan(0);
  });
});

describe("criarLimitador", () => {
  it("should return null (allow request) when limits are not exceeded", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {} },
      orcamento: { msAteLiberar: async () => 0, duracaoMs: 1000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
  });

  it("should skip api checks for HEAD requests or non-api paths", async () => {
    let checkedOrcamento = false;
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {} },
      orcamento: {
        msAteLiberar: async () => {
          checkedOrcamento = true;
          return 0;
        },
        duracaoMs: 1000
      }
    });

    const req = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
    expect(checkedOrcamento).toBe(false);
  });

  it("should check api paths case-insensitively and match root or slash", async () => {
    let checkedCount = 0;
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {} },
      orcamento: {
        msAteLiberar: async () => {
          checkedCount++;
          return 0;
        },
        duracaoMs: 1000
      }
    });

    const res = { on: () => {} };
    await limitador({ method: "GET", path: "/Usuarios", ip: "127.0.0.1" }, res);
    await limitador({ method: "GET", path: "/usuarios/123", ip: "127.0.0.1" }, res);
    await limitador({ method: "GET", path: "/outrarota", ip: "127.0.0.1" }, res);

    expect(checkedCount).toBe(2);
  });

  it("should return orçamento block if msAteLiberar is greater than 0", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {} },
      orcamento: { msAteLiberar: async () => 4500, duracaoMs: 1000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({ tipo: "orcamento-de-bytes", ms: 4500 });
  });

  it("should return orçamento error block if msAteLiberar throws", async () => {
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {} },
      orcamento: { msAteLiberar: async () => { throw new Error("db error"); }, duracaoMs: 1000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({ tipo: "orcamento-de-bytes", ms: 1000, erro: expect.any(Error) });
  });

  it("should return global block when global limit fails", async () => {
    const limitador = criarLimitador({
      global: {
        consume: async () => { throw new RateLimiterRes(0, 2000); }
      },
      porIp: { consume: async () => {} },
      orcamento: { msAteLiberar: async () => 0, duracaoMs: 1000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({ tipo: "requisicoes-global", ms: 2000 });
  });

  it("should return porIp block when ip limit fails and global passes", async () => {
    let globalCalled = false;
    const limitador = criarLimitador({
      global: {
        consume: async () => { globalCalled = true; }
      },
      porIp: {
        consume: async () => { throw new RateLimiterRes(0, 3000); }
      },
      orcamento: { msAteLiberar: async () => 0, duracaoMs: 1000 }
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { on: () => {} };

    const resultado = await limitador(req, res);
    expect(globalCalled).toBe(true);
    expect(resultado).toEqual({ tipo: "requisicoes-por-ip", ms: 3000 });
  });

  it("should register bytes on close event when Content-Length header is present", async () => {
    let registeredKey = "";
    let registeredSize = 0;
    const orcamento = {
      msAteLiberar: async () => 0,
      duracaoMs: 1000,
      registrar: (key: string, size: number) => {
        registeredKey = key;
        registeredSize = size;
      }
    };
    const limitador = criarLimitador({
      global: { consume: async () => {} },
      porIp: { consume: async () => {} },
      orcamento
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const listeners: Record<string, () => void> = {};
    const res = {
      on: (event: string, cb: () => void) => {
        listeners[event] = cb;
      },
      getHeader: (name: string) => (name === "Content-Length" ? "512" : undefined)
    };

    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
    expect(listeners.close).toBeDefined();

    listeners.close();
    expect(registeredKey).toBe("127.0.0.1");
    expect(registeredSize).toBe(512);
  });
});

describe("criarRateLimiter", () => {
  it("should call next() when limitador returns null", async () => {
    const limitador = async () => null;
    const rateLimiter = criarRateLimiter({ limitador });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should return 429 status and correct message when limitador returns a porIp block", async () => {
    const limitador = async () => ({ tipo: "requisicoes-por-ip", ms: 5000 });
    const rateLimiter = criarRateLimiter({ limitador });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const resHeaders: Record<string, string> = {};
    const res = {
      set: (key: string, value: string) => {
        resHeaders[key] = value;
      },
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalledWith({
      message: LOAD_TEST_DETECTED
    });
    expect(resHeaders["Retry-After"]).toBe("5");
  });

  it("should return 429 status and correct message for global block", async () => {
    const limitador = async () => ({ tipo: "requisicoes-global", ms: 1200 });
    const rateLimiter = criarRateLimiter({ limitador });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const resHeaders: Record<string, string> = {};
    const res = {
      set: (key: string, value: string) => {
        resHeaders[key] = value;
      },
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalledWith({ message: SERVER_BUSY });
    expect(resHeaders["Retry-After"]).toBe("2");
  });

  it("should return 429 status and correct message for orcamento-de-bytes block", async () => {
    const limitador = async () => ({ tipo: "orcamento-de-bytes", ms: 800 });
    const rateLimiter = criarRateLimiter({ limitador });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const resHeaders: Record<string, string> = {};
    const res = {
      set: (key: string, value: string) => {
        resHeaders[key] = value;
      },
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalledWith({ message: DOWNLOAD_LIMIT_EXCEEDED });
    expect(resHeaders["Retry-After"]).toBe("1");
  });

  it("should log error and return 429 when block has an error property", async () => {
    const limitador = async () => ({ tipo: "requisicoes-por-ip", ms: 3000, erro: new Error("fail") });
    const rateLimiter = criarRateLimiter({ limitador });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      set: () => {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(res.status).toHaveBeenCalledWith(429);
  });

  it("should debounce duplicate warning logs for repeated blocks within window", async () => {
    const limitador = async () => ({ tipo: "requisicoes-por-ip", ms: 3000 });
    const rateLimiter = criarRateLimiter({ limitador, maximoDeMarcas: 10 });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      set: () => {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);
    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledTimes(2);
  });

  it("should evict oldest records when maximoDeMarcas is exceeded", async () => {
    const limitador = async (req: any) => ({ tipo: "requisicoes-por-ip", ms: 3000 });
    const rateLimiter = criarRateLimiter({ limitador, maximoDeMarcas: 1 });

    const res = {
      set: () => {},
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter({ method: "GET", path: "/usuarios", ip: "127.0.0.1" }, res, next);
    await rateLimiter({ method: "GET", path: "/usuarios", ip: "127.0.0.2" }, res, next);
    await rateLimiter({ method: "GET", path: "/usuarios", ip: "127.0.0.1" }, res, next);

    expect(res.status).toHaveBeenCalledTimes(3);
  });
});

describe("rateLimiterModule default export", () => {
  it("should bypass rate limiting when running locally or in test environment", async () => {
    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const etapas = { ignorar: vi.fn() };
    const res = { locals: { etapas } };
    const next = vi.fn();

    await rateLimiterModule(req, res, next);
    expect(etapas.ignorar).toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
  });

  it("should invoke optional chaining safely when etapas is undefined", async () => {
    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { locals: {} };
    const next = vi.fn();

    await rateLimiterModule(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
  });
});
