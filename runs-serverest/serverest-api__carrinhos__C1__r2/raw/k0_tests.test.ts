import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Carrinhos API", () => {
  it("should get an empty list of carrinhos initially", async () => {
    const res = await request(app).get("/carrinhos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("carrinhos");
    expect(Array.isArray(res.body.carrinhos)).toBe(true);
  });

  it("should return 400 for a non-existent carrinho id in getOne", async () => {
    const res = await request(app).get("/carrinhos/1234567890123456");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should require authentication to post a carrinho", async () => {
    const res = await request(app)
      .post("/carrinhos")
      .send({
        produtos: [
          { idProduto: "prod1", quantidade: 2 }
        ]
      });
    expect(res.status).toBe(401);
  });

  it("should require authentication to conclude a purchase", async () => {
    const res = await request(app).delete("/carrinhos/concluir-compra");
    expect(res.status).toBe(401);
  });

  it("should require authentication to cancel a purchase", async () => {
    const res = await request(app).delete("/carrinhos/cancelar-compra");
    expect(res.status).toBe(401);
  });
});
