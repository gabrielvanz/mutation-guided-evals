import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Usuarios API", () => {
  it("should create a new user and retrieve it", async () => {
    const uniqueEmail = "user_test_create@test.com";
    const postResponse = await request(app)
      .post("/usuarios")
      .send({
        nome: "Test User",
        email: uniqueEmail,
        password: "secretpassword",
        administrador: "false"
      });

    expect(postResponse.status).toBe(201);
    expect(postResponse.body).toHaveProperty("_id");
    const userId = postResponse.body._id;

    const getResponse = await request(app).get(`/usuarios/${userId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body).toHaveProperty("email", uniqueEmail);
    expect(getResponse.body).toHaveProperty("nome", "Test User");

    const listResponse = await request(app).get("/usuarios");
    expect(listResponse.status).toBe(200);
    expect(listResponse.body).toHaveProperty("quantidade");
    expect(listResponse.body.quantidade).toBeGreaterThan(0);
  });

  it("should prevent duplicate emails on creation", async () => {
    const uniqueEmail = "dup_test_email@test.com";
    const firstResponse = await request(app)
      .post("/usuarios")
      .send({
        nome: "First User",
        email: uniqueEmail,
        password: "password123",
        administrador: "true"
      });

    expect(firstResponse.status).toBe(201);

    const secondResponse = await request(app)
      .post("/usuarios")
      .send({
        nome: "Second User",
        email: uniqueEmail,
        password: "password456",
        administrador: "false"
      });

    expect(secondResponse.status).toBe(400);
    expect(secondResponse.body).toHaveProperty("message");
  });

  it("should return user not found for non-existent id format valid", async () => {
    const res = await request(app).get("/usuarios/1234567890abcdef");
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty("message");
  });

  it("should update an existing user successfully", async () => {
    const uniqueEmail = "put_test_email@test.com";
    const postResponse = await request(app)
      .post("/usuarios")
      .send({
        nome: "Original Name",
        email: uniqueEmail,
        password: "password",
        administrador: "false"
      });

    const userId = postResponse.body._id;

    const putResponse = await request(app)
      .put(`/usuarios/${userId}`)
      .send({
        nome: "Updated Name",
        email: uniqueEmail,
        password: "newpassword",
        administrador: "true"
      });

    expect(putResponse.status).toBe(200);

    const getResponse = await request(app).get(`/usuarios/${userId}`);
    expect(getResponse.status).toBe(200);
    expect(getResponse.body.nome).toBe("Updated Name");
    expect(getResponse.body.administrador).toBe("true");
  });

  it("should delete an existing user successfully", async () => {
    const uniqueEmail = "del_test_email@test.com";
    const postResponse = await request(app)
      .post("/usuarios")
      .send({
        nome: "To Delete",
        email: uniqueEmail,
        password: "password",
        administrador: "false"
      });

    const userId = postResponse.body._id;

    const deleteResponse = await request(app).delete(`/usuarios/${userId}`);
    expect(deleteResponse.status).toBe(200);

    const getResponse = await request(app).get(`/usuarios/${userId}`);
    expect(getResponse.status).toBe(400);
  });
});
