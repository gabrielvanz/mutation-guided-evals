import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API Integration Tests", () => {
  it("should return 401 when accessing protected route without authorization header", async () => {
    const response = await request(app).post("/carrinhos").send({
      produtos: []
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 401 when accessing protected route with malformed token", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("Authorization", "InvalidTokenFormat")
      .send({
        produtos: []
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 401 when accessing admin route without token", async () => {
    const response = await request(app).post("/produtos").send({
      nome: "Produto Teste",
      preco: 10,
      descricao: "Teste",
      quantidade: 5
    });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 400 when sending invalid JSON body handled by error-handler", async () => {
    const response = await request(app)
      .post("/produtos")
      .set("Content-Type", "application/json")
      .send("invalid-json-string-without-quotes");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 400 when sending bad request parameters or body to usuarios", async () => {
    const response = await request(app).post("/usuarios").send({
      nome: "",
      email: "invalid-email",
      password: "",
      administrador: "not-boolean"
    });

    expect(response.status).toBe(400);
    expect(response.body).toBeDefined();
  });
});
