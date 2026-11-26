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
});
