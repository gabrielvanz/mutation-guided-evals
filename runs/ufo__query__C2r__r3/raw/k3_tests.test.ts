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

  it("should handle duplicate keys as arrays", () => {
    const input = "tags=javascript&tags=web&tags=dev";
    const expected = { tags: ["javascript", "web", "dev"] };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle empty or omitted parameter strings", () => {
    expect(parseQuery()).toEqual({});
    expect(parseQuery("")).toEqual({});
    expect(parseQuery("?")).toEqual({});
  });

  it("should ignore prototype pollution keys", () => {
    const input = "__proto__=bar&constructor=baz&safe=value";
    const expected = { safe: "value" };
    expect(parseQuery(input)).toEqual(expected);
  });

  it("should handle keys without values or empty values", () => {
    const input = "foo=&bar";
    const expected = { foo: "", bar: "" };
    expect(parseQuery(input)).toEqual(expected);
  });
});

describe("encodeQueryItem", () => {
  it("should encode single key-value pair", () => {
    expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
  });

  it("should encode array values as multiple query items", () => {
    expect(encodeQueryItem("tags", ["javascript", "web", "dev"])).toBe(
      "tags=javascript&tags=web&tags=dev",
    );
  });

  it("should convert numbers and booleans to strings", () => {
    expect(encodeQueryItem("count", 42)).toBe("count=42");
    expect(encodeQueryItem("active", true)).toBe("active=true");
  });

  it("should encode only key when value is falsy/empty", () => {
    expect(encodeQueryItem("empty", "")).toBe("empty");
    expect(encodeQueryItem("missing", undefined)).toBe("missing");
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
    const query = { tags: ["a", "b"], count: 1, active: false };
    expect(stringifyQuery(query)).toBe("tags=a&tags=b&count=1&active=false");
  });

  it("should return empty string for empty objects", () => {
    expect(stringifyQuery({})).toBe("");
  });
});
