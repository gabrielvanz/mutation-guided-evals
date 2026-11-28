import { describe, it, expect } from "vitest";
import rateLimiterModule, {
  criarLimitador,
  criarOrcamentoDeBytes,
  criarRateLimiter,
  BYTES_POR_HORA
} from "../../src/middlewares/rate-limiter";
import { LOAD_TEST_DETECTED } from "../../src/utils/constants";

describe("rate-limiter exportações", () => {
  it("should export BYTES_POR_HORA as a number", () => {
    expect(typeof BYTES_POR_HORA).toBe("number");
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

  it("should export default middleware function", () => {
    expect(typeof rateLimiterModule).toBe("function");
  });
});

describe("criarOrcamentoDeBytes", () => {
  it("should return an object with msAteLiberar, registrar, and duracaoMs", () => {
    const orcamento = criarOrcamentoDeBytes();
    expect(typeof orcamento.msAteLiberar).toBe("function");
    expect(typeof orcamento.registrar).toBe("function");
    expect(typeof orcamento.duracaoMs).toBe("number");
    expect(orcamento.duracaoMs).toBe(3600000);
  });

  it("should allow custom bytes and segundos options", () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 1000, segundos: 60 });
    expect(orcamento.duracaoMs).toBe(60000);
  });

  it("should return 0 msAteLiberar when key is not consumed", async () => {
    const orcamento = criarOrcamentoDeBytes({ bytes: 100, segundos: 10 });
    const ms = await orcamento.msAteLiberar("chave-inexistente");
    expect(ms).toBe(0);
  });
});

describe("criarLimitador", () => {
  it("should return a verification function", () => {
    const limitador = criarLimitador();
    expect(typeof limitador).toBe("function");
  });

  it("should allow request when within limits", async () => {
    const limitador = criarLimitador();
    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      on: () => {},
      getHeader: () => null
    };
    const resultado = await limitador(req, res);
    expect(resultado).toBeNull();
  });
});

describe("criarRateLimiter", () => {
  it("should return a middleware function", () => {
    const middleware = criarRateLimiter();
    expect(typeof middleware).toBe("function");
  });

  it("should call next() when limitador returns null", async () => {
    const limitadorMock = async () => null;
    const middleware = criarRateLimiter({ limitador: limitadorMock });

    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {};

    await middleware(req, res, next);
    expect(nextCalled).toBe(true);
  });

  it("should respond with 429 when limitador returns a block", async () => {
    const limitadorMock = async () => ({ tipo: "requisicoes-por-ip", ms: 5000 });
    const middleware = criarRateLimiter({ limitador: limitadorMock });

    let statusEnviado = null;
    let bodyEnviado = null;
    let headersSet = {};

    const req = { method: "GET", path: "/usuarios", ip: "127.0.0.1" };
    const res = {
      set: (key, val) => {
        headersSet[key] = val;
      },
      status: (st) => {
        statusEnviado = st;
        return {
          send: (body) => {
            bodyEnviado = body;
            return body;
          }
        };
      }
    };
    const next = () => {};

    await middleware(req, res, next);
    expect(statusEnviado).toBe(429);
    expect(headersSet["Retry-After"]).toBe("5");
    expect(bodyEnviado).toEqual({ message: LOAD_TEST_DETECTED });
  });
});

describe("default exported middleware", () => {
  it("should call next() and ignore in test/local environment", async () => {
    let nextCalled = false;
    const next = () => {
      nextCalled = true;
    };
    const res = {
      locals: {
        etapas: {
          ignorar: () => {}
        }
      }
    };
    const req = {};

    await rateLimiterModule(req, res, next);
    expect(nextCalled).toBe(true);
  });
});
