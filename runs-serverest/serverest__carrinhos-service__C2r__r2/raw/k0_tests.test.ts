import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("extrairProdutosDuplicados", () => {
  it("should return an empty array when there are no duplicate products", () => {
    const produtos = [
      { idProduto: "1", quantidade: 2 },
      { idProduto: "2", quantidade: 1 }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual([]);
  });

  it("should return duplicate product IDs when products are repeated", () => {
    const produtos = [
      { idProduto: "1", quantidade: 2 },
      { idProduto: "2", quantidade: 1 },
      { idProduto: "1", quantidade: 3 },
      { idProduto: "3", quantidade: 1 },
      { idProduto: "2", quantidade: 1 }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual(["1", "2"]);
  });

  it("should handle empty product arrays", () => {
    const result = carrinhosService.extrairProdutosDuplicados([]);
    expect(result).toEqual([]);
  });
});

describe("precoTotal", () => {
  it("should calculate the correct total price for multiple products", () => {
    const produtos = [
      { precoUnitario: 10.5, quantidade: 2 },
      { precoUnitario: 5, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(41);
  });

  it("should return 0 for an empty product array", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate the correct total quantity for multiple products", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 },
      { quantidade: 1 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(8);
  });

  it("should return 0 for an empty product array", () => {
    const result = carrinhosService.quantidadeTotal([]);
    expect(result).toBe(0);
  });
});

describe("totaisSaoSeguros", () => {
  it("should return true when both totals are safe integers", () => {
    const result = carrinhosService.totaisSaoSeguros(100, 10);
    expect(result).toBe(true);
  });

  it("should return false when price total is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(Number.MAX_SAFE_INTEGER + 1, 10);
    expect(result).toBe(false);
  });

  it("should return false when quantity total is not a safe integer", () => {
    const result = carrinhosService.totaisSaoSeguros(100, Number.MAX_SAFE_INTEGER + 1);
    expect(result).toBe(false);
  });

  it("should return false when totals are floating point numbers", () => {
    const result = carrinhosService.totaisSaoSeguros(10.5, 2);
    expect(result).toBe(false);
  });
});
