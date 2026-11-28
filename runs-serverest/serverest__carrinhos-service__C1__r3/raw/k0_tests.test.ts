import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("carrinhos-service", () => {
  it("extrairProdutosDuplicados should identify duplicate product IDs", () => {
    const produtos = [
      { idProduto: "1", quantidade: 2 },
      { idProduto: "2", quantidade: 1 },
      { idProduto: "1", quantidade: 3 },
      { idProduto: "3", quantidade: 1 },
      { idProduto: "2", quantidade: 4 }
    ];

    const duplicados = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(duplicados).toEqual(["1", "2"]);
  });

  it("extrairProdutosDuplicados should return empty array if no duplicates exist", () => {
    const produtos = [
      { idProduto: "1", quantidade: 2 },
      { idProduto: "2", quantidade: 1 }
    ];

    const duplicados = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(duplicados).toEqual([]);
  });

  it("precoTotal should calculate correct total price", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 5.5, quantidade: 4 }
    ];

    const total = carrinhosService.precoTotal(produtos);
    expect(total).toBe(42);
  });

  it("quantidadeTotal should calculate correct total quantity", () => {
    const produtos = [
      { quantidade: 2 },
      { quantidade: 5 },
      { quantidade: 3 }
    ];

    const total = carrinhosService.quantidadeTotal(produtos);
    expect(total).toBe(10);
  });

  it("totaisSaoSeguros should return true for safe integer totals", () => {
    const isSafe = carrinhosService.totaisSaoSeguros(100, 10);
    expect(isSafe).toBe(true);
  });

  it("totaisSaoSeguros should return false for unsafe integer totals", () => {
    const isSafe = carrinhosService.totaisSaoSeguros(Number.MAX_SAFE_INTEGER + 1, 10);
    expect(isSafe).toBe(false);
  });
});
