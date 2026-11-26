import { describe, it, expect } from "vitest";
import {
  isRelative,
  hasProtocol,
  isScriptProtocol,
  hasTrailingSlash,
  withoutTrailingSlash,
  withTrailingSlash,
  hasLeadingSlash,
  withoutLeadingSlash,
  withLeadingSlash,
  cleanDoubleSlashes,
  withBase,
  withoutBase,
  withQuery,
  filterQuery,
  getQuery,
  isEmptyURL,
  isNonEmptyURL,
  joinURL,
  joinRelativeURL,
  withHttp,
  withHttps,
  withoutProtocol,
  withProtocol,
  normalizeURL,
  resolveURL,
  isSamePath,
  isEqual,
  withFragment,
  withoutFragment,
  withoutHost,
} from "../../src/utils";

describe("isRelative", () => {
  const cases = [
    { input: "./foo", expected: true },
    { input: "../foo", expected: true },
    { input: "/foo", expected: false },
    { input: "foo", expected: false },
    { input: "", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(isRelative(input)).toBe(expected);
    });
  }
});

describe("hasProtocol", () => {
  const cases = [
    { input: "https://example.com", opts: undefined, expected: true },
    { input: "//example.com", opts: undefined, expected: false },
    { input: "//example.com", opts: { acceptRelative: true }, expected: true },
    { input: "//example.com", opts: true, expected: true },
    { input: "ftp://example.com", opts: undefined, expected: true },
    { input: "data:text/plain", opts: undefined, expected: true },
    { input: "data:text/plain", opts: { strict: true }, expected: false },
    { input: "https://example.com", opts: { strict: true }, expected: true },
    { input: "/foo/bar", opts: undefined, expected: false },
  ];

  for (const { input, opts, expected } of cases) {
    it(`should return ${expected} for ${input}`, () => {
      expect(hasProtocol(input, opts as any)).toBe(expected);
    });
  }
});

