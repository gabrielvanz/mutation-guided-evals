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
    const uniqueEmail = "test_user_unique@example.com";
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("message", "Cadastro realizado com sucesso");
    expect(res.body).toHaveProperty("_id");
  });

  it("should fail to create a usuario when email is already used", async () => {
    const uniqueEmail = "dup_user_unique@example.com";
    const payload = {
      nome: "First User",
      email: uniqueEmail,
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
    expect(secondRes.body).toEqual({ message: "Este email já está sendo usado" });
  });

  it("should return user not found when getting a non-existent usuario", async () => {
    const fakeId = "1234567890abcdef";
    const res = await request(app).get(`/usuarios/${fakeId}`);
    expect(res.status).toBe(400);
    expect(res.body).toEqual({ message: "Usuário não encontrado" });
  });

  it("should get a single usuario by id", async () => {
    const uniqueEmail = "getone_user_unique@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Get One User",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const res = await request(app).get(`/usuarios/${userId}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("_id", userId);
    expect(res.body).toHaveProperty("email", uniqueEmail);
  });

  it("should delete an existing usuario successfully", async () => {
    const uniqueEmail = "del_user_unique@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Delete User",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body).toEqual({ message: "Registro excluído com sucesso" });
  });

  it("should update an existing usuario via put", async () => {
    const uniqueEmail = "put_user_unique@example.com";
    const createRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Put User",
        email: uniqueEmail,
        password: "password123",
        administrador: "false"
      });

    expect(createRes.status).toBe(201);
    const userId = createRes.body._id;

    const updateRes = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Put User Updated",
        email: uniqueEmail,
        password: "newpassword123",
        administrador: "true"
      });

    expect(updateRes.status).toBe(200);
    expect(updateRes.body).toEqual({ message: "Registro alterado com sucesso" });
  });

  it("should validate required fields on post usuario", async () => {
    const res = await request(app)
      .post("/usuarios")
      .send({
        nome: "",
        email: "notanemail",
        password: "",
        administrador: "invalid"
      });

    expect(res.status).toBe(400);
  });
});
