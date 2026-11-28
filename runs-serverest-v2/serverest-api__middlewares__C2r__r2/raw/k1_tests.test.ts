import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API tests", () => {
  it("should return 401 when accessing a protected route without authorization header", async () => {
    const response = await request(app).post("/carrinhos").send({
      produtos: []
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
    });
  });

  it("should return 401 when accessing a protected route with a badly formatted token", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("authorization", "InvalidTokenFormat")
      .send({
        produtos: []
      });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
    });
  });

  it("should return 401 when accessing an admin-only route without being an administrator", async () => {
    const uniqueEmail = "user_regular_test@test.com";
    await request(app).post("/usuarios").send({
      nome: "Regular User",
      email: uniqueEmail,
      password: "password",
      administrador: "false"
    });

    const loginRes = await request(app).post("/login").send({
      email: uniqueEmail,
      password: "password"
    });

    const token = loginRes.body.authorization;

    const response = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto Teste",
        preco: 100,
        descricao: "Descrição",
        quantidade: 10
      });

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      message: "Rota exclusiva para administradores"
    });
  });
});
