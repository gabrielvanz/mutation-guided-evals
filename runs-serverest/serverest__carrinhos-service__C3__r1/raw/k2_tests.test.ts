import { describe, it, expect } from "vitest";
import carrinhosService from "../../src/services/carrinhos-service";

describe("getAll", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.getAll).toBe("function");
  });
});

describe("getOne", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.getOne).toBe("function");
  });
});

describe("existeCarrinho", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.existeCarrinho).toBe("function");
  });
});

describe("existeCarrinhoComProduto", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.existeCarrinhoComProduto).toBe("function");
  });
});

describe("criarCarrinho", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.criarCarrinho).toBe("function");
  });
});

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
      { idProduto: "2", quantidade: 1 },
      { idProduto: "3", quantidade: 1 }
    ];
    const result = carrinhosService.extrairProdutosDuplicados(produtos);
    expect(result).toEqual(["1", "2"]);
  });

  it("should return an empty array for an empty input array", () => {
    const result = carrinhosService.extrairProdutosDuplicados([]);
    expect(result).toEqual([]);
  });
});

describe("getProdutosComPrecoUnitarioOuErro", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.getProdutosComPrecoUnitarioOuErro).toBe("function");
  });
});

describe("deleteById", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.deleteById).toBe("function");
  });
});

describe("concluiCompra", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.concluiCompra).toBe("function");
  });
});

describe("removeCarrinho", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.removeCarrinho).toBe("function");
  });
});

describe("getCarrinhoDoUsuario", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.getCarrinhoDoUsuario).toBe("function");
  });
});

describe("usuarioJaPossuiCarrinho", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.usuarioJaPossuiCarrinho).toBe("function");
  });
});

describe("precoTotal", () => {
  it("should calculate the correct total price for multiple products", () => {
    const produtos = [
      { precoUnitario: 10, quantidade: 2 },
      { precoUnitario: 15.5, quantidade: 4 }
    ];
    const result = carrinhosService.precoTotal(produtos);
    expect(result).toBe(82);
  });

  it("should return 0 for an empty product list", () => {
    const result = carrinhosService.precoTotal([]);
    expect(result).toBe(0);
  });
});

describe("quantidadeTotal", () => {
  it("should calculate the total quantity of items in products", () => {
    const produtos = [
      { quantidade: 3 },
      { quantidade: 7 },
      { quantidade: 1 }
    ];
    const result = carrinhosService.quantidadeTotal(produtos);
    expect(result).toBe(11);
  });

  it("should return 0 for an empty product list", () => {
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

  it("should return false when totals are floats or negative appropriately handled", () => {
    const result = carrinhosService.totaisSaoSeguros(10.5, 2);
    expect(result).toBe(false);
  });
});

describe("baixarEstoque", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.baixarEstoque).toBe("function");
  });
});

describe("reabasteceEstoque", () => {
  it("should be defined as a function", () => {
    expect(typeof carrinhosService.reabasteceEstoque).toBe("function");
  });
});
