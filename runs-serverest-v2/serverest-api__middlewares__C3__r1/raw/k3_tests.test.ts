import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API Integration Tests", () => {
  describe("Authentication Middleware (checkToken & checkAdm)", () => {
    it("should reject request without authorization header on protected routes with 401", async () => {
      const res = await request(app).post("/carrinhos").send({
        produtos: []
      });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
    });

    it("should reject request with malformed authorization header missing Bearer prefix with 401", async () => {
      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", "token123")
        .send({ produtos: [] });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
    });

    it("should reject request with malformed authorization header with 401", async () => {
      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", "InvalidFormat token123")
        .send({ produtos: [] });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
    });

    it("should reject request with invalid/expired token format with 401", async () => {
      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", "Bearer invalidtokenstring")
        .send({ produtos: [] });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
    });

    it("should reject token belonging to a deleted or non-existent user with 401", async () => {
      const fakeTokenUser = {
        nome: "Temporary User",
        email: "temp_user_auth_test@serverest.dev",
        password: "teste",
        administrador: "false"
      };

      const createRes = await request(app).post("/usuarios").send(fakeTokenUser);
      const userId = createRes.body._id;

      const loginRes = await request(app).post("/login").send({
        email: fakeTokenUser.email,
        password: fakeTokenUser.password
      });

      const token = loginRes.body.authorization;

      // Delete the user so they no longer exist in the database
      await request(app).delete(`/usuarios/${userId}`);

      const res = await request(app)
        .post("/carrinhos")
        .set("authorization", token)
        .send({ produtos: [] });

      expect(res.status).toBe(401);
      expect(res.body).toEqual({ message: "Token de acesso ausente, inválido, expirado ou usuário do token não existe mais" });
    });

    it("should allow a valid token for checkToken middleware", async () => {
      const user = {
        nome: "User Cart",
        email: "user_cart_test@serverest.dev",
        password: "teste",
        administrador: "false"
      };

      await request(app).post("/usuarios").send(user);

      const loginRes = await request(app).post("/login").send({
        email: user.email,
        password: user.password
      });

      const token = loginRes.body.authorization;

      const res = await request(app)
        .delete("/carrinhos/cancelar-compra")
        .set("authorization", token);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
    });

    it("should reject non-admin user trying to access admin-only routes with 403", async () => {
      const regularUser = {
        nome: "User Regular",
        email: "user_regular@serverest.dev",
        password: "teste",
        administrador: "false"
      };

      await request(app).post("/usuarios").send(regularUser);

      const loginRes = await request(app).post("/login").send({
        email: regularUser.email,
        password: regularUser.password
      });

      const token = loginRes.body.authorization;

      const res = await request(app)
        .post("/produtos")
        .set("authorization", token)
        .send({
          nome: "Produto Admin Test",
          preco: 100,
          descricao: "Desc",
          quantidade: 10
        });

      expect(res.status).toBe(403);
      expect(res.body).toEqual({ message: "Rota exclusiva para administradores" });
    });
  });

  describe("Error Handler Middleware", () => {
    it("should handle URIError with 400 and custom message", async () => {
      const res = await request(app).get("/usuarios/%E0%A2%A");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: "Parâmetro de URL inválido. Verifique os caracteres especiais e tente novamente."
      });
    });

    it("should handle JSON entity parse errors with 400", async () => {
      const res = await request(app)
        .post("/usuarios")
        .set("content-type", "application/json")
        .send("{\n  \"nome\": Fulano,\n  \"email\": \"fulano@qa.com\",\n  \"password\": \"teste\",\n  \"administrador\": \"true\"\n}");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: "Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225"
      });
    });

    it("should handle invalid request body schemas with 400", async () => {
      const res = await request(app).post("/usuarios").send({
        nome: "",
        email: "not-an-email",
        password: "",
        administrador: "invalid"
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty("nome");
    });

    it("should handle payload too large errors with 413", async () => {
      const res = await request(app)
        .post("/usuarios")
        .set("content-type", "application/json")
        .send({
          nome: "A".repeat(200 * 1024),
          email: "large@serverest.dev",
          password: "teste",
          administrador: "true"
        });

      expect(res.status).toBe(413);
      expect(res.body).toEqual({ message: "Payload too large" });
    });

    it("should handle unsupported charset with 415", async () => {
      const res = await request(app)
        .post("/usuarios")
        .set("content-type", "application/json; charset=utf-unknown")
        .send({
          nome: "Test",
          email: "charset@serverest.dev",
          password: "teste",
          administrador: "true"
        });

      expect(res.status).toBe(415);
      expect(res.body).toEqual({ message: "Unsupported charset", charset: "utf-unknown" });
    });

    it("should handle unsupported content encoding with 415", async () => {
      const res = await request(app)
        .post("/usuarios")
        .set("content-encoding", "unsupported-enc")
        .send({
          nome: "Test",
          email: "encoding@serverest.dev",
          password: "teste",
          administrador: "true"
        });

      expect(res.status).toBe(415);
      expect(res.body).toEqual({ message: "Unsupported content encoding", encoding: "unsupported-enc" });
    });

    it("should handle invalid compressed body with 400", async () => {
      const res = await request(app)
        .post("/usuarios")
        .set("content-encoding", "gzip")
        .send("invalid-gzip-data");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: "Corpo comprimido inválido. Envie o corpo de acordo com o header Content-Encoding ou remova o header."
      });
    });

    it("should handle client errors from body parser with custom expose status", async () => {
      const res = await request(app)
        .post("/usuarios")
        .set("content-type", "application/json")
        .send("{\n  \"nome\": Fulano,\n  \"email\": \"fulano@qa.com\",\n  \"password\": \"teste\",\n  \"administrador\": \"true\"\n}");

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: "Adicione aspas em todos os valores. Para mais informações acesse a issue https://github.com/ServeRest/ServeRest/issues/225"
      });
    });
  });
});
