import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("carrinhos API", () => {
  it("should list all carts with status 200", async () => {
    const res = await request(app).get("/carrinhos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("carrinhos");
    expect(Array.isArray(res.body.carrinhos)).toBe(true);
  });

  it("should return cart not found for non-existent id on getOne", async () => {
    const res = await request(app).get("/carrinhos/1234567890123456");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Carrinho não encontrado" });
  });

  it("should fail to create cart without authentication", async () => {
    const res = await request(app)
      .post("/carrinhos")
      .send({
        produtos: [{ idProduto: "123456", quantidade: 1 }]
      });
    expect(res.status).toBe(401);
  });

  it("should fail to create cart with invalid product schema", async () => {
    const uniqueEmail = "user_cart_invalid@test.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User Cart",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: uniqueEmail,
        password: "password123"
      });

    const token = loginRes.body.authorization;

    const res = await request(app)
      .post("/carrinhos")
      .set("authorization", token)
      .send({
        produtos: []
      });

    expect(res.status).toBe(400);
  });

  it("should handle conclude purchase when no cart exists", async () => {
    const uniqueEmail = "user_nocart@test.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User No Cart",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: uniqueEmail,
        password: "password123"
      });

    const token = loginRes.body.authorization;

    const res = await request(app)
      .delete("/carrinhos/concluir-compra")
      .set("authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
  });

  it("should handle cancel purchase when no cart exists", async () => {
    const uniqueEmail = "user_cancel_cart@test.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User Cancel Cart",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    const loginRes = await request(app)
      .post("/login")
      .send({
        email: uniqueEmail,
        password: "password123"
      });

    const token = loginRes.body.authorization;

    const res = await request(app)
      .delete("/carrinhos/cancelar-compra")
      .set("authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
  });
});
