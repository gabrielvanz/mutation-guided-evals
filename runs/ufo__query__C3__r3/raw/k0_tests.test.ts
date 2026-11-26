import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  const cases = [
    { input: "", expected: {} },
    { input: "?foo=bar", expected: { foo: "bar" } },
    { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "?foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "tags=javascript&tags=web&tags=dev", expected: { tags: ["javascript", "web", "dev"] } },
    { input: "foo=bar&foo=baz", expected: { foo: ["bar", "baz"] } },
    { input: "foo&bar=baz", expected: { foo: "", bar: "baz" } },
    { input: "__proto__=polluted&constructor=polluted&safe=val", expected: { safe: "val" } },
    { input: "a=1&b=true&c=false", expected: { a: "1", b: "true", c: "false" } },
    { input: "message=Hello+World", expected: { message: "Hello World" } },
  ];

  for (const { input, expected } of cases) {
    it(`should parse "${input}" correctly`, () => {
      expect(parseQuery(input)).toEqual(expected);
    });
  }

  it("should ignore prototype pollution keys", () => {
    const result = parseQuery("__proto__[foo]=bar&constructor[prototype]=bad");
    expect(result.__proto__).toBeUndefined();
    expect(result.constructor).toBeUndefined();
  });
});

describe("encodeQueryItem", () => {
  const cases = [
    { key: "message", value: "Hello World", expected: "message=Hello+World" },
    { key: "tags", value: ["javascript", "web", "dev"], expected: "tags=javascript&tags=web&tags=dev" },
    { key: "count", value: 42, expected: "count=42" },
    { key: "active", value: true, expected: "active=true" },
    { key: "active", value: false, expected: "active=false" },
    { key: "empty", value: "", expected: "empty" },
    { key: "nullVal", value: null, expected: "nullVal" },
    { key: "undefVal", value: undefined, expected: "undefVal" },
  ];

  for (const { key, value, expected } of cases) {
    it(`should encode item ${key}=${JSON.stringify(value)} correctly`, () => {
      expect(encodeQueryItem(key, value as any)).toBe(expected);
    });
  }
});

describe("stringifyQuery", () => {
  const cases = [
    { input: { foo: "bar", baz: "qux" }, expected: "foo=bar&baz=qux" },
    { input: { foo: "bar", baz: undefined }, expected: "foo=bar" },
    { input: { tags: ["javascript", "web", "dev"] }, expected: "tags=javascript&tags=web&tags=dev" },
    { input: {}, expected: "" },
    { input: { a: 1, b: true, c: false }, expected: "a=1&b=true&c=false" },
    { input: { message: "Hello World" }, expected: "message=Hello+World" },
  ];

  for (const { input, expected } of cases) {
    it(`should stringify query object correctly`, () => {
      expect(stringifyQuery(input)).toBe(expected);
    });
  }
});
