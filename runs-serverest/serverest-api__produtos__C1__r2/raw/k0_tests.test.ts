import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Produtos API", () => {
  it("should get all products", async () => {
    const res = await request(app).get("/produtos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("produtos");
    expect(Array.isArray(res.body.produtos)).toBe(true);
  });

  it("should return product not found for non-existent id on getOne", async () => {
    const res = await request(app).get("/produtos/1234567890123456");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should fail to create product without authentication/admin headers", async () => {
    const res = await request(app)
      .post("/produtos")
      .send({
        nome: "Produto Teste",
        preco: 100,
        descricao: "Descricao",
        quantidade: 10
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("should fail to delete product with invalid id format", async () => {
    const res = await request(app).delete("/produtos/invalid-id");
    expect(res.status).toBeGreaterThanOrEqual(400);
  });

  it("should fail to update product with invalid id format", async () => {
    const res = await request(app)
      .put("/produtos/invalid-id")
      .send({
        nome: "Produto Atualizado",
        preco: 150,
        descricao: "Nova descricao",
        quantidade: 5
      });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
