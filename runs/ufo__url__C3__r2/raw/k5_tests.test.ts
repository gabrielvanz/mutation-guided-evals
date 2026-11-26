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
    expect(url.hostname).toBe("example.com");
    expect(url.port).toBe("");
    expect(url.hasProtocol).toBe(6);
    expect(url.isAbsolute).toBe(6);
    expect(url.search).toBe("?foo=bar");
    expect(url.origin).toBe("https://example.com");
    expect(url.href).toBe("https://example.com/path?foo=bar#hash");
  });

  it("should parse relative URL correctly", () => {
    const url = new $URL("/foo/bar?a=1");
    expect(url.protocol).toBe("");
    expect(url.host).toBe("");
    expect(url.pathname).toBe("/foo/bar");
    expect(url.query).toEqual({ a: "1" });
    expect(url.hash).toBe("");
    expect(url.hasProtocol).toBe(0);
    expect(url.isAbsolute).toBe(true);
    expect(url.href).toBe("/foo/bar?a=1");
  });

  it("should handle empty input with default value", () => {
    const url = new $URL();
    expect(url.pathname).toBe("");
    expect(url.href).toBe("");
  });

  it("should throw TypeError on invalid input type", () => {
    // @ts-expect-error testing invalid input type at runtime
    expect(() => new $URL(123)).toThrow(TypeError);
    // @ts-expect-error testing invalid input type at runtime
    expect(() => new $URL(null)).toThrow("URL input should be string received object (null)");
  });

  it("should parse host with port", () => {
    const url = new $URL("http://localhost:3000/test");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("3000");
    expect(url.origin).toBe("http://localhost:3000");
  });

  it("should parse username and password from auth", () => {
    const url = new $URL("https://user:pass@example.com/");
    expect(url.username).toBe("user");
    expect(url.password).toBe("pass");
    expect(url.encodedAuth).toBe("user:pass");
  });

  it("should provide searchParams correctly", () => {
    const url = new $URL("https://example.com/?a=1&b=2");
    const params = url.searchParams;
    expect(params.get("a")).toBe("1");
    expect(params.get("b")).toBe("2");
  });

  it("should handle array values in query and searchParams", () => {
    const url = new $URL("https://example.com/?tag=a&tag=b");
    expect(url.query).toEqual({ tag: ["a", "b"] });
    expect(url.searchParams.getAll("tag")).toEqual(["a", "b"]);
  });

  it("should serialize to JSON and string", () => {
    const url = new $URL("https://example.com/foo");
    expect(url.toJSON()).toBe("https://example.com/foo");
    expect(url.toString()).toBe("https://example.com/foo");
  });

  describe("append", () => {
    it("should append query, pathname and hash", () => {
      const base = new $URL("https://example.com/base?a=1");
      const other = new $URL("/path?b=2#newhash");

      base.append(other);
      expect(base.pathname).toBe("/base/path");
      expect(base.query).toEqual({ a: "1", b: "2" });
      expect(base.hash).toBe("#newhash");
      expect(base.href).toBe("https://example.com/base/path?a=1&b=2#newhash");
    });

    it("should throw error when appending a URL with protocol", () => {
      const base = new $URL("https://example.com/");
      const other = new $URL("https://other.com/");

      expect(() => base.append(other)).toThrow("Cannot append a URL with protocol");
    });
  });
});

describe("createURL", () => {
  it("should create a $URL instance", () => {
    const url = createURL("https://example.com/test");
    expect(url).toBeInstanceOf($URL);
    expect(url.href).toBe("https://example.com/test");
  });
});
