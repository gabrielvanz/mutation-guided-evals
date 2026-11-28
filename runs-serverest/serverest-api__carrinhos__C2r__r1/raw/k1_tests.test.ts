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

  it("should return cart not found for non-existent id format", async () => {
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
    expect(res.body).toHaveProperty("message");
  });

  it("should return no cart message when cancelling purchase without cart", async () => {
    const userEmail = "user_cancel_test@test.com";
    const password = "password123";

    await request(app).post("/usuarios").send({
      nome: "Test User Cancel",
      email: userEmail,
      password,
      administrador: "false"
    });

    const loginRes = await request(app).post("/login").send({
      email: userEmail,
      password
    });

    const token = loginRes.body.authorization;

    const res = await request(app)
      .delete("/carrinhos/cancelar-compra")
      .set("authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
  });

  it("should return no cart message when concluding purchase without cart", async () => {
    const userEmail = "user_concluir_test@test.com";
    const password = "password123";

    await request(app).post("/usuarios").send({
      nome: "Test User Concluir",
      email: userEmail,
      password,
      administrador: "false"
    });

    const loginRes = await request(app).post("/login").send({
      email: userEmail,
      password
    });

    const token = loginRes.body.authorization;

    const res = await request(app)
      .delete("/carrinhos/concluir-compra")
      .set("authorization", token);

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ message: "Não foi encontrado carrinho para esse usuário" });
  });
});
