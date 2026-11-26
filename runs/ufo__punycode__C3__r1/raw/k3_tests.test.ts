import { describe, it, expect } from "vitest";
import { toASCII } from "../../src/punycode";

describe("toASCII", () => {
  it("should return ASCII strings unchanged", () => {
    expect(toASCII("example.com")).toBe("example.com");
    expect(toASCII("test")).toBe("test");
  });

  it("should handle email addresses with domain names", () => {
    expect(toASCII("user@example.com")).toBe("user@example.com");
    expect(toASCII("user@münchen.de")).toBe("user@xn--mnchen-3ya.de");
  });

  it("should convert non-ASCII domain labels using punycode", () => {
    expect(toASCII("münchen.de")).toBe("xn--mnchen-3ya.de");
    expect(toASCII("ñandu.com")).toBe("xn--andu-fqa.com");
  });

  it("should handle various dot separators like ideographic full stop", () => {
    expect(toASCII("münchen．de")).toBe("xn--mnchen-3ya.de");
  });

  it("should process basic characters correctly", () => {
    expect(toASCII("test.com")).toBe("test.com");
  });

  it("should correctly encode astral symbols / surrogate pairs", () => {
    expect(toASCII("𠜎.com")).toBe("xn--4m2i.com");
  });

  it("should correctly encode long strings requiring bias adaptation loops", () => {
    expect(toASCII("mañana-y-mañana-y-mañana")).toBe("xn--maana-y-maana-y-maana-dbcii");
  });
});
