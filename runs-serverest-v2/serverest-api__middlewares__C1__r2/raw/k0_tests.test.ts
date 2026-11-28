import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API tests", () => {
  it("should return 401 when token is missing on protected route /carrinhos", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .send({ produtos: [] });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 401 when token has bad format on protected route /carrinhos", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("Authorization", "InvalidFormat token123")
      .send({ produtos: [] });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 401 when token is missing on admin route /produtos", async () => {
    const response = await request(app)
      .post("/produtos")
      .send({ nome: "Produto X", preco: 10, descricao: "Desc", quantidade: 5 });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 400 when malformed JSON is sent (entity.parse.failed / body-parser error)", async () => {
    const response = await request(app)
      .post("/usuarios")
      .set("Content-Type", "application/json")
      .send("{ malformed json");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 400 when URIError happens (invalid URL parameter)", async () => {
    const response = await request(app)
      .get("/usuarios/%");

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("message");
  });
});
