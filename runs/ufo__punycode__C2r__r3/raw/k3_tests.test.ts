import { describe, it, expect } from "vitest";
import { toASCII } from "../../src/punycode";

describe("toASCII", () => {
  it("should return ASCII strings unchanged", () => {
    expect(toASCII("example.com")).toBe("example.com");
  });

  it("should convert non-ASCII domain names to punycode", () => {
    expect(toASCII("münchen.de")).toBe("xn--mnchen-3ya.de");
  });

  it("should handle email addresses with non-ASCII domains", () => {
    expect(toASCII("user@münchen.de")).toBe("user@xn--mnchen-3ya.de");
  });

  it("should normalize dot separators to standard dots", () => {
    expect(toASCII("test。com")).toBe("test.com");
    expect(toASCII("test．com")).toBe("test.com");
    expect(toASCII("test｡com")).toBe("test.com");
  });

  it("should pass through valid ASCII without overflow", () => {
    expect(toASCII("example.com")).toBe("example.com");
  });
});
