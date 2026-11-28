import { describe, it, expect, vi } from "vitest";
import errorHandler from "../../src/middlewares/error-handler";
import logger from "../../src/utils/logger";

describe("errorHandler", () => {
  function mockResponse() {
    const res: any = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.send = vi.fn().mockReturnValue(res);
    return res;
  }

  it("should handle headersSent when timedout is true", () => {
    const error = new Error("Timeout error");
    const req: any = { timedout: true, method: "GET", originalUrl: "/test", socket: { destroy: vi.fn() } };
    const res: any = { headersSent: true, writableEnded: false };
    
    errorHandler(error, req, res, () => {});
    expect(res.writableEnded).toBe(false);
    expect(req.socket.destroy).toHaveBeenCalled();
  });

  it("should handle headersSent when writableEnded is true", () => {
    const error = new Error("Done error");
    const req: any = { timedout: false, method: "GET", originalUrl: "/test", socket: { destroy: vi.fn() } };
    const res: any = { headersSent: true, writableEnded: true };
    
    errorHandler(error, req, res, () => {});
    expect(res.writableEnded).toBe(true);
    expect(req.socket.destroy).not.toHaveBeenCalled();
  });

  it("should handle ValidationError", () => {
    const error = { name: "ValidationError", details: { body: [{ context: { label: "email" }, type: "string.email", message: "invalid" }] } };
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ email: "email deve ser um email válido" });
  });

  it("should handle URIError", () => {
    const error = new URIError("Malformed URI");
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Parâmetro de URL inválido. Verifique os caracteres especiais e tente novamente."
    });
  });

  it("should handle entity.parse.failed", () => {
    const error = { type: "entity.parse.failed" };
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225"
    });
  });

  it.each([
    "entity.too.large",
    "parameters.too.many"
  ])("should handle payload too large: %s", (type) => {
    const error = { type };
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ message: "Payload too large" });
  });

  it("should handle charset.unsupported", () => {
    const error = { type: "charset.unsupported", charset: "utf-16" };
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ message: "Unsupported charset", charset: "utf-16" });
  });

  it("should handle encoding.unsupported", () => {
    const error = { type: "encoding.unsupported", encoding: "deflate" };
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ message: "Unsupported content encoding", encoding: "deflate" });
  });

  it("should handle Zlib client error", () => {
    const error = new Error("Zlib error");
    (error as any).expose = true;
    (error as any).statusCode = 400;
    (error as any).code = "Z_DATA_ERROR";
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Corpo comprimido inválido. Envie o corpo de acordo com o header Content-Encoding ou remova o header."
    });
  });

  it("should handle ETIMEDOUT error", () => {
    const error = { code: "ETIMEDOUT" };
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(408);
    expect(res.json).toHaveBeenCalledWith({ message: "Timeout da requisição atingido" });
  });

  it("should handle generic client error (ehErroDoCliente)", () => {
    const error = new Error("Bad request");
    (error as any).expose = true;
    (error as any).statusCode = 400;
    (error as any).type = "some.type";
    const req: any = {};
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Não foi possível ler a requisição. Confira o corpo e os headers enviados.",
      error: "some.type"
    });
  });

  it("should handle internal server error with error type", () => {
    const error = new Error("Internal error");
    (error as any).type = "database.error";
    const req: any = { body: {} };
    const res = mockResponse();

    errorHandler(error, req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      message: "Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues",
      error: "database.error"
    }));
  });
});
