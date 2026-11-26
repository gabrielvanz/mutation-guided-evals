import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it("should parse basic query string", () => {
    const input = "foo=bar&baz=qux";
    const expected = { foo: "bar", baz: "qux" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should parse query string with leading question mark", () => {
    const input = "?foo=bar&baz=qux";
    const expected = { foo: "bar", baz: "qux" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should parse duplicate keys into an array", () => {
    const input = "tags=javascript&tags=web&tags=dev";
    const expected = { tags: ["javascript", "web", "dev"] };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle empty input", () => {
    expect(parseQuery("")).toEqual({});
    expect(parseQuery()).toEqual({});
  });

  it("should ignore prototype pollution keys", () => {
    const input = "__proto__=polluted&constructor=polluted&foo=bar";
    const expected = { foo: "bar" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle parameters without values", () => {
    const input = "foo&bar=";
    const expected = { foo: "", bar: "" };
    expect(parseQuery(input)).toEqual(expected);
  });
});

describe("encodeQueryItem", () => {
  it("should encode simple key-value pairs", () => {
    expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
  });

  it("should encode numbers and booleans", () => {
    expect(encodeQueryItem("count", 42)).toBe("count=42");
    expect(encodeQueryItem("active", true)).toBe("active=true");
  });

  it("should encode arrays into multiple pairs", () => {
    expect(encodeQueryItem("tags", ["javascript", "web", "dev"])).toBe(
      "tags=javascript&tags=web&tags=dev",
    );
  });

  it("should handle empty or falsy values by returning only the key", () => {
    expect(encodeQueryItem("foo", "")).toBe("foo");
    expect(encodeQueryItem("foo", undefined)).toBe("foo");
    expect(encodeQueryItem("foo", null)).toBe("foo");
  });
});

describe("stringifyQuery", () => {
  it("should stringify a query object", () => {
    const query = { foo: "bar", baz: "qux" };
    expect(stringifyQuery(query)).toBe("foo=bar&baz=qux");
  });

  it("should filter out undefined values", () => {
    const query = { foo: "bar", baz: undefined };
    expect(stringifyQuery(query)).toBe("foo=bar");
  });

  it("should handle arrays and various types", () => {
    const query = { tags: ["a", "b"], count: 5 };
    expect(stringifyQuery(query)).toBe("tags=a&tags=b&count=5");
  });

  it("should handle empty objects", () => {
    expect(stringifyQuery({})).toBe("");
  });
});
