import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API", () => {
  describe("Authentication Middleware", () => {
    it("should return 401 when token is missing on protected routes", async () => {
      const response = await request(app).post("/carrinhos").send({
        produtos: []
      });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
      });
    });

    it("should return 401 when authorization header has bad format", async () => {
      const response = await request(app)
        .post("/carrinhos")
        .set("authorization", "InvalidFormat 12345")
        .send({ produtos: [] });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
      });
    });

    it("should return 401 when token is invalid or user does not exist", async () => {
      const response = await request(app)
        .post("/carrinhos")
        .set("authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6Im5vbmV4aXN0ZW50QGVtYWlsLmNvbSIsInBhc3N3b3JkIjoidGVzdGUifQ.invalid")
        .send({ produtos: [] });

      expect(response.status).toBe(401);
      expect(response.body).toEqual({
        message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais"
      });
    });

    it("should return 403 when non-admin user tries to access admin routes", async () => {
      const regularUserEmail = "user_non_admin_test@email.com";

      await request(app).post("/usuarios").send({
        nome: "Regular User",
        email: regularUserEmail,
        password: "teste",
        administrador: "false"
      });

      const loginResponse = await request(app).post("/login").send({
        email: regularUserEmail,
        password: "teste"
      });

      const token = loginResponse.body.authorization;

      const response = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Teste Non Admin",
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      expect(response.status).toBe(403);
      expect(response.body).toEqual({
        message: "Rota exclusiva para administradores"
      });
    });

    it("should allow admin user to access admin routes successfully", async () => {
      const adminEmail = "admin_user_test@email.com";

      await request(app).post("/usuarios").send({
        nome: "Admin User",
        email: adminEmail,
        password: "teste",
        administrador: "true"
      });

      const loginResponse = await request(app).post("/login").send({
        email: adminEmail,
        password: "teste"
      });

      const token = loginResponse.body.authorization;

      const response = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Admin Teste",
          preco: 200,
          descricao: "Desc",
          quantidade: 5
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    });
  });

  describe("Error Handler Middleware", () => {
    it("should return 400 for URIError (malformed URL parameters)", async () => {
      const response = await request(app).get("/usuarios/%E0%A2%A");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Parâmetro de URL inválido. Verifique os caracteres especiais e tente novamente."
      });
    });

    it("should return 400 when body-parser fails with entity.parse.failed", async () => {
      const response = await request(app)
        .post("/usuarios")
        .set("content-type", "application/json")
        .send("{invalid_json");

      expect(response.status).toBe(400);
      expect(response.body).toEqual({
        message: "Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225"
      });
    });
  });
});
