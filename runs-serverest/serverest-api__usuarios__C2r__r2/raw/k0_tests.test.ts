import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should get all users", async () => {
    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
  });

  it("should create a new user and then get it by id", async () => {
    const uniqueEmail = "user_abc123@test.com";
    const postRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(postRes.body).toHaveProperty("_id");

    const userId = postRes.body._id;

    const getRes = await request(app).get(`/usuarios/${userId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty("_id", userId);
    expect(getRes.body).toHaveProperty("email", uniqueEmail);
  });

  it("should return error when creating user with existing email", async () => {
    const uniqueEmail = "duplicate_xyz789@test.com";
    const userData = {
      nome: "User One",
      email: uniqueEmail,
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(userData);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send(userData);
    expect(secondRes.status).toBe(400);
    expect(secondRes.body).toEqual({ message: "Este email já está sendo usado" });
  });

  it("should return 400 when getting a non-existent user with valid id format", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Usuário não encontrado" });
  });

  it("should return validation error for invalid email on user creation", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Invalid Email User",
        email: "not-an-email",
        password: "password123",
        administrador: "true"
      });

    expect(res.status).toBe(400);
  });

  it("should update an existing user or create one if not found via PUT", async () => {
    const uniqueEmail = "put_user_def456@test.com";
    const putRes = await request(app)
      .put("/usuarios/9999999999999999")
      .send({
        nome: "Put User",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    expect([200, 201]).toContain(putRes.status);
    expect(putRes.body).toHaveProperty("message");
  });

  it("should delete an existing user", async () => {
    const uniqueEmail = "delete_user_ghi789@test.com";
    const postRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Delete User",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    const userId = postRes.body._id;

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ message: "Registro excluído com sucesso" });
  });
});
