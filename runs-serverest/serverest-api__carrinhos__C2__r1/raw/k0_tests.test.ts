import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Carrinhos API", () => {
  it("should get the list of carts", async () => {
    const res = await request(app).get("/carrinhos");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("carrinhos");
    expect(Array.isArray(res.body.carrinhos)).toBe(true);
  });

  it("should return cart not found for a non-existent cart id of correct format", async () => {
    const res = await request(app).get("/carrinhos/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Carrinho não encontrado" });
  });

  it("should fail to get cart by invalid id format", async () => {
    const res = await request(app).get("/carrinhos/invalid-id");
    expect(res.status).toBe(400);
  });

  it("should fail to create a cart without authentication", async () => {
    const res = await request(app)
      .post("/carrinhos")
      .send({
        produtos: [{ idProduto: "1234567890abcdef", quantidade: 2 }]
      });
    expect(res.status).toBe(401);
  });

  it("should fail to cancel purchase without authentication", async () => {
    const res = await request(app).delete("/carrinhos/cancelar-compra");
    expect(res.status).toBe(401);
  });

  it("should fail to conclude purchase without authentication", async () => {
    const res = await request(app).delete("/carrinhos/concluir-compra");
    expect(res.status).toBe(401);
  });

  it("should handle cancelling purchase when user has no cart", async () => {
    const email = "user_nocart_cancel@test.com";
    const password = "password123";

    await request(app).post("/usuarios").send({
      nome: "User No Cart Cancel",
      email,
      password,
      administrador: "false"
    });

    const loginRes = await request(app).post("/login").send({ email, password });
    const token = loginRes.body.authorization;

    const res = await request(app)
      .delete("/carrinhos/cancelar-compra")
      .set("authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
  });

  it("should handle concluding purchase when user has no cart", async () => {
    const email = "user_nocart_conc@test.com";
    const password = "password123";

    await request(app).post("/usuarios").send({
      nome: "User No Cart Conc",
      email,
      password,
      administrador: "false"
    });

    const loginRes = await request(app).post("/login").send({ email, password });
    const token = loginRes.body.authorization;

    const res = await request(app)
      .delete("/carrinhos/concluir-compra")
      .set("authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
  });
});
