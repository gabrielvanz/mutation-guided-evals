import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should get all usuarios", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should create a new usuario successfully", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: "unique_test_user_1@example.com",
        password: "password123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should not allow creating a usuario with an already used email", async () => {
    const payload = {
      nome: "First User",
      email: "unique_duplicate_user_2@example.com",
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(payload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send({
      ...payload,
      nome: "Second User"
    });

    expect(secondRes.status).toBe(400);
    expect(secondRes.body).toHaveProperty("message", "Este email já está sendo usado");
  });

  it("should return 400 when getting a non-existent usuario", async () => {
    const nonExistentId = "1234567890abcdef";
    const res = await request(app).get(`/usuarios/${nonExistentId}`);
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message", "Usuário não encontrado");
  });

  it("should filter usuarios by email using query params", async () => {
    const uniqueEmail = "unique_filter_user_3@example.com";
    await request(app)
      .post("/usuarios")
      .send({
        nome: "Filter User",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    const res = await request(app).get(`/usuarios?email=${uniqueEmail}`);
    expect(res.status).toBe(200);
    expect(res.body.quantidade).toBe(1);
    expect(res.body.usuarios[0].email).toBe(uniqueEmail);
  });
});
