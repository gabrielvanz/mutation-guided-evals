import { describe, it, expect } from "vitest";
import produtosService from "../../src/services/produtos-service";

describe("produtos-service", () => {
  describe("getAll", () => {
    it("should return all products matching query string", async () => {
      const produtos = await produtosService.getAll({});
      expect(Array.isArray(produtos)).toBe(true);
    });
  });

  describe("getOne", () => {
    it("should return null when product does not exist", async () => {
      const produto = await produtosService.getOne("id-inexistente");
      expect(produto).toBeNull();
    });
  });

  describe("existeProduto", () => {
    it("should return null when product is not found", async () => {
      const resultado = await produtosService.existeProduto({ _id: "inexistente" });
      expect(resultado).toBeNull();
    });
  });

  describe("deleteById", () => {
    it("should delete product by id and return count of removed docs", async () => {
      const removidos = await produtosService.deleteById("id-inexistente");
      expect(removidos).toBe(0);
    });
  });

  describe("getPrecosUnitariosPorLote", () => {
    it("should return error when product in batch does not exist", async () => {
      const resultado = await produtosService.getPrecosUnitariosPorLote([
        { idProduto: "inexistente", quantidade: 1 }
      ]);
      expect(resultado).toHaveProperty("error");
      expect(resultado.error.statusCode).toBe(400);
    });
  });
});
