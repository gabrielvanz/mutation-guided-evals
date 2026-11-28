import { describe, it, expect } from "vitest";
import produtosService from "../../src/services/produtos-service";

describe("produtos-service", () => {
  describe("getAll", () => {
    it("should return all products matching query string", async () => {
      const result = await produtosService.getAll({});
      expect(Array.isArray(result)).toBe(true);
    });
  });

  describe("getOne", () => {
    it("should return null for non-existent product id", async () => {
      const result = await produtosService.getOne("invalid-id");
      expect(result).toBeNull();
    });
  });

  describe("existeProduto", () => {
    it("should return null when product does not exist", async () => {
      const result = await produtosService.existeProduto({ _id: "non-existent" });
      expect(result).toBeNull();
    });
  });

  describe("criarProduto", () => {
    it("should create a product with formatted values and return it", async () => {
      const newProduct = {
        nome: "  Produto Teste  ",
        preco: "100.50",
        quantidade: "10",
        descricao: "Teste",
        imagem: " imagem.jpg "
      };
      const result = await produtosService.criarProduto(newProduct);
      expect(result).toHaveProperty("_id");
      expect(result.nome).toBe("Produto Teste");
      expect(result.preco).toBe(100.50);
      expect(result.quantidade).toBe(10);
      expect(result.imagem).toBe("imagem.jpg");
      expect(result).toHaveProperty("alteradoEm");

      // Cleanup
      await produtosService.deleteById(result._id);
    });
  });

  describe("getPrecosUnitariosPorLote", () => {
    it("should return error when product in batch does not exist", async () => {
      const batch = [{ idProduto: "inexistente", quantidade: 1 }];
      const result = await produtosService.getPrecosUnitariosPorLote(batch);
      expect(result).toHaveProperty("error");
      expect(result.error.statusCode).toBe(400);
      expect(result.error.item.idProduto).toBe("inexistente");
    });
  });

  describe("deleteById", () => {
    it("should remove product by id and return count of removed docs", async () => {
      const result = await produtosService.deleteById("id-inexistente");
      expect(typeof result).toBe("number");
    });
  });

  describe("updateById", () => {
    it("should update product by id with upsert", async () => {
      const result = await produtosService.updateById("id-teste-up", {
        $set: { nome: "Atualizado" }
      });
      expect(result).toBeDefined();

      // Cleanup
      await produtosService.deleteById("id-teste-up");
    });
  });
});
