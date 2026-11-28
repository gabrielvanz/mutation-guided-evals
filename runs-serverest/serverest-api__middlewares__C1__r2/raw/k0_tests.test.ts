import { describe, it, expect } from "vitest";
import request from "supertest";
import app from "../../src/app";

describe("Middlewares API tests", () => {
  it("should return 401 when token is missing for protected routes", async () => {
    const response = await request(app).post("/carrinhos").send({ produtos: [] });
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 401 when token format is invalid", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("Authorization", "InvalidFormat token123")
      .send({ produtos: [] });
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should return 401 when token is expired or invalid", async () => {
    const response = await request(app)
      .post("/carrinhos")
      .set("Authorization", "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.invalid.signature")
      .send({ produtos: [] });
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty("message");
  });

  it("should handle malformed JSON body via error handler returning 400", async () => {
    const response = await request(app)
      .post("/usuarios")
      .set("Content-Type", "application/json")
      .send("{ malformed json ");
    expect(response.status).toBe(400);
  });
});
