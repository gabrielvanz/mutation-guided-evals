import { describe, it, expect } from "vitest";
import { $URL, createURL } from "../../src/url";

describe("$URL", () => {
  it("should parse absolute URL correctly", () => {
    const url = new $URL("https://example.com/path?foo=bar#hash");
    expect(url.protocol).toBe("https:");
    expect(url.host).toBe("example.com");
    expect(url.pathname).toBe("/path");
    expect(url.query).toEqual({ foo: "bar" });
    expect(url.hash).toBe("#hash");
    expect(url.href).toBe("https://example.com/path?foo=bar#hash");
  });

  it("should handle empty input with default value", () => {
    const url = new $URL();
    expect(url.protocol).toBe("");
    expect(url.host).toBe("");
    expect(url.pathname).toBe("");
    expect(url.href).toBe("");
  });

  it("should throw TypeError on non-string input", () => {
    expect(() => new $URL(123 as any)).toThrow(TypeError);
    expect(() => new $URL(123 as any)).toThrow("URL input should be string received number (123)");
  });

  it("should expose correct getters for hostname, port, username, password", () => {
    const url = new $URL("http://user:pass@example.com:8080/path");
    expect(url.hostname).toBe("example.com");
    expect(url.port).toBe("8080");
    expect(url.username).toBe("user");
    expect(url.password).toBe("pass");
    expect(url.encodedAuth).toBe("user:pass");
  });

  it("should calculate hasProtocol and isAbsolute correctly", () => {
    const absoluteUrl = new $URL("https://example.com");
    expect(absoluteUrl.hasProtocol).toBe(6);
    expect(absoluteUrl.isAbsolute).toBe(6);

    const relativeUrl = new $URL("/path/to/somewhere");
    expect(relativeUrl.hasProtocol).toBe(0);
    expect(relativeUrl.isAbsolute).toBe(true);

    const relativePath = new $URL("path/to/somewhere");
    expect(relativePath.hasProtocol).toBe(0);
    expect(relativePath.isAbsolute).toBe(false);
  });

  it("should generate search and searchParams correctly", () => {
    const url = new $URL("https://example.com/?a=1&b=2");
    expect(url.search).toBe("?a=1&b=2");
    const params = url.searchParams;
    expect(params.get("a")).toBe("1");
    expect(params.get("b")).toBe("2");
  });

  it("should generate origin and fullpath correctly", () => {
    const url = new $URL("https://example.com:8080/path?query=1#hash");
    expect(url.origin).toBe("https://example.com:8080");
    expect(url.fullpath).toBe("/path?query=1#hash");
  });

  it("should support toJSON and toString", () => {
    const url = new $URL("https://example.com/test");
    expect(url.toString()).toBe("https://example.com/test");
    expect(url.toJSON()).toBe("https://example.com/test");
  });

  describe("append", () => {
    it("should throw error when appending a URL with protocol", () => {
      const base = new $URL("https://example.com/base");
      const other = new $URL("https://other.com/path");
      expect(() => base.append(other)).toThrow("Cannot append a URL with protocol");
    });

    it("should append pathname, query, and hash correctly", () => {
      const base = new $URL("https://example.com/base/?a=1");
      const other = new $URL("/subpath?b=2#newhash");
      base.append(other);
      expect(base.pathname).toBe("/base/subpath");
      expect(base.query).toEqual({ a: "1", b: "2" });
      expect(base.hash).toBe("#newhash");
      expect(base.href).toBe("https://example.com/base/subpath?a=1&b=2#newhash");
    });
  });
});

describe("createURL", () => {
  it("should create a $URL instance", () => {
    const url = createURL("https://example.com/foo");
    expect(url).toBeInstanceOf($URL);
    expect(url.href).toBe("https://example.com/foo");
  });
});
