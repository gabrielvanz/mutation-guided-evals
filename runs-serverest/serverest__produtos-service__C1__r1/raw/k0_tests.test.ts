import { describe, it, expect } from "vitest";
import produtosService from "../../src/services/produtos-service";

describe("produtos-service", () => {
  it("should export expected service methods", () => {
    expect(typeof produtosService.getAll).toBe("function");
    expect(typeof produtosService.getOne).toBe("function");
    expect(typeof produtosService.existeProduto).toBe("function");
    expect(typeof produtosService.criarProduto).toBe("function");
    expect(typeof produtosService.getPrecosUnitariosPorLote).toBe("function");
    expect(typeof produtosService.deleteById).toBe("function");
    expect(typeof produtosService.createOrUpdateById).toBe("function");
    expect(typeof produtosService.updateById).toBe("function");
  });

  it("should return product existence as a Promise from existeProduto", async () => {
    const result = await produtosService.existeProduto({ _id: "non-existent-id-12345" });
    expect(result).toBeNull();
  });

  it("should return null when getting a non-existent product", async () => {
    const result = await produtosService.getOne("non-existent-id-12345");
    expect(result).toBeNull();
  });

  it("should return an error in getPrecosUnitariosPorLote when product is missing", async () => {
    const result = await produtosService.getPrecosUnitariosPorLote([
      { idProduto: "missing-id-999", quantidade: 1 }
    ]);
    expect(result).toHaveProperty("error");
    expect(result.error.statusCode).toBe(400);
  });
});
