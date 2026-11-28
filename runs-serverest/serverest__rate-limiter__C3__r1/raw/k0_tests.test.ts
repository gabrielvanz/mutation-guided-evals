import { describe, it, expect, vi } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";
import { LOAD_TEST_DETECTED } from "../../src/utils/constants";

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

  it("should return 429 status when limitador returns a block", async () => {
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
});
