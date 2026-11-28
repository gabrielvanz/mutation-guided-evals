import { describe, it, expect, vi } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";

describe("rate-limiter exported module", () => {
  it("should bypass rate limiter when running locally or in tests", async () => {
    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const ignoreMock = vi.fn();
    const res = { locals: { etapas: { ignorar: ignoreMock } } };
    const next = vi.fn();

    await rateLimiterModule(req, res, next);

    expect(ignoreMock).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("should return 0 ms before release when no bytes consumed", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 60 });
    const ms = await orcamento.msAteLiberar("127.0.0.1");
    expect(ms).toBe(0);
  });

  it("should have correct duracaoMs", () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 60 });
    expect(orcamento.duracaoMs).toBe(60000);
  });

  it("should register positive sizes without throwing", () => {
    const orcamento = criarOrcamentoDeBytes();
    expect(() => orcamento.registrar("127.0.0.1", 500)).not.toThrow();
  });

  it("should ignore zero or negative sizes", () => {
    const orcamento = criarOrcamentoDeBytes();
    expect(() => orcamento.registrar("127.0.0.1", 0)).not.toThrow();
    expect(() => orcamento.registrar("127.0.0.1", -100)).not.toThrow();
  });
});

describe("criarLimitador", () => {
  it("should allow request when no limits are hit", async () => {
    const mockGlobal = { consume: vi.fn().mockResolvedValue(true) };
    const mockPorIp = { consume: vi.fn().mockResolvedValue(true) };
    const mockOrcamento = {
      msAteLiberar: vi.fn().mockResolvedValue(0),
      registrar: vi.fn(),
      duracaoMs: 3600000
    };

    const verificar = criarLimitador({
      global: mockGlobal,
      porIp: mockPorIp,
      orcamento: mockOrcamento
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { getHeader: vi.fn().mockReturnValue("100"), on: vi.fn() };

    const bloqueio = await verificar(req, res);
    expect(bloqueio).toBeNull();
  });

  it("should return block info when global limit is exceeded", async () => {
    const { RateLimiterRes } = require('rate-limiter-flexible');
    const resObj = new RateLimiterRes();
    resObj.msBeforeNext = 5000;
    const mockGlobal = {
      consume: vi.fn().mockRejectedValue(resObj)
    };
    const mockPorIp = { consume: vi.fn().mockResolvedValue(true) };
    const mockOrcamento = {
      msAteLiberar: vi.fn().mockResolvedValue(0),
      duracaoMs: 3600000
    };

    const verificar = criarLimitador({
      global: mockGlobal,
      porIp: mockPorIp,
      orcamento: mockOrcamento
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const bloqueio = await verificar(req, res);
    expect(bloqueio).toEqual({
      tipo: "requisicoes-global",
      ms: 5000
    });
  });

  it("should return block info when IP limit is exceeded", async () => {
    const { RateLimiterRes } = require('rate-limiter-flexible');
    const resObj = new RateLimiterRes();
    resObj.msBeforeNext = 3000;
    const mockGlobal = { consume: vi.fn().mockResolvedValue(true) };
    const mockPorIp = {
      consume: vi.fn().mockRejectedValue(resObj)
    };
    const mockOrcamento = {
      msAteLiberar: vi.fn().mockResolvedValue(0),
      duracaoMs: 3600000
    };

    const verificar = criarLimitador({
      global: mockGlobal,
      porIp: mockPorIp,
      orcamento: mockOrcamento
    });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const bloqueio = await verificar(req, res);
    expect(bloqueio).toEqual({
      tipo: "requisicoes-por-ip",
      ms: 3000
    });
  });

  it("should skip API checks for HEAD requests or non-API routes", async () => {
    const mockGlobal = { consume: vi.fn().mockResolvedValue(true) };
    const mockPorIp = { consume: vi.fn().mockResolvedValue(true) };
    const mockOrcamento = {
      msAteLiberar: vi.fn().mockRejectedValue(new Error("Storage error")),
      duracaoMs: 3600000
    };

    const verificar = criarLimitador({
      global: mockGlobal,
      porIp: mockPorIp,
      orcamento: mockOrcamento
    });

    const reqHead = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    const bloqueioHead = await verificar(reqHead, res);
    expect(bloqueioHead).toBeNull();
  });
});

describe("criarRateLimiter", () => {
  it("should call next() when limitador returns null", async () => {
    const limitador = vi.fn().mockResolvedValue(null);
    const rateLimiter = criarRateLimiter({ limitador, maximoDeMarcas: 10 });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("should return 429 status and proper message when blocked", async () => {
    const limitador = vi.fn().mockResolvedValue({
      tipo: "requisicoes-por-ip",
      ms: 15000
    });
    const rateLimiter = criarRateLimiter({ limitador, maximoDeMarcas: 10 });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const sendMock = vi.fn();
    const statusMock = vi.fn().mockReturnValue({ send: sendMock });
    const setMock = vi.fn();
    const res = {
      status: statusMock,
      set: setMock
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);

    expect(setMock).toHaveBeenCalledWith("Retry-After", "15");
    expect(statusMock).toHaveBeenCalledWith(429);
    expect(sendMock).toHaveBeenCalledWith({
      message: "Foi detectado comportamento equivalente a teste de carga, não execute teste de carga nesse ambiente. Leia a documentação: https://github.com/ServeRest/ServeRest#teste-de-carga"
    });
    expect(next).not.toHaveBeenCalled();
  });
});

describe("BYTES_POR_HORA constant", () => {
  it("should export BYTES_POR_HORA as a number", () => {
    expect(typeof BYTES_POR_HORA).toBe("number");
    expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
  });
});
