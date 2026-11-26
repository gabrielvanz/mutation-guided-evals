import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  const cases = [
    { input: "", expected: {} },
    { input: "?foo=bar", expected: { foo: "bar" } },
    { input: "foo=bar", expected: { foo: "bar" } },
    { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "tags=javascript&tags=web&tags=dev", expected: { tags: ["javascript", "web", "dev"] } },
    { input: "foo=bar&foo=baz", expected: { foo: ["bar", "baz"] } },
    { input: "empty=", expected: { empty: "" } },
    { input: "key-only", expected: { "key-only": "" } },
    { input: "__proto__=polluted", expected: {} },
    { input: "constructor=polluted", expected: {} },
    { input: "foo=bar%20baz", expected: { foo: "bar baz" } },
  ];

  for (const { input, expected } of cases) {
    it(`should parse "${input}" correctly`, () => {
      expect(parseQuery(input)).toEqual(expected);
    });
  }
});

describe("encodeQueryItem", () => {
  const cases = [
    { key: "message", value: "Hello World", expected: "message=Hello+World" },
    { key: "tags", value: ["javascript", "web", "dev"], expected: "tags=javascript&tags=web&tags=dev" },
    { key: "count", value: 42, expected: "count=42" },
    { key: "active", value: true, expected: "active=true" },
    { key: "empty", value: "", expected: "empty" },
    { key: "undef", value: undefined, expected: "undef" },
    { key: "nullVal", value: null, expected: "nullVal" },
  ];

  for (const { key, value, expected } of cases) {
    it(`should encode item key "${key}" with value correctly`, () => {
      expect(encodeQueryItem(key, value as any)).toBe(expected);
    });
  }
});

describe("stringifyQuery", () => {
  const cases = [
    { input: { foo: "bar", baz: "qux" }, expected: "foo=bar&baz=qux" },
    { input: { foo: "bar", baz: undefined }, expected: "foo=bar" },
    { input: { tags: ["javascript", "web"] }, expected: "tags=javascript&tags=web" },
    { input: {}, expected: "" },
    { input: { foo: null }, expected: "foo" },
  ];

  for (const { input, expected } of cases) {
    it("should stringify query object correctly", () => {
      expect(stringifyQuery(input)).toBe(expected);
    });
  }
});
