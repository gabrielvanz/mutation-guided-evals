import { describe, it, expect } from "vitest";
import { toASCII } from "../../src/punycode";

describe("toASCII", () => {
  it("should return ASCII strings unchanged", () => {
    const cases = [
      { input: "example.com", expected: "example.com" },
      { input: "test", expected: "test" },
      { input: "123.456", expected: "123.456" }
    ];

    for (const { input, expected } of cases) {
      expect(toASCII(input)).toBe(expected);
    }
  });

  it("should convert non-ASCII domain names to Punycode", () => {
    const cases = [
      { input: "münchen.de", expected: "xn--mnchen-3ya.de" },
      { input: "test.ñ", expected: "test.xn--ida" },
      { input: "añoranza.es", expected: "xn--aoranza-4za.es" }
    ];

    for (const { input, expected } of cases) {
      expect(toASCII(input)).toBe(expected);
    }
  });

  it("should handle email addresses with domain internationalization", () => {
    const cases = [
      { input: "user@münchen.de", expected: "user@xn--mnchen-3ya.de" },
      { input: "test.user@domain.com", expected: "test.user@domain.com" }
    ];

    for (const { input, expected } of cases) {
      expect(toASCII(input)).toBe(expected);
    }
  });

  it("should handle various dot separators like ideographic full stop", () => {
    const input = "münchen\u3002de";
    const expected = "xn--mnchen-3ya.de";
    expect(toASCII(input)).toBe(expected);
  });

  it("should handle empty strings and basic punctuation", () => {
    expect(toASCII("")).toBe("");
    expect(toASCII(".")).toBe(".");
  });

  it("should correctly handle surrogate pairs and multi-character non-ASCII input requiring bias adaptation", () => {
    const cases = [
      { input: "bücher", expected: "xn--bcher-kva" },
      { input: "café", expected: "xn--caf-dma" },
      { input: "💩.com", expected: "xn--ls8h.com" }
    ];

    for (const { input, expected } of cases) {
      expect(toASCII(input)).toBe(expected);
    }
  });
});
