import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it("should parse a simple query string", () => {
    const input = "foo=bar&baz=qux";
    const expected = { foo: "bar", baz: "qux" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle leading question mark", () => {
    const input = "?foo=bar&baz=qux";
    const expected = { foo: "bar", baz: "qux" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should parse repeated keys into an array", () => {
    const input = "tags=javascript&tags=web&tags=dev";
    const expected = { tags: ["javascript", "web", "dev"] };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle omitted parameters string", () => {
    expect(parseQuery()).toEqual({});
  });

  it("should handle empty string", () => {
    expect(parseQuery("")).toEqual({});
  });

  it("should handle values without equals sign", () => {
    const input = "foo";
    expect(parseQuery(input)).toEqual({ foo: "" });
  });

  it("should prevent prototype pollution via __proto__ or constructor", () => {
    const input = "__proto__=polluted&constructor=polluted&foo=bar";
    const expected = { foo: "bar" };
    const result = parseQuery(input);
    expect(result).toEqual(expected);
    expect(({} as any).polluted).toBeUndefined();
  });

  it("should decode percent-encoded keys and values", () => {
    const input = "hello%20world=foo%2gbar";
    const result = parseQuery(input);
    expect(result).toEqual({ "hello world": "foo%2gbar" });
  });
});

describe("encodeQueryItem", () => {
  it("should encode a simple key and string value", () => {
    expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
  });

  it("should encode numeric and boolean values", () => {
    expect(encodeQueryItem("count", 42)).toBe("count=42");
    expect(encodeQueryItem("active", true)).toBe("active=true");
  });

  it("should encode an array of values", () => {
    expect(encodeQueryItem("tags", ["javascript", "web", "dev"])).toBe(
      "tags=javascript&tags=web&tags=dev",
    );
  });

  it("should handle null or undefined values", () => {
    expect(encodeQueryItem("foo", null)).toBe("foo");
    expect(encodeQueryItem("foo", undefined)).toBe("foo");
  });
});

describe("stringifyQuery", () => {
  it("should stringify a simple query object", () => {
    const input = { foo: "bar", baz: "qux" };
    expect(stringifyQuery(input)).toBe("foo=bar&baz=qux");
  });

  it("should omit undefined values", () => {
    const input = { foo: "bar", baz: undefined };
    expect(stringifyQuery(input)).toBe("foo=bar");
  });

  it("should stringify query objects with arrays", () => {
    const input = { tags: ["javascript", "web"] };
    expect(stringifyQuery(input)).toBe("tags=javascript&tags=web");
  });

  it("should handle empty query object", () => {
    expect(stringifyQuery({})).toBe("");
  });
});
