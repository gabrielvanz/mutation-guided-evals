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
    { input: "foo", expected: false },
    { input: "/foo", expected: false },
    { input: "", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for "${input}"`, () => {
      expect(isRelative(input)).toBe(expected);
    });
  }
});

describe("hasProtocol", () => {
  const cases = [
    { input: "https://example.com", expected: true },
    { input: "ftp://example.com", expected: true },
    { input: "data:text/plain", expected: true },
    { input: "//example.com", expected: false },
    { input: "//example.com", opts: { acceptRelative: true }, expected: true },
    { input: "//example.com", opts: true, expected: true },
    { input: "data:text/plain", opts: { strict: true }, expected: false },
    { input: "https://example.com", opts: { strict: true }, expected: true },
  ];

  for (const { input, opts, expected } of cases) {
    it(`should return ${expected} for "${input}" with opts ${JSON.stringify(opts)}`, () => {
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
    it(`should return ${expected} for protocol "${input}"`, () => {
      expect(isScriptProtocol(input)).toBe(expected);
    });
  }
});

describe("hasTrailingSlash", () => {
  const cases = [
    { input: "/foo/", respectQuery: false, expected: true },
    { input: "/foo", respectQuery: false, expected: false },
    { input: "/foo?query=true", respectQuery: true, expected: false },
    { input: "/foo/?query=true", respectQuery: true, expected: true },
    { input: "", respectQuery: false, expected: false },
  ];

  for (const { input, respectQuery, expected } of cases) {
    it(`should return ${expected} for "${input}" (respectQuery: ${respectQuery})`, () => {
      expect(hasTrailingSlash(input, respectQuery)).toBe(expected);
    });
  }
});

describe("withoutTrailingSlash", () => {
  const cases = [
    { input: "/foo/", respectQuery: false, expected: "/foo" },
    { input: "/foo", respectQuery: false, expected: "/foo" },
    { input: "/path/?query=true", respectQuery: true, expected: "/path?query=true" },
    { input: "", respectQuery: false, expected: "/" },
    { input: "/foo/#hash", respectQuery: true, expected: "/foo#hash" },
  ];

  for (const { input, respectQuery, expected } of cases) {
    it(`should return "${expected}" for "${input}"`, () => {
      expect(withoutTrailingSlash(input, respectQuery)).toBe(expected);
    });
  }
});

describe("withTrailingSlash", () => {
  const cases = [
    { input: "/foo", respectQuery: false, expected: "/foo/" },
    { input: "/foo/", respectQuery: false, expected: "/foo/" },
    { input: "/path?query=true", respectQuery: true, expected: "/path/?query=true" },
    { input: "", respectQuery: false, expected: "/" },
    { input: "#hash", respectQuery: true, expected: "#hash" },
  ];

  for (const { input, respectQuery, expected } of cases) {
    it(`should return "${expected}" for "${input}"`, () => {
      expect(withTrailingSlash(input, respectQuery)).toBe(expected);
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
    it(`should return ${expected} for "${input}"`, () => {
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
    it(`should return "${expected}" for "${input}"`, () => {
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
    it(`should return "${expected}" for "${input}"`, () => {
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
    it(`should return "${expected}" for "${input}"`, () => {
      expect(cleanDoubleSlashes(input)).toBe(expected);
    });
  }
});

describe("withBase", () => {
  const cases = [
    { input: "/foo/bar", base: "/foo", expected: "/foo/bar" },
    { input: "/foo/bar", base: "/baz", expected: "/baz/foo/bar" },
    { input: "/admin-dashboard", base: "/admin", expected: "/admin/admin-dashboard" },
    { input: "https://example.com", base: "/foo", expected: "https://example.com" },
    { input: "/bar", base: "", expected: "/bar" },
  ];

  for (const { input, base, expected } of cases) {
    it(`should return "${expected}" for base "${base}" and input "${input}"`, () => {
      expect(withBase(input, base)).toBe(expected);
    });
  }
});

describe("withoutBase", () => {
  const cases = [
    { input: "/foo/bar", base: "/foo", expected: "/bar" },
    { input: "/admin-dashboard", base: "/admin", expected: "/admin-dashboard" },
    { input: "/foo/bar", base: "", expected: "/foo/bar" },
    { input: "/foo/bar", base: "/baz", expected: "/foo/bar" },
    { input: "/legacy//evil.com", base: "/legacy", expected: "/evil.com" },
  ];

  for (const { input, base, expected } of cases) {
    it(`should return "${expected}" for base "${base}" and input "${input}"`, () => {
      expect(withoutBase(input, base)).toBe(expected);
    });
  }
});

describe("withQuery", () => {
  it("should add or replace query parameters", () => {
    expect(withQuery("/foo?page=a", { token: "secret" })).toBe("/foo?page=a&token=secret");
    expect(withQuery("/foo?page=a", { page: "b" })).toBe("/foo?page=b");
  });
});

describe("filterQuery", () => {
  it("should filter query parameters based on predicate", () => {
    expect(filterQuery("/foo?bar=1&baz=2", (key) => key !== "bar")).toBe("/foo?baz=2");
    expect(filterQuery("/foo", (key) => key !== "bar")).toBe("/foo");
  });
});

describe("getQuery", () => {
  it("should parse and decode query parameters", () => {
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
    it(`should return ${expected} for "${input}"`, () => {
      expect(isEmptyURL(input)).toBe(expected);
    });
  }
});

describe("isNonEmptyURL", () => {
  const cases = [
    { input: "/foo", expected: true },
    { input: "", expected: false },
    { input: "/", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for "${input}"`, () => {
      expect(Boolean(isNonEmptyURL(input))).toBe(expected);
    });
  }
});

