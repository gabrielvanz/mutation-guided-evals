import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("parseQuery", () => {
  const cases = [
    { input: "", expected: {} },
    { input: "?foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "foo=bar&baz=qux", expected: { foo: "bar", baz: "qux" } },
    { input: "tags=javascript&tags=web&tags=dev", expected: { tags: ["javascript", "web", "dev"] } },
    { input: "foo", expected: { foo: "" } },
    { input: "foo=", expected: { foo: "" } },
    { input: "a=1&a=2", expected: { a: ["1", "2"] } },
    { input: "__proto__=polluted&constructor=bad&foo=bar", expected: { foo: "bar" } },
    { input: "hello%20world=foo%2gbar", expected: { "hello world": "foo%2gbar" } },
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
  ];

    for (const { key, value, expected } of cases) {
      it(`should encode key "${key}" with value ${JSON.stringify(value)} correctly`, () => {
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
    { input: { "hello world": "foo bar" }, expected: "hello+world=foo+bar" },
  ];

  for (const { input, expected } of cases) {
    it(`should stringify ${JSON.stringify(input)} correctly`, () => {
      expect(stringifyQuery(input)).toBe(expected);
    });
  }
});