describe("isScriptProtocol", () => {
  const cases = [
    { input: "javascript:", expected: true },
    { input: "data:", expected: true },
    { input: "blob:", expected: true },
    { input: "vbscript:", expected: true },
    { input: "https://example.com", expected: false },
    { input: undefined, expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input}`, () => {
      expect(isScriptProtocol(input)).toBe(expected);
    });
  }
});

describe("hasTrailingSlash", () => {
  const cases = [
    { input: "/foo/", respect: false, expected: true },
    { input: "/foo", respect: false, expected: false },
    { input: "/foo?query=true", respect: true, expected: false },
    { input: "/foo/?query=true", respect: true, expected: true },
    { input: "", respect: false, expected: false },
  ];

  for (const { input, respect, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(hasTrailingSlash(input, respect)).toBe(expected);
    });
  }
});

describe("withoutTrailingSlash", () => {
  const cases = [
    { input: "/foo/", respect: false, expected: "/foo" },
    { input: "/foo", respect: false, expected: "/foo" },
    { input: "/path/?query=true", respect: true, expected: "/path?query=true" },
    { input: "", respect: false, expected: "/" },
  ];

  for (const { input, respect, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(withoutTrailingSlash(input, respect)).toBe(expected);
    });
  }
});

describe("withTrailingSlash", () => {
  const cases = [
    { input: "/foo", respect: false, expected: "/foo/" },
    { input: "/foo/", respect: false, expected: "/foo/" },
    { input: "/path?query=true", respect: true, expected: "/path/?query=true" },
    { input: "", respect: false, expected: "/" },
  ];

  for (const { input, respect, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(withTrailingSlash(input, respect)).toBe(expected);
    });
  }
});

describe("hasLeadingSlash", () => {
  const cases = [
    { input: "/foo", expected: true },
    { input: "foo", expected: false },
    { input: "", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(hasLeadingSlash(input)).toBe(expected);
    });
  }
});

describe("withoutLeadingSlash", () => {
  const cases = [
    { input: "/foo", expected: "foo" },
    { input: "foo", expected: "foo" },
    { input: "", expected: "/" },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(withoutLeadingSlash(input)).toBe(expected);
    });
  }
});

describe("withLeadingSlash", () => {
  const cases = [
    { input: "foo", expected: "/foo" },
    { input: "/foo", expected: "/foo" },
    { input: "", expected: "/" },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(withLeadingSlash(input)).toBe(expected);
    });
  }
});

describe("cleanDoubleSlashes", () => {
  const cases = [
    { input: "//foo//bar//", expected: "/foo/bar/" },
    { input: "http://example.com/analyze//http://localhost:3000//", expected: "http://example.com/analyze/http://localhost:3000/" },
    { input: "", expected: "" },
  ];

  for (const { input, expected } of cases) {
    it(`should clean double slashes in ${input || "empty string"}`, () => {
      expect(cleanDoubleSlashes(input)).toBe(expected);
    });
  }
});

describe("withBase", () => {
  const cases = [
    { input: "/foo/bar", base: "/foo", expected: "/foo/bar" },
    { input: "/foo/bar", base: "/baz", expected: "/baz/foo/bar" },
    { input: "/admin-dashboard", base: "/admin", expected: "/admin/admin-dashboard" },
    { input: "https://example.com/foo", base: "/baz", expected: "https://example.com/foo" },
  ];

  for (const { input, base, expected } of cases) {
    it(`should return ${expected} for input ${input} with base ${base}`, () => {
      expect(withBase(input, base)).toBe(expected);
    });
  }
});

describe("withoutBase", () => {
  const cases = [
    { input: "/foo/bar", base: "/foo", expected: "/bar" },
    { input: "/admin-dashboard", base: "/admin", expected: "/admin-dashboard" },
    { input: "/legacy//evil.com", base: "/legacy", expected: "/evil.com" },
    { input: "/foo/bar", base: "", expected: "/foo/bar" },
    { input: "/baz/bar", base: "/foo", expected: "/baz/bar" },
  ];

  for (const { input, base, expected } of cases) {
    it(`should return ${expected} for input ${input} without base ${base}`, () => {
      expect(withoutBase(input, base)).toBe(expected);
    });
  }
});

describe("withQuery", () => {
  it("should add query to URL", () => {
    expect(withQuery("/foo?page=a", { token: "secret" })).toBe("/foo?page=a&token=secret");
  });
});

describe("filterQuery", () => {
  const cases = [
    { input: "/foo?bar=1&baz=2", predicate: (key: string) => key !== "bar", expected: "/foo?baz=2" },
    { input: "/foo", predicate: () => true, expected: "/foo" },
  ];

  for (const { input, predicate, expected } of cases) {
    it(`should filter query for ${input}`, () => {
      expect(filterQuery(input, predicate)).toBe(expected);
    });
  }
});

describe("getQuery", () => {
  it("should parse and decode query object", () => {
    expect(getQuery("http://foo.com/foo?test=123&unicode=%E5%A5%BD")).toEqual({
      test: "123",
      unicode: "好",
    });
  });
});

describe("isEmptyURL", () => {
  const cases = [
    { input: "", expected: true },
    { input: "/", expected: true },
    { input: "/foo", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(isEmptyURL(input)).toBe(expected);
    });
  }
});

describe("isNonEmptyURL", () => {
  const cases = [
    { input: "", expected: "" },
    { input: "/", expected: false },
    { input: "/foo", expected: true },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(isNonEmptyURL(input)).toBe(expected);
    });
  }
});

describe("joinURL", () => {
  it("should join multiple segments", () => {
    expect(joinURL("a", "/b", "/c")).toBe("a/b/c");
  });
});

describe("joinRelativeURL", () => {
  it("should handle relative segments", () => {
    expect(joinRelativeURL("/a", "../b", "./c")).toBe("/b/c");
  });
});

describe("withHttp", () => {
  it("should set protocol to http://", () => {
    expect(withHttp("https://example.com")).toBe("http://example.com");
  });
});

describe("withHttps", () => {
  it("should set protocol to https://", () => {
    expect(withHttps("http://example.com")).toBe("https://example.com");
  });
});

describe("withoutProtocol", () => {
  it("should remove protocol", () => {
    expect(withoutProtocol("http://example.com")).toBe("example.com");
  });
});

describe("withProtocol", () => {
  it("should replace protocol", () => {
    expect(withProtocol("http://example.com", "ftp://")).toBe("ftp://example.com");
  });
});

describe("normalizeURL", () => {
  it("should normalize URL encoding and path", () => {
    expect(normalizeURL("test?query=123 123#hash, test")).toBe("test?query=123+123#hash,%20test");
  });
});

describe("resolveURL", () => {
  it("should resolve relative segments against base", () => {
    expect(resolveURL("http://foo.com/foo?test=123#token", "bar", "baz")).toBe("http://foo.com/foo/bar/baz?test=123#token");
  });

  it("should throw TypeError for non-string base", () => {
    expect(() => resolveURL(123 as any, "bar")).toThrow(TypeError);
  });
});

describe("isSamePath", () => {
  it("should compare paths ignoring trailing slashes and encoding", () => {
    expect(isSamePath("/foo", "/foo/")).toBe(true);
  });
});

describe("isEqual", () => {
  it("should compare URLs flexibly by default and strictly with options", () => {
    expect(isEqual("/foo", "foo")).toBe(true);
    expect(isEqual("/foo bar", "/foo%20bar")).toBe(true);
    expect(isEqual("/foo", "foo", { leadingSlash: true })).toBe(false);
    expect(isEqual("foo/", "foo", { trailingSlash: true })).toBe(false);
    expect(isEqual("/foo bar", "/foo%20bar", { encoding: true })).toBe(false);
  });
});

describe("withFragment", () => {
  const cases = [
    { input: "/foo", hash: "bar", expected: "/foo#bar" },
    { input: "/foo#bar", hash: "baz", expected: "/foo#baz" },
    { input: "/foo#bar", hash: "", expected: "/foo#bar" },
    { input: "/foo", hash: "#", expected: "/foo" },
  ];

  for (const { input, hash, expected } of cases) {
    it(`should return ${expected} for input ${input} with hash ${hash}`, () => {
      expect(withFragment(input, hash)).toBe(expected);
    });
  }
});

describe("withoutFragment", () => {
  it("should remove fragment", () => {
    expect(withoutFragment("http://example.com/foo?q=123#bar")).toBe("http://example.com/foo?q=123");
  });
});

describe("withoutHost", () => {
  it("should remove host", () => {
    expect(withoutHost("http://example.com/foo?q=123#bar")).toBe("/foo?q=123#bar");
  });
});
