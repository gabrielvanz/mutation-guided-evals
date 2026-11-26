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
    expect(url.query).toEqual({});
    expect(url.hash).toBe("");
    expect(url.href).toBe("");
  });

  it("should throw TypeError when input is not a string", () => {
    // @ts-expect-error testing invalid input type at runtime
    expect(() => new $URL(123)).toThrow(TypeError);
    // @ts-expect-error testing invalid input type at runtime
    expect(() => new $URL(123)).toThrow("URL input should be string received number (123)");
  });

  it("should parse host, hostname, and port getters", () => {
    const url = new $URL("http://localhost:8080/test");
    expect(url.host).toBe("localhost:8080");
    expect(url.hostname).toBe("localhost");
    expect(url.port).toBe("8080");
  });

  it("should parse auth, username, password, and encodedAuth getters", () => {
    const url = new $URL("http://user:pass@example.com/");
    expect(url.auth).toBe("user:pass");
    expect(url.username).toBe("user");
    expect(url.password).toBe("pass");
    expect(url.encodedAuth).toBe("user:pass");
  });

  it("should handle empty auth getters", () => {
    const url = new $URL("http://example.com/");
    expect(url.auth).toBe("");
    expect(url.username).toBe("");
    expect(url.password).toBe("");
    expect(url.encodedAuth).toBe("");
  });

  it("should check hasProtocol and isAbsolute", () => {
    const absolute = new $URL("https://example.com");
    expect(absolute.hasProtocol).toBeTruthy();
    expect(absolute.isAbsolute).toBeTruthy();

    const relative = new $URL("/foo/bar");
    expect(relative.hasProtocol).toBe(0);
    expect(relative.isAbsolute).toBeTruthy();

    const relativeNoSlash = new $URL("foo/bar");
    expect(relativeNoSlash.hasProtocol).toBe(0);
    expect(relativeNoSlash.isAbsolute).toBeFalsy();
  });

  it("should return search string and searchParams", () => {
    const url = new $URL("/path?a=1&b=2");
    expect(url.search).toBe("?a=1&b=2");
    expect(url.searchParams.get("a")).toBe("1");
    expect(url.searchParams.get("b")).toBe("2");
  });

  it("should handle array values in searchParams", () => {
    const url = new $URL("/path?tag=a&tag=b");
    expect(url.searchParams.getAll("tag")).toEqual(["a", "b"]);
  });

  it("should return origin and fullpath", () => {
    const url = new $URL("https://example.com:8080/path?q=1#h");
    expect(url.origin).toBe("https://example.com:8080");
    expect(url.fullpath).toBe("/path?q=1#h");
  });

  it("should append another $URL correctly", () => {
    const base = new $URL("https://example.com/base/");
    const toAppend = new $URL("sub/path?foo=bar#newhash");

    base.append(toAppend);

    expect(base.pathname).toBe("/base/sub/path");
    expect(base.query).toEqual({ foo: "bar" });
    expect(base.hash).toBe("#newhash");
  });

  it("should throw error when appending a URL with protocol", () => {
    const base = new $URL("https://example.com/");
    const toAppend = new $URL("https://other.com/path");

    expect(() => base.append(toAppend)).toThrow("Cannot append a URL with protocol");
  });

  it("should serialize via toJSON and toString", () => {
    const url = new $URL("https://example.com/test");
    expect(url.toJSON()).toBe("https://example.com/test");
    expect(url.toString()).toBe("https://example.com/test");
  });
});

describe("createURL", () => {
  it("should create and return an instance of $URL", () => {
    const url = createURL("https://example.com/created");
    expect(url).toBeInstanceOf($URL);
    expect(url.href).toBe("https://example.com/created");
  });
});
