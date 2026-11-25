import { describe, it, expect } from "vitest";
import { parseQuery, encodeQueryItem, stringifyQuery } from "../../src/query";

describe("query", () => {
  describe("parseQuery", () => {
    it("parses empty string", () => {
      expect(parseQuery("")).toEqual({});
    });

    it("parses query string with leading question mark", () => {
      expect(parseQuery("?foo=bar&baz=qux")).toEqual({
        foo: "bar",
        baz: "qux",
      });
    });

    it("parses query string without leading question mark", () => {
      expect(parseQuery("foo=bar&baz=qux")).toEqual({
        foo: "bar",
        baz: "qux",
      });
    });

    it("parses repeated keys into arrays", () => {
      expect(parseQuery("tags=javascript&tags=web&tags=dev")).toEqual({
        tags: ["javascript", "web", "dev"],
      });
    });

    it("ignores prototype pollution keys", () => {
      expect(parseQuery("__proto__=polluted&constructor=bad&safe=good")).toEqual({
        safe: "good",
      });
    });

    it("handles parameters without value correctly", () => {
      expect(parseQuery("foo=&bar")).toEqual({
        foo: "",
        bar: "",
      });
    });
  });

  describe("encodeQueryItem", () => {
    it("encodes primitive types", () => {
      expect(encodeQueryItem("message", "Hello World")).toBe("message=Hello+World");
      expect(encodeQueryItem("count", 42)).toBe("count=42");
      expect(encodeQueryItem("active", true)).toBe("active=true");
    });

    it("encodes array values into multiple pairs", () => {
      expect(encodeQueryItem("tags", ["javascript", "web", "dev"])).toBe(
        "tags=javascript&tags=web&tags=dev",
      );
    });

    it("handles falsy values (other than number/boolean)", () => {
      expect(encodeQueryItem("empty", "")).toBe("empty");
    });
  });

  describe("stringifyQuery", () => {
    it("stringifies query object", () => {
      expect(stringifyQuery({ foo: "bar", baz: "qux" })).toBe("foo=bar&baz=qux");
    });

    it("filters out undefined values", () => {
      expect(stringifyQuery({ foo: "bar", baz: undefined })).toBe("foo=bar");
    });

    it("stringifies arrays and primitives correctly", () => {
      expect(
        stringifyQuery({
          tags: ["js", "ts"],
          count: 5,
        }),
      ).toBe("tags=js&tags=ts&count=5");
    });
  });
});
