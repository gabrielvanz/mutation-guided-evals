import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("carrinhos API", () => {
  it("should list carts (GET /carrinhos)", async () => {
    const res = await request(app).get("/carrinhos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("carrinhos");
    expect(Array.isArray(res.body.carrinhos)).toBe(true);
  });

  it("should return 400 for non-existent cart by ID (GET /carrinhos/:id)", async () => {
    const fakeId = "1234567890abcdef";
    const res = await request(app).get(`/carrinhos/${fakeId}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Carrinho não encontrado" });
  });

  it("should return 401 when trying to create cart without token (POST /carrinhos)", async () => {
    const res = await request(app)
      .post("/carrinhos")
      .send({
        produtos: [{ idProduto: "12345", quantidade: 1 }]
      });
    expect(res.status).toBe(401);
  });

  it("should return 401 when trying to complete purchase without token (DELETE /carrinhos/concluir-compra)", async () => {
    const res = await request(app).delete("/carrinhos/concluir-compra");
    expect(res.status).toBe(401);
  });

  it("should return 401 when trying to cancel purchase without token (DELETE /carrinhos/cancelar-compra)", async () => {
    const res = await request(app).delete("/carrinhos/cancelar-compra");
    expect(res.status).toBe(401);
  });
});
