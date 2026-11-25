import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it("should parse a basic query string", () => {
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

  it("should handle omitted arguments or empty strings", () => {
    expect(parseQuery()).toEqual({});
    expect(parseQuery("")).toEqual({});
  });

  it("should ignore prototype pollution keys (__proto__ and constructor)", () => {
    const input = "__proto__=bar&constructor=baz&safe=ok";
    const expected = { safe: "ok" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle keys without values or empty values", () => {
    const input = "foo=&bar";
    const expected = { foo: "", bar: "" };
    expect(parseQuery(input)).toEqual(expected);
  });
});

describe("encodeQueryItem", () => {
  it("should encode a simple key-value pair", () => {
    const result = encodeQueryItem("message", "Hello World");
    expect(result).toBe("message=Hello+World");
  });

  it("should encode an array of values with the same key", () => {
    const result = encodeQueryItem("tags", ["javascript", "web", "dev"]);
    expect(result).toBe("tags=javascript&tags=web&tags=dev");
  });

  it("should handle numbers and booleans", () => {
    expect(encodeQueryItem("count", 42)).toBe("count=42");
    expect(encodeQueryItem("active", true)).toBe("active=true");
  });

  it("should handle falsy/empty values by encoding only the key", () => {
    expect(encodeQueryItem("empty", "")).toBe("empty");
    expect(encodeQueryItem("missing", undefined)).toBe("missing");
    expect(encodeQueryItem("nullVal", null)).toBe("nullVal");
  });
});

describe("stringifyQuery", () => {
  it("should stringify a query object", () => {
    const query = { foo: "bar", baz: "qux" };
    expect(stringifyQuery(query)).toBe("foo=bar&baz=qux");
  });

  it("should omit undefined values", () => {
    const query = { foo: "bar", baz: undefined };
    expect(stringifyQuery(query)).toBe("foo=bar");
  });

  it("should handle arrays and primitive values in query object", () => {
    const query = { tags: ["javascript", "web"], count: 5 };
    expect(stringifyQuery(query)).toBe("tags=javascript&tags=web&count=5");
  });

  it("should return an empty string for an empty query object", () => {
    expect(stringifyQuery({})).toBe("");
  });
});
