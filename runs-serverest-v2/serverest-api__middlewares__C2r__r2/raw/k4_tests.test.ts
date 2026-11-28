import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API tests", () => {
  it("should return 401 when accessing a protected route without authorization header", async () => {
    const res = await request(app).post("/carrinhos").send({
      produtos: []
    });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
  });

  it("should return 401 when accessing a protected route with a malformed authorization header", async () => {
    const res = await request(app)
      .post("/carrinhos")
      .set("authorization", "InvalidFormat token123")
      .send({ produtos: [] });

    expect(res.status).toBe(401);
    expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
  });

  it("should return 401 when accessing an admin route without being an administrator", async () => {
    const uniqueEmail = "user_non_admin_abc@qa.com";
    await request(app).post("/usuarios").send({
      nome: "Comum User",
      email: uniqueEmail,
      password: "teste",
      administrador: "false"
    });

    const loginRes = await request(app).post("/login").send({
      email: uniqueEmail,
      password: "teste"
    });

    const token = loginRes.body.authorization;

    const res = await request(app)
      .post("/produtos")
      .set("authorization", token)
      .send({
        nome: "Produto Teste Admin",
        preco: 10,
        descricao: "Desc",
        quantidade: 10
      });

    expect(res.status).toBe(403);
    expect(res.body).toEqual({ message: "Rota exclusiva para administradores" });
  });

  it("should handle malformed JSON body triggering parser error and error handler", async () => {
    const res = await request(app)
      .post("/usuarios")
      .set("content-type", "application/json")
      .send("invalid-json-syntax");

    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });
});
