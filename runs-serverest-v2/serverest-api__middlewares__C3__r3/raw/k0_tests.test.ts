import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API tests", () => {
  it("should return 401 when token is missing on a protected route", async () => {
    const response = await request(app).post("/carrinhos").send({
      produtos: []
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
    });
  });

  it("should return 401 when token format is bad", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("authorization", "InvalidFormat")
      .send({
        produtos: []
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
    });
  });

  it("should return 401 when token is invalid or user does not exist", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5vbmVzdGlhbkBlbWFpbC5jb20iLCJwYXNzd29yZCI6InNlbmluaGEiLCJpYXQiOjE2MDAwMDAwMDB9.invalid")
      .send({
        produtos: []
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
    });
  });

  it("should return 403 when user is not an administrator on an admin-only route", async () => {
    const uniqueEmail = "comum_user_test@email.com";
    const userPayload = {
      nome: "Comum User",
      email: uniqueEmail,
      password: "teste",
      administrador: "false"
    };

    await request(app).post("/usuarios").send(userPayload);
    const loginResponse = await request(app).post("/login").send({
      email: uniqueEmail,
      password: "teste"
    });

    const token = loginResponse.body.authorization;

    const response = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto Teste",
        preco: 100,
        descricao: "Desc",
        quantidade: 10
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Rota exclusiva para administradores"
    });
  });

  it("should handle malformed JSON / entity parse failed error in error-handler middleware", async () => {
    const response = await request(app)
      .post("/usuarios")
      .set("content-type", "application/json")
      .send('{"nome": unquoted}');

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225"
    });
  });

  it("should handle URIError for invalid URL parameter encoding", async () => {
    const response = await request(app).get("/usuarios/%E0%A1%A2%invalid");

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      message: "Parâmetro de URL inválido. Verifique os caracteres especiais e tente novamente."
    });
  });
});
