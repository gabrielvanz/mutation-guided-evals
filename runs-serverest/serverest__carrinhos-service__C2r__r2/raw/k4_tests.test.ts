import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("extrairProdutosDuplicados", () => {
  it("should return an empty array when there are no duplicate products", () => {
    const produtos = [
      { idProduto: "prod1" },
      { idProduto: "prod2" },
      { idProduto: "prod3" }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual([]);
  });

  it("should return duplicate product IDs when products are repeated", () => {
    const produtos = [
      { idProduto: "prod1" },
      { idProduto: "prod2" },
      { idProduto: "prod1" },
      { idProduto: "prod3" },
      { idProduto: "prod2" }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual(["prod1", "prod2"]);
  });

  it("should handle empty product array", () => {
    const result = carrinhosService.extrairProdutosDuplicados([]);
    expect(result).toEqual([]);
  });
});

describe("precoTotal", () => {
  it("should calculate total price correctly for multiple products", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 5.5, quantidade: 4 },
      { precoUnitario: 100, quantidade: 1 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(142);
  });

  it("should return zero for empty product array", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate total quantity correctly for multiple products", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 },
      { quantidade: 10 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(17);
  });

  it("should return zero for empty product array", () => {
    const result = carrinhosService.quantidadeTotal([]);
    expect(result).toBe(0);
  });
});

describe("totaisSaoSeguros", () => {
  it("should return true when both totals are safe integers", () => {
    const result = carrinhosService.totaisSaoSeguros(100, 5);
    expect(result).toBe(true);
  });

  it("should return false when price total is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(Number.MAX_SAFE_INTEGER + 1, 5);
    expect(result).toBe(false);
  });

  it("should return false when quantity total is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(100, Number.MAX_SAFE_INTEGER + 1);
    expect(result).toBe(false);
  });

  it("should return false when totals are floats or invalid", () => {
    const result = carrinhosService.totaisSaoSeguros(10.5, 2);
    expect(result).toBe(false);
  });
});