describe("joinURL", () => {
  it("should join multiple URL segments", () => {
    expect(joinURL("a", "/b", "/c")).toBe("a/b/c");
    expect(joinURL("http://example.com", "/foo", "bar")).toBe("http://example.com/foo/bar");
  });
});

describe("joinRelativeURL", () => {
  it("should handle relative paths with ./ and ../", () => {
    expect(joinRelativeURL("/a", "../b", "./c")).toBe("/b/c");
    expect(joinRelativeURL("a", "./b")).toBe("a/b");
    expect(joinRelativeURL("/", "a")).toBe("/a");
  });
});

describe("withHttp", () => {
  it("should ensure http protocol", () => {
    expect(withHttp("https://example.com")).toBe("http://example.com");
    expect(withHttp("example.com")).toBe("http://example.com");
  });
});

describe("withHttps", () => {
  it("should ensure https protocol", () => {
    expect(withHttps("http://example.com")).toBe("https://example.com");
    expect(withHttps("example.com")).toBe("https://example.com");
  });
});

describe("withoutProtocol", () => {
  it("should remove protocol", () => {
    expect(withoutProtocol("http://example.com")).toBe("example.com");
    expect(withoutProtocol("example.com")).toBe("example.com");
  });
});

describe("withProtocol", () => {
  it("should add or replace protocol", () => {
    expect(withProtocol("http://example.com", "ftp://")).toBe("ftp://example.com");
    expect(withProtocol("example.com", "https://")).toBe("https://example.com");
    expect(withProtocol("//example.com", "https://")).toBe("https://example.com");
  });
});

describe("normalizeURL", () => {
  it("should normalize encoding, slashes, and search params", () => {
    expect(normalizeURL("test?query=123 123#hash, test")).toBe("test?query=123+123#hash,%20test");
    expect(normalizeURL("http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("resolveURL", () => {
  it("should resolve multiple URL segments", () => {
    expect(resolveURL("http://foo.com/foo?test=123#token", "bar", "baz")).toBe("http://foo.com/foo/bar/baz?test=123#token");
    expect(resolveURL("http://foo.com", "")).toBe("http://foo.com");
  });

  it("should throw TypeError for non-string base", () => {
    expect(() => resolveURL(123 as any)).toThrow(TypeError);
  });
});

describe("isSamePath", () => {
  const cases = [
    { p1: "/foo", p2: "/foo/", expected: true },
    { p1: "/foo%20bar", p2: "/foo bar", expected: true },
    { p1: "/foo", p2: "/bar", expected: false },
  ];

  for (const { p1, p2, expected } of cases) {
    it(`should return ${expected} for "${p1}" and "${p2}"`, () => {
      expect(isSamePath(p1, p2)).toBe(expected);
    });
  }
});

describe("isEqual", () => {
  it("should compare URLs with options", () => {
    expect(isEqual("/foo", "foo")).toBe(true);
    expect(isEqual("foo/", "foo")).toBe(true);
    expect(isEqual("/foo bar", "/foo%20bar")).toBe(true);

    // Strict compare
    expect(isEqual("/foo", "foo", { leadingSlash: true })).toBe(false);
    expect(isEqual("foo/", "foo", { trailingSlash: true })).toBe(false);
    expect(isEqual("/foo bar", "/foo%20bar", { encoding: true })).toBe(false);
  });
});

describe("withFragment", () => {
  it("should add or replace fragment", () => {
    expect(withFragment("/foo", "bar")).toBe("/foo#bar");
    expect(withFragment("/foo#bar", "baz")).toBe("/foo#baz");
    expect(withFragment("/foo#bar", "")).toBe("/foo#bar");
    expect(withFragment("/foo", "#")).toBe("/foo");
  });
});

describe("withoutFragment", () => {
  it("should remove fragment", () => {
    expect(withoutFragment("http://example.com/foo?q=123#bar")).toBe("http://example.com/foo?q=123");
  });
});

describe("withoutHost", () => {
  it("should remove host and preserve rest", () => {
    expect(withoutHost("http://example.com/foo?q=123#bar")).toBe("/foo?q=123#bar");
  });
});
