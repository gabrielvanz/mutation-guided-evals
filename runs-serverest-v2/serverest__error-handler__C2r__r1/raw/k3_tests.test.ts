import { describe, it, expect, vi } from "vitest";
import errorHandler from "../../src/middlewares/error-handler";
import logger from "../../src/utils/logger";

describe("errorHandler", () => {
  function mockResponse() {
    const res: any = {
      headersSent: false,
      writableEnded: false,
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis()
    };
    return res;
  }

  it("should handle headersSent = true when timedout is false", () => {
    const req: any = { timedout: false, method: "GET", originalUrl: "/test", socket: { destroy: vi.fn() } };
    const res: any = { headersSent: true, writableEnded: false };
    const error: any = { message: "Test error", stack: "stack" };

    errorHandler(error, req, res, () => {});

    expect(req.socket.destroy).toHaveBeenCalled();
  });

  it("should handle headersSent = true when writableEnded is true", () => {
    const req: any = { timedout: true, method: "GET", originalUrl: "/test", socket: { destroy: vi.fn() } };
    const res: any = { headersSent: true, writableEnded: true };
    const error: any = { message: "Test error", stack: "stack" };

    errorHandler(error, req, res, () => {});

    expect(req.socket.destroy).not.toHaveBeenCalled();
  });

  it("should handle ValidationError", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      name: "ValidationError",
      details: {
        body: [
          {
            context: { label: "nome" },
            type: "any.required",
            message: '"nome" is required'
          }
        ]
      }
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ nome: "nome é obrigatório" });
  });

  it("should handle URIError", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      name: "URIError",
      message: "Malformed URI"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Parâmetro de URL inválido. Verifique os caracteres especiais e tente novamente."
    });
  });

  it("should handle entity.parse.failed", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      type: "entity.parse.failed"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225"
    });
  });

  it.each([
    ["entity.too.large"],
    ["parameters.too.many"]
  ])("should handle payload too large for type %s", (type) => {
    const req: any = {};
    const res = mockResponse();
    const error: any = { type };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ message: "Payload too large" });
  });

  it("should handle charset.unsupported", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      type: "charset.unsupported",
      charset: "utf-16"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ message: "Unsupported charset", charset: "utf-16" });
  });

  it("should handle encoding.unsupported", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      type: "encoding.unsupported",
      encoding: "deflate"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(415);
    expect(res.json).toHaveBeenCalledWith({ message: "Unsupported content encoding", encoding: "deflate" });
  });

  it("should handle Zlib client error", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      expose: true,
      statusCode: 400,
      code: "Z_DATA_ERROR",
      message: "data error"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({
      message: "Corpo comprimido inválido. Envie o corpo de acordo com o header Content-Encoding ou remova o header."
    });
  });

  it("should handle ETIMEDOUT error", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      code: "ETIMEDOUT"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(408);
    expect(res.json).toHaveBeenCalledWith({ message: "Timeout da requisição atingido" });
  });

  it("should handle generic client error with expose true", () => {
    const req: any = {};
    const res = mockResponse();
    const error: any = {
      expose: true,
      statusCode: 422,
      type: "some.type",
      message: "bad request"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(422);
    expect(res.json).toHaveBeenCalledWith({
      message: "Não foi possível ler a requisição. Confira o corpo e os headers enviados.",
      error: "some.type"
    });
  });

  it("should handle 500 internal error with type", () => {
    const req: any = { body: {} };
    const res = mockResponse();
    const error: any = {
      type: "internal.error",
      stack: "stacktrace"
    };

    errorHandler(error, req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Abra uma issue informando essa resposta. https://github.com/ServeRest/ServeRest/issues",
        error: "internal.error"
      })
    );
  });
});
