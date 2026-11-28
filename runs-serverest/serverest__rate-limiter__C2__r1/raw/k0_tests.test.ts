import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";

describe("rate-limiter", () => {
  describe("BYTES_POR_HORA", () => {
    it("should export correct default bytes per hour", () => {
      expect(BYTES_POR_HORA).toBe(250 * 1024 * 1024);
    });
  });

  describe("criarOrcamentoDeBytes", () => {
    it("should have correct initial state and duration", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 60 });
      expect(orcamento.duracaoMs).toBe(60000);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
    });

    it("should register penalty and block when limit is exceeded", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 10, segundos: 10 });
      orcamento.registrar("127.0.0.1", 15);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBeGreaterThan(0);
    });

    it("should not penalize when size is zero or negative", async () => {
      const orcamento = criarOrcamentoDeBytes({ bytes: 10, segundos: 10 });
      orcamento.registrar("127.0.0.1", 0);
      orcamento.registrar("127.0.0.1", -5);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
    });
  });

  describe("criarLimitador", () => {
    it("should allow request when no limits are hit", async () => {
      const mockGlobal = {
        consume: async () => {}
      };
      const mockPorIp = {
        consume: async () => {}
      };
      const mockOrcamento = {
        msAteLiberar: async () => 0,
        duracaoMs: 1000
      };

      const verificar = criarLimitador({
        global: mockGlobal as any,
        porIp: mockPorIp as any,
        orcamento: mockOrcamento as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: () => {} };

      const resultado = await verificar(req as any, res as any);
      expect(resultado).toBeNull();
    });

    it("should block request when byte quota is exceeded", async () => {
      const mockOrcamento = {
        msAteLiberar: async () => 5000,
        duracaoMs: 1000
      };

      const verificar = criarLimitador({
        global: {} as any,
        porIp: {} as any,
        orcamento: mockOrcamento as any
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await verificar(req as any, res as any);
      expect(resultado).toEqual({ tipo: "orcamento-de-bytes", ms: 5000 });
    });
  });

  describe("criarRateLimiter", () => {
    it("should call next when limitador returns null", async () => {
      const mockLimitador = async () => null;
      const rateLimiter = criarRateLimiter({ limitador: mockLimitador as any });

      let nextCalled = false;
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};
      const next = () => {
        nextCalled = true;
      };

      await rateLimiter(req as any, res as any, next);
      expect(nextCalled).toBe(true);
    });

    it("should return 429 when limit is exceeded", async () => {
      const mockLimitador = async () => ({ tipo: "requisicoes-por-ip", ms: 10000 });
      const rateLimiter = criarRateLimiter({ limitador: mockLimitador as any });

      const headers: Record<string, string> = {};
      let statusCode = 200;
      let sentBody: any = null;

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {
        set: (key: string, val: string) => {
          headers[key] = val;
        },
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        send: (body: any) => {
          sentBody = body;
          return res;
        }
      };
      const next = () => {};

      await rateLimiter(req as any, res as any, next);

      expect(statusCode).toBe(429);
      expect(headers["Retry-After"]).toBe("10");
      expect(sentBody).toHaveProperty("message");
    });
  });

  describe("default export (middleware wrapper)", () => {
    it("should bypass rate limiting in local/test environment", async () => {
      let nextCalled = false;
      let ignoreCalled = false;

      const req = {};
      const res = {
        locals: {
          etapas: {
            ignorar: () => {
              ignoreCalled = true;
            }
          }
        }
      };
      const next = () => {
        nextCalled = true;
      };

      await rateLimiterModule(req as any, res as any, next);

      expect(nextCalled).toBe(true);
      expect(ignoreCalled).toBe(true);
    });
  });
});
