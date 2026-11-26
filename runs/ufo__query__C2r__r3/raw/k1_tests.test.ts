import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  it("should parse standard query strings", () => {
    const cases = [
      { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
      { input: "?foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
      { input: "", expected: {} },
      { input: "foo", expected: { foo: "" } },
      { input: "foo=", expected: { foo: "" } },
      { input: "tags=javascript&tags=web&tags=dev", expected: { tags: ["javascript", "web", "dev"] } },
      { input: "foo=bar&foo=baz", expected: { foo: ["bar", "baz"] } },
      { input: "number=123&bool=true", expected: { number: "123", bool: "true" } },
      { input: "__proto__=polluted&constructor=bad", expected: {} },
    ];

    for (const { input, expected } of cases) {
      expect(parseQuery(input)).toEqual(expected);
    }
  });

  it("should handle omitted arguments", () => {
    expect(parseQuery()).toEqual({});
  });
});

describe("encodeQueryItem", () => {
  it("should encode keys and values correctly", () => {
    const cases = [
      { key: "message", value: "Hello World", expected: "message=Hello+World" },
      { key: "tags", value: ["javascript", "web"], expected: "tags=javascript&tags=web" },
      { key: "count", value: 42, expected: "count=42" },
      { key: "active", value: true, expected: "active=true" },
      { key: "empty", value: "", expected: "empty" },
      { key: "nil", value: null, expected: "nil" },
      { key: "undef", value: undefined, expected: "undef" },
    ];

    for (const { key, value, expected } of cases) {
      expect(encodeQueryItem(key, value as any)).toBe(expected);
    }
  });
});

describe("stringifyQuery", () => {
  it("should stringify query objects into query strings", () => {
    const cases = [
      { input: { foo: "bar", baz: "qux" }, expected: "foo=bar&baz=qux" },
      { input: { foo: "bar", baz: undefined }, expected: "foo=bar" },
      { input: { tags: ["javascript", "web", "dev"] }, expected: "tags=javascript&tags=web&tags=dev" },
      { input: {}, expected: "" },
      { input: { a: 1, b: false }, expected: "a=1&b=false" },
    ];

    for (const { input, expected } of cases) {
      expect(stringifyQuery(input)).toBe(expected);
    }
  });
});
