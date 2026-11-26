import { describe, it, expect } from "vitest";
import { $URL, createURL } from "../../src/url";

describe("$URL", () => {
  it("should parse absolute URL with protocol, host, pathname, query and hash", () => {
    const url = new $URL("https://example.com:8080/path/to/page?foo=bar#hash");
    expect(url.protocol).toBe("https:");
    expect(url.host).toBe("example.com:8080");
    expect(url.hostname).toBe("example.com");
    expect(url.port).toBe("8080");
    expect(url.pathname).toBe("/path/to/page");
    expect(url.query).toEqual({ foo: "bar" });
    expect(url.hash).toBe("#hash");
    expect(url.search).toBe("?foo=bar");
    expect(url.origin).toBe("https://example.com:8080");
    expect(url.href).toBe("https://example.com:8080/path/to/page?foo=bar#hash");
  });

  it("should handle default empty input", () => {
    const url = new $URL();
    expect(url.protocol).toBe("");
    expect(url.host).toBe("");
    expect(url.pathname).toBe("");
    expect(url.query).toEqual({});
    expect(url.hash).toBe("");
    expect(url.href).toBe("");
    expect(url.toString()).toBe("");
    expect(url.toJSON()).toBe("");
  });

  it("should handle authentication details", () => {
    const url = new $URL("https://user:pass@example.com/");
    expect(url.username).toBe("user");
    expect(url.password).toBe("pass");
    expect(url.auth).toBe("user:pass");
    expect(url.encodedAuth).toBe("user:pass");
    expect(url.href).toBe("https://user:pass@example.com/");
  });

  it("should handle username without password", () => {
    const url = new $URL("https://user@example.com/");
    expect(url.username).toBe("user");
    expect(url.password).toBe("");
    expect(url.auth).toBe("user");
    expect(url.encodedAuth).toBe("user");
  });

  it("should return empty encodedAuth when auth is missing", () => {
    const url = new $URL("https://example.com/");
    expect(url.encodedAuth).toBe("");
  });

  it("should calculate hasProtocol and isAbsolute correctly", () => {
    const absUrl = new $URL("https://example.com");
    expect(absUrl.hasProtocol).toBeTruthy();
    expect(absUrl.isAbsolute).toBeTruthy();

    const relUrl = new $URL("/foo/bar");
    expect(relUrl.hasProtocol).toBeFalsy();
    expect(relUrl.isAbsolute).toBeTruthy();

    const relativePath = new $URL("foo/bar");
    expect(relativePath.hasProtocol).toBeFalsy();
    expect(relativePath.isAbsolute).toBeFalsy();
  });

  it("should generate searchParams correctly", () => {
    const url = new $URL("https://example.com/?a=1&b=2&a=3");
    const params = url.searchParams;
    expect(params.get("a")).toBe("1");
    expect(params.getAll("a")).toEqual(["1", "3"]);
    expect(params.get("b")).toBe("2");
  });

  it("should handle array and non-string values in searchParams", () => {
    const url = new $URL("https://example.com");
    url.query = { tags: ["vue", "react"], count: 10 as unknown as string };
    const params = url.searchParams;
    expect(params.getAll("tags")).toEqual(["vue", "react"]);
    expect(params.get("count")).toBe("10");
  });

  it("should throw TypeError on non-string input", () => {
    expect(() => new $URL(123 as unknown as string)).toThrow(TypeError);
    expect(() => new $URL(123 as unknown as string)).toThrow(
      "URL input should be string received number (123)"
    );
  });

  describe("append", () => {
    it("should append pathname, query and hash", () => {
      const base = new $URL("https://example.com/base?a=1#old");
      const other = new $URL("/sub?b=2#new");
      base.append(other);
      expect(base.pathname).toBe("/base/sub");
      expect(base.query).toEqual({ a: "1", b: "2" });
      expect(base.hash).toBe("#new");
      expect(base.href).toBe("https://example.com/base/sub?a=1&b=2#new");
    });

    it("should throw error when appending a URL with protocol", () => {
      const base = new $URL("https://example.com/base");
      const other = new $URL("https://other.com/sub");
      expect(() => base.append(other)).toThrow(
        "Cannot append a URL with protocol"
      );
    });

    it("should not modify pathname or hash if they are empty on appended url", () => {
      const base = new $URL("https://example.com/base?a=1#hash");
      const other = new $URL("?b=2");
      base.append(other);
      expect(base.pathname).toBe("/base");
      expect(base.hash).toBe("#hash");
      expect(base.query).toEqual({ a: "1", b: "2" });
    });
  });
});

describe("createURL", () => {
  it("should create an instance of $URL", () => {
    const url = createURL("https://example.com/test");
    expect(url).toBeInstanceOf($URL);
    expect(url.href).toBe("https://example.com/test");
  });
});
