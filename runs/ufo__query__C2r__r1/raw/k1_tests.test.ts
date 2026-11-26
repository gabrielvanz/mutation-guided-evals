import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  const cases = [
    { input: "", expected: {} },
    { input: "?foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "tags=javascript&tags=web&tags=dev", expected: { tags: ["javascript", "web", "dev"] } },
    { input: "foo=bar&foo=baz", expected: { foo: ["bar", "baz"] } },
    { input: "foo=&bar=baz", expected: { foo: "", bar: "baz" } },
    { input: "foo", expected: { foo: "" } },
    { input: "__proto__=polluted&constructor=polluted&safe=val", expected: { safe: "val" } },
  ];

  for (const { input, expected } of cases) {
    it(`should parse "${input}" correctly`, () => {
      expect(parseQuery(input)).toEqual(expected);
    });
  }

  it("should handle omitted argument by returning an empty object", () => {
    expect(parseQuery()).toEqual({});
  });
});

describe("encodeQueryItem", () => {
  const cases = [
    { key: "message", value: "Hello World", expected: "message=Hello+World" },
    { key: "tags", value: ["javascript", "web", "dev"], expected: "tags=javascript&tags=web&tags=dev" },
    { key: "num", value: 123, expected: "num=123" },
    { key: "active", value: true, expected: "active=true" },
    { key: "empty", value: "", expected: "empty" },
    { key: "nil", value: null, expected: "nil" },
  ];

  for (const { key, value, expected } of cases) {
    it(`should encode key "${key}" with value correctly`, () => {
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
    { input: { num: 42, flag: false }, expected: "num=42&flag=false" },
  ];

  for (const { input, expected } of cases) {
    it(`should stringify query object correctly`, () => {
      expect(stringifyQuery(input)).toBe(expected);
    });
  }
});
