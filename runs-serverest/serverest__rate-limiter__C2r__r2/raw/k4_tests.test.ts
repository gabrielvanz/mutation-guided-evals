import { describe, it, expect, vi } from "vitest";
import mod from "../../src/middlewares/rate-limiter";

describe("rate-limiter", () => {
  describe("criarOrcamentoDeBytes", () => {
    it("should allow getting ms before release and registering bytes", async () => {
      const orcamento = mod.criarOrcamentoDeBytes({ bytes: 100, segundos: 10 });
      expect(orcamento.duracaoMs).toBe(10000);

      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);

      orcamento.registrar("127.0.0.1", 50);
      const msAposRegistrar = await orcamento.msAteLiberar("127.0.0.1");
      expect(msAposRegistrar).toBe(0);

      orcamento.registrar("127.0.0.1", 60);
      const msAposExceder = await orcamento.msAteLiberar("127.0.0.1");
      expect(typeof msAposExceder).toBe("number");
      expect(msAposExceder).toBeGreaterThan(0);
    });

    it("should ignore zero or negative sizes when registering", async () => {
      const orcamento = mod.criarOrcamentoDeBytes({ bytes: 10, segundos: 1 });
      orcamento.registrar("127.0.0.1", 0);
      orcamento.registrar("127.0.0.1", -5);
      const ms = await orcamento.msAteLiberar("127.0.0.1");
      expect(ms).toBe(0);
    });
  });

  describe("criarLimitador", () => {
    it("should return null when request is within limits", async () => {
      const limitador = mod.criarLimitador();
      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = { on: vi.fn(), getHeader: vi.fn().mockReturnValue("100") };

      const resultado = await limitador(req, res);
      expect(resultado).toBeNull();
    });

    it("should block when global limit is exceeded", async () => {
      const globalMock = {
        consume: vi.fn().mockRejectedValue(new Error("Storage error")),
        duration: 30
      };
      const porIpMock = {
        consume: vi.fn().mockResolvedValue({})
      };
      const orcamentoMock = {
        msAteLiberar: vi.fn().mockResolvedValue(0),
        duracaoMs: 3600000
      };

      const limitador = mod.criarLimitador({
        global: globalMock,
        porIp: porIpMock,
        orcamento: orcamentoMock
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toMatchObject({
        tipo: "requisicoes-global",
        ms: 30000
      });
    });

    it("should block when IP limit is exceeded", async () => {
      const globalMock = {
        consume: vi.fn().mockResolvedValue({})
      };
      const porIpMock = {
        consume: vi.fn().mockRejectedValue(new Error("Storage error")),
        duration: 30
      };
      const orcamentoMock = {
        msAteLiberar: vi.fn().mockResolvedValue(0),
        duracaoMs: 3600000
      };

      const limitador = mod.criarLimitador({
        global: globalMock,
        porIp: porIpMock,
        orcamento: orcamentoMock
      });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toMatchObject({
        tipo: "requisicoes-por-ip",
        ms: 30000
      });
    });

    it("should handle HEAD requests by ignoring API route budget check", async () => {
      const orcamentoMock = {
        msAteLiberar: vi.fn().mockRejectedValue(new Error("Erro de armazenamento")),
        duracaoMs: 3600000
      };
      const globalMock = {
        consume: vi.fn().mockResolvedValue({})
      };
      const porIpMock = {
        consume: vi.fn().mockResolvedValue({})
      };

      const limitador = mod.criarLimitador({
        global: globalMock,
        porIp: porIpMock,
        orcamento: orcamentoMock
      });

      const req = { method: "HEAD", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};

      const resultado = await limitador(req, res);
      expect(resultado).toBeNull();
      expect(orcamentoMock.msAteLiberar).not.toHaveBeenCalled();
    });
  });

  describe("criarRateLimiter", () => {
    it("should call next when limitador returns null", async () => {
      const limitadorMock = vi.fn().mockResolvedValue(null);
      const rateLimiter = mod.criarRateLimiter({ limitador: limitadorMock });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {};
      const next = vi.fn();

      await rateLimiter(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);
    });

    it("should return 429 status and proper message when blocked", async () => {
      const limitadorMock = vi.fn().mockResolvedValue({
        tipo: "requisicoes-por-ip",
        ms: 5000
      });
      const rateLimiter = mod.criarRateLimiter({ limitador: limitadorMock });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      };
      const next = vi.fn();

      await rateLimiter(req, res, next);
      expect(res.set).toHaveBeenCalledWith("Retry-After", "5");
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.send).toHaveBeenCalledWith({
        message: "Foi detectado comportamento equivalente a teste de carga, não execute teste de carga nesse ambiente. Leia a documentação: https://github.com/ServeRest/ServeRest#teste-de-carga"
      });
      expect(next).not.toHaveBeenCalled();
    });

    it("should handle storage error in block gracefully", async () => {
      const limitadorMock = vi.fn().mockResolvedValue({
        tipo: "orcamento-de-bytes",
        ms: 3600000,
        erro: new Error("Storage down")
      });
      const rateLimiter = mod.criarRateLimiter({ limitador: limitadorMock });

      const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
      const res = {
        set: vi.fn(),
        status: vi.fn().mockReturnThis(),
        send: vi.fn()
      };
      const next = vi.fn();

      await rateLimiter(req, res, next);
      expect(res.status).toHaveBeenCalledWith(429);
      expect(res.send).toHaveBeenCalledWith({
        message: "Limite de dados baixados da API atingido: cada cliente pode baixar até 250 MiB por hora no ServeRest online. Aguarde o tempo indicado no header Retry-After e tente de novo. Leia a documentação: https://github.com/ServeRest/ServeRest#limites-do-serverest-online"
      });
    });
  });

  describe("default export middleware", () => {
    it("should call next and ignore steps if running locally or test environment", async () => {
      const req = {};
      const res = {
        locals: {
          etapas: {
            ignorar: vi.fn()
          }
        }
      };
      const next = vi.fn();

      await mod(req, res, next);
      expect(res.locals.etapas.ignorar).toHaveBeenCalled();
      expect(next).toHaveBeenCalled();
    });
  });
});
