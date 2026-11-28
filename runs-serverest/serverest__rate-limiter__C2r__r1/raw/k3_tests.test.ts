import { describe, it, expect, vi } from "vitest";
import rateLimiterModule from "../../src/middlewares/rate-limiter";

describe("rate-limiter middleware exportado", () => {
  it("deve ignorar e chamar next se estiver executando localmente ou em ambiente de testes", async () => {
    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = { locals: { etapas: { ignorar: vi.fn() } } };
    const next = vi.fn();

    await rateLimiterModule(req, res, next);

    expect(res.locals.etapas.ignorar).toHaveBeenCalled();
    expect(next).toHaveBeenCalled();
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("deve retornar msAteLiberar igual a zero quando nao houver consumo excedido", async () => {
    const { criarOrcamentoDeBytes } = rateLimiterModule;
    const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 10 });
    const ms = await orcamento.msAteLiberar("192.168.1.1");
    expect(ms).toBe(0);
  });

  it("deve ter duracaoMs calculada corretamente", () => {
    const { criarOrcamentoDeBytes } = rateLimiterModule;
    const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 5 });
    expect(orcamento.duracaoMs).toBe(5000);
  });

  it("deve registrar penalidade quando tamanho for maior que zero", async () => {
    const { criarOrcamentoDeBytes } = rateLimiterModule;
    const orcamento = criarOrcamentoDeBytes({ bytes: 50, segundos: 10 });
    
    expect(() => orcamento.registrar("192.168.1.2", 10)).not.toThrow();
  });

  it("nao deve registrar penalidade quando tamanho for menor ou igual a zero", async () => {
    const { criarOrcamentoDeBytes } = rateLimiterModule;
    const orcamento = criarOrcamentoDeBytes({ bytes: 50, segundos: 10 });

    expect(() => orcamento.registrar("192.168.1.2", 0)).not.toThrow();
    expect(() => orcamento.registrar("192.168.1.2", -5)).not.toThrow();
  });
});

describe("criarLimitador", () => {
  it("deve permitir requisicao que nao atinge limites", async () => {
    const { criarLimitador } = rateLimiterModule;
    const globalMock = { consume: vi.fn().mockResolvedValue(true) };
    const porIpMock = { consume: vi.fn().mockResolvedValue(true) };
    const orcamentoMock = {
      msAteLiberar: vi.fn().mockResolvedValue(0),
      duracaoMs: 3600000
    };

    const limitador = criarLimitador({ global: globalMock, porIp: porIpMock, orcamento: orcamentoMock });
    const req = { method: "GET", path: "/usuarios", ip: "10.0.0.1" };
    const res = { on: vi.fn(), getHeader: vi.fn().mockReturnValue("0") };

    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
  });

  it("deve barrar quando o orçamento de bytes for excedido", async () => {
    const { criarLimitador } = rateLimiterModule;
    const orcamentoMock = {
      msAteLiberar: vi.fn().mockResolvedValue(5000),
      duracaoMs: 3600000
    };

    const limitador = criarLimitador({ orcamento: orcamentoMock });
    const req = { method: "GET", path: "/usuarios", ip: "10.0.0.1" };
    const res = {};

    const resultado = await limitador(req, res);
    expect(resultado).toEqual({ tipo: "orcamento-de-bytes", ms: 5000 });
  });

  it("deve tratar erro no orcamento de bytes", async () => {
    const { criarLimitador } = rateLimiterModule;
    const orcamentoMock = {
      msAteLiberar: vi.fn().mockRejectedValue(new Error("Erro storage")),
      duracaoMs: 3600000
    };

    const limitador = criarLimitador({ orcamento: orcamentoMock });
    const req = { method: "GET", path: "/usuarios", ip: "10.0.0.1" };
    const res = {};

    const resultado = await limitador(req, res);
    expect(resultado?.tipo).toBe("orcamento-de-bytes");
    expect(resultado?.ms).toBe(3600000);
    expect(resultado?.erro).toBeDefined();
  });

  it("nao deve verificar orcamento para metodos HEAD ou rotas fora da API", async () => {
    const { criarLimitador } = rateLimiterModule;
    const globalMock = { consume: vi.fn().mockResolvedValue(true) };
    const porIpMock = { consume: vi.fn().mockResolvedValue(true) };
    const orcamentoMock = {
      msAteLiberar: vi.fn().mockResolvedValue(5000),
      duracaoMs: 3600000
    };

    const limitador = criarLimitador({ global: globalMock, porIp: porIpMock, orcamento: orcamentoMock });
    const req = { method: "HEAD", path: "/usuarios", ip: "10.0.0.1" };
    const res = { on: vi.fn(), getHeader: vi.fn() };

    const resultado = await limitador(req, res);
    expect(orcamentoMock.msAteLiberar).not.toHaveBeenCalled();
    expect(resultado).toBeNull();
  });
});

describe("criarRateLimiter", () => {
  it("deve chamar next() quando nao houver bloqueio", async () => {
    const { criarRateLimiter } = rateLimiterModule;
    const limitadorMock = vi.fn().mockResolvedValue(null);
    const rateLimiter = criarRateLimiter({ limitador: limitadorMock });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};
    const next = vi.fn();

    await rateLimiter(req, res, next);
    expect(next).toHaveBeenCalled();
  });

  it("deve retornar status 429 e cabecalho Retry-After quando houver bloqueio", async () => {
    const { criarRateLimiter } = rateLimiterModule;
    const limitadorMock = vi.fn().mockResolvedValue({ tipo: "requisicoes-por-ip", ms: 15000 });
    const rateLimiter = criarRateLimiter({ limitador: limitadorMock });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);

    expect(res.set).toHaveBeenCalledWith("Retry-After", "15");
    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalledWith({ message: "Foi detectado comportamento equivalente a teste de carga, não execute teste de carga nesse ambiente. Leia a documentação: https://github.com/ServeRest/ServeRest#teste-de-carga" });
    expect(next).not.toHaveBeenCalled();
  });

  it("deve lidar com bloqueio contendo erro de armazenamento", async () => {
    const { criarRateLimiter } = rateLimiterModule;
    const limitadorMock = vi.fn().mockResolvedValue({ tipo: "requisicoes-global", ms: 5000, erro: new Error("Falha") });
    const rateLimiter = criarRateLimiter({ limitador: limitadorMock });

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      set: vi.fn(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn()
    };
    const next = vi.fn();

    await rateLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.send).toHaveBeenCalledWith(expect.any(Object));
  });
});
