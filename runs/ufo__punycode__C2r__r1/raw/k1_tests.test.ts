import { describe, it, expect } from "vitest";
import { toASCII } from "../../src/punycode";

describe("toASCII", () => {
  it("should return ASCII strings unchanged", () => {
    const cases = [
      { input: "example.com", expected: "example.com" },
      { input: "test", expected: "test" },
      { input: "123.456", expected: "123.456" },
      { input: "", expected: "" }
    ];

    for (const { input, expected } of cases) {
      expect(toASCII(input)).toBe(expected);
    }
  });

  it("should convert internationalized domain names to punycode", () => {
    const cases = [
      { input: "münchen.de", expected: "xn--mnchen-3ya.de" },
      { input: "ñandu.com", expected: "xn--andu-fqa.com" },
      { input: "中文.com", expected: "xn--fiq228c.com" },
      { input: "العربية.test", expected: "xn--mgbcd4a2b0d2b.test" }
    ];

    for (const { input, expected } of cases) {
      expect(toASCII(input)).toBe(expected);
    }
  });

  it("should handle email addresses with domain parts requiring punycode", () => {
    expect(toASCII("user@münchen.de")).toBe("user@xn--mnchen-3ya.de");
    expect(toASCII("test@中文.com")).toBe("test@xn--fiq228c.com");
  });

  it("should handle alternative dot separators", () => {
    expect(toASCII("münchen\u3002de")).toBe("xn--mnchen-3ya.de");
    expect(toASCII("münchen\uff0ede")).toBe("xn--mnchen-3ya.de");
  });

  it("should handle basic inputs or non-throwing edge cases", () => {
    expect(toASCII("example.com")).toBe("example.com");
  });
});
