import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should create a new user and retrieve it", async () => {
    const postRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: "user_test_create@test.com",
        password: "secretpassword",
        administrador: "false"
      });

    expect(postRes.status).toBe(201);
    expect(postRes.body).toHaveProperty("_id");

    const userId = postRes.body._id;

    const getRes = await request(app).get(`/usuarios/${userId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body).toHaveProperty("email", "user_test_create@test.com");
    expect(getRes.body).toHaveProperty("nome", "Test User");
  });

  it("should prevent duplicate emails on creation", async () => {
    const userPayload = {
      nome: "User One",
      email: "user_dup@test.com",
      password: "password123",
      administrador: "false"
    };

    const firstRes = await request(app).post("/usuarios").send(userPayload);
    expect(firstRes.status).toBe(201);

    const secondRes = await request(app).post("/usuarios").send({
      ...userPayload,
      nome: "User Two"
    });
    expect(secondRes.status).toBe(400);
    expect(secondRes.body).toHaveProperty("message");
  });

  it("should return all users", async () => {
    await request(app)
      .post("/usuarios")
      .send({
        nome: "List User",
        email: "user_list@test.com",
        password: "password",
        administrador: "true"
      });

    const res = await request(app).get("/usuarios");
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("quantidade");
    expect(res.body).toHaveProperty("usuarios");
    expect(Array.isArray(res.body.usuarios)).toBe(true);
    expect(res.body.quantidade).toBeGreaterThan(0);
  });

  it("should return 400 when user is not found by ID", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should update an existing user via PUT", async () => {
    const postRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Original Name",
        email: "user_update@test.com",
        password: "password",
        administrador: "false"
      });

    const userId = postRes.body._id;

    const putRes = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Updated Name",
        email: "user_update@test.com",
        password: "newpassword",
        administrador: "true"
      });

    expect([200, 201]).toContain(putRes.status);

    const getRes = await request(app).get(`/usuarios/${userId}`);
    expect(getRes.status).toBe(200);
    expect(getRes.body.nome).toBe("Updated Name");
  });

  it("should delete an existing user", async () => {
    const postRes = await request(app)
      .post("/usuarios")
      .send({
        nome: "Delete User",
        email: "user_delete@test.com",
        password: "password",
        administrador: "false"
      });

    const userId = postRes.body._id;

    const deleteRes = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteRes.status).toBe(200);

    const getRes = await request(app).get(`/usuarios/${userId}`);
    expect(getRes.status).toBe(400);
  });
});
