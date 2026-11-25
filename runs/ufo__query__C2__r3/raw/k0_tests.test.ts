import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it("should parse basic query string", () => {
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

  it("should handle empty string and omitted arguments", () => {
    expect(parseQuery("")).toEqual({});
    expect(parseQuery()).toEqual({});
  });

  it("should ignore prototype pollution keys", () => {
    const input = "__proto__=polluted&constructor=polluted&foo=bar";
    const expected = { foo: "bar" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle keys without explicit values", () => {
    const input = "foo&bar=";
    const expected = { foo: "", bar: "" };
    expect(parseQuery(input)).toEqual(expected);
  });
});

describe("encodeQueryItem", () => {
  it("should encode primitive values correctly", () => {
    expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
    expect(encodeQueryItem("count", 42)).toBe("count=42");
    expect(encodeQueryItem("active", true)).toBe("active=true");
  });

  it("should encode arrays as repeated items", () => {
    expect(encodeQueryItem("tags", ["javascript", "web", "dev"])).toBe(
      "tags=javascript&tags=web&tags=dev",
    );
  });

  it("should handle falsy values", () => {
    expect(encodeQueryItem("foo", "")).toBe("foo");
    expect(encodeQueryItem("foo", null)).toBe("foo");
    expect(encodeQueryItem("foo", undefined)).toBe("foo");
  });
});

describe("stringifyQuery", () => {
  it("should stringify query object correctly", () => {
    const input = { foo: "bar", baz: "qux" };
    const expected = "foo=bar&baz=qux";
    expect(stringifyQuery(input)).toBe(expected);
  });

  it("should filter out undefined values", () => {
    const input = { foo: "bar", baz: undefined };
    const expected = "foo=bar";
    expect(stringifyQuery(input)).toBe(expected);
  });

  it("should handle arrays and numbers and booleans", () => {
    const input = { tags: ["a", "b"], count: 5, active: false };
    const expected = "tags=a&tags=b&count=5&active=false";
    expect(stringifyQuery(input)).toBe(expected);
  });

  it("should handle empty query object", () => {
    expect(stringifyQuery({})).toBe("");
  });
});
