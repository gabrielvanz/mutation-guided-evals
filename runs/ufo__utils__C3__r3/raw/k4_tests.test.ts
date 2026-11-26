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
    { input: "/path/to/file", expected: false },
    { input: "HTtp://example.com", expected: true },
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
    { input: "notjavascript:", expected: false },
    { input: "javascript", expected: false },
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
    { input: "/foo/", respect: false, expected: true },
    { input: "/foo", respect: false, expected: false },
    { input: "/foo?query=true", respect: true, expected: false },
    { input: "/foo/?query=true", respect: true, expected: true },
    { input: "", respect: false, expected: false },
  ];

  for (const { input, respect, expected } of cases) {
    it(`should return ${expected} for "${input}" with respectQueryAndFragment=${respect}`, () => {
      expect(hasTrailingSlash(input, respect)).toBe(expected);
    });
  }
});

describe("withoutTrailingSlash", () => {
  const cases = [
    { input: "/foo/", respect: false, expected: "/foo" },
    { input: "/foo", respect: false, expected: "/foo" },
    { input: "/path/?query=true", respect: true, expected: "/path?query=true" },
    { input: "/", respect: false, expected: "/" },
    { input: "", respect: false, expected: "/" },
    { input: "/foo/#hash", respect: true, expected: "/foo#hash" },
    { input: "/foo/#/hash", respect: true, expected: "/foo#/hash" },
    { input: "/foo?a=1/b", respect: true, expected: "/foo?a=1/b" },
    { input: "foo?a=1&b=2", respect: true, expected: "foo?a=1&b=2" },
  ];

  for (const { input, respect, expected } of cases) {
    it(`should return "${expected}" for "${input}" with respectQueryAndFragment=${respect}`, () => {
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
    { input: "#hash", respect: true, expected: "#hash" },
    { input: "/foo?query=true/#hash", respect: true, expected: "/foo?query=true/#hash" },
    { input: "/foo?query=true/", respect: true, expected: "/foo?query=true/" },
    { input: "/foo?", respect: true, expected: "/foo/?)" },
    { input: "/foo?a=1", respect: true, expected: "/foo/?a=1" },
  ];

  for (const { input, respect, expected } of cases) {
    it(`should return "${expected}" for "${input}" with respectQueryAndFragment=${respect}`, () => {
      expect(withTrailingSlash(input, respect)).toBe(expected.replace("?)", "?"));
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
    { input: "/", expected: "/" },
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
    { input: "https://example.com/foo", base: "/baz", expected: "https://example.com/foo" },
    { input: "/foo", base: "", expected: "/foo" },
  ];

  for (const { input, base, expected } of cases) {
    it(`should return "${expected}" for input "${input}" with base "${base}"`, () => {
      expect(withBase(input, base)).toBe(expected);
    });
  }
});

describe("withoutBase", () => {
  const cases = [
    { input: "/foo/bar", base: "/foo", expected: "/bar" },
    { input: "/admin-dashboard", base: "/admin", expected: "/admin-dashboard" },
    { input: "/foo/bar", base: "/baz", expected: "/foo/bar" },
    { input: "/foo/bar", base: "", expected: "/foo/bar" },
    { input: "/legacy//evil.com", base: "/legacy", expected: "/evil.com" },
    { input: "/foo/bar/baz", base: "/foo/bar", expected: "/baz" },
    { input: "/foo/barbaz", base: "/foo/bar", expected: "/foo/barbaz" },
    { input: "/foo/bar///baz", base: "/foo/bar", expected: "/baz" },
  ];

  for (const { input, base, expected } of cases) {
    it(`should return "${expected}" for input "${input}" with base "${base}"`, () => {
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
  it("should filter out query keys based on predicate", () => {
    expect(filterQuery("/foo?bar=1&baz=2", (key) => key !== "bar")).toBe("/foo?baz=2");
  });

  it("should return input as-is if no query string exists", () => {
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
    { input: "", expected: false },
    { input: "/", expected: false },
    { input: "/foo", expected: true },
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
    expect(joinURL("http://example.com", "foo", "bar")).toBe("http://example.com/foo/bar");
    expect(joinURL("a/", "b")).toBe("a/b");
  });
});

describe("joinRelativeURL", () => {
  it("should join relative URL segments", () => {
    expect(joinRelativeURL("/a", "../b", "./c")).toBe("/b/c");
    expect(joinRelativeURL("/", "a", "b")).toBe("/a/b");
    expect(joinRelativeURL("http://example.com/a", "../b")).toBe("http://example.com/b");
    expect(joinRelativeURL("./a", "./b")).toBe("./a/b");
    expect(joinRelativeURL("a/", "b/")).toBe("a/b/");
    expect(joinRelativeURL("/a", "b")).toBe("/a/b");
    expect(joinRelativeURL("a", "..", "b")).toBe("b");
    expect(joinRelativeURL("http://example.com/a/b", "../../c")).toBe("http://example.com/c");
    expect(joinRelativeURL("./a/b", "../c")).toBe("./a/c");
    expect(joinRelativeURL("a/b/", "c/")).toBe("a/b/c/");
  });
});

describe("withHttp", () => {
  it("should add or replace protocol with http://", () => {
    expect(withHttp("https://example.com")).toBe("http://example.com");
    expect(withHttp("example.com")).toBe("http://example.com");
  });
});

describe("withHttps", () => {
  it("should add or replace protocol with https://", () => {
    expect(withHttps("http://example.com")).toBe("https://example.com");
    expect(withHttps("example.com")).toBe("https://example.com");
  });
});

describe("withoutProtocol", () => {
  it("should remove the protocol from the input", () => {
    expect(withoutProtocol("http://example.com")).toBe("example.com");
    expect(withoutProtocol("example.com")).toBe("example.com");
  });
});

describe("withProtocol", () => {
  it("should add or replace protocol with the specified one", () => {
    expect(withProtocol("http://example.com", "ftp://")).toBe("ftp://example.com");
    expect(withProtocol("example.com", "https://")).toBe("https://example.com");
    expect(withProtocol("//example.com", "https://")).toBe("https://example.com");
  });
});

describe("normalizeURL", () => {
  it("should normalize URL encoding, slashes, and components", () => {
    expect(normalizeURL("test?query=123 123#hash, test")).toBe("test?query=123+123#hash,%20test");
    expect(normalizeURL("http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("resolveURL", () => {
  it("should resolve multiple URL segments", () => {
    expect(resolveURL("http://foo.com/foo?test=123#token", "bar", "baz")).toBe("http://foo.com/foo/bar/baz?test=123#token");
    expect(resolveURL("http://foo.com/foo?a=1", "bar?b=2#hash")).toBe("http://foo.com/foo/bar?a=1&b=2#hash");
    expect(resolveURL("http://foo.com/foo?a=1", "?b=2")).toBe("http://foo.com/foo?a=1&b=2");
    expect(resolveURL("http://foo.com/foo", "#newhash")).toBe("http://foo.com/foo#newhash");
    expect(resolveURL("http://foo.com/foo?a=1", "bar?")).toBe("http://foo.com/foo/bar?a=1");
    expect(resolveURL("http://foo.com/foo", "bar")).toBe("http://foo.com/foo/bar");
  });

  it("should throw TypeError for non-string base", () => {
    expect(() => resolveURL(123 as any, "bar")).toThrow(TypeError);
  });

  it("should return base when filtered inputs are empty", () => {
    expect(resolveURL("http://foo.com", "", "/")).toBe("http://foo.com");
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
  it("should compare URLs with default options (ignoring slashes and encoding)", () => {
    expect(isEqual("/foo", "foo")).toBe(true);
    expect(isEqual("foo/", "foo")).toBe(true);
    expect(isEqual("/foo bar", "/foo%20bar")).toBe(true);
  });

  it("should respect strict comparison options", () => {
    expect(isEqual("/foo", "foo", { leadingSlash: true })).toBe(false);
    expect(isEqual("foo/", "foo", { trailingSlash: true })).toBe(false);
    expect(isEqual("/foo bar", "/foo%20bar", { encoding: true })).toBe(false);
  });
});

describe("withFragment", () => {
  it("should add or replace the fragment section", () => {
    expect(withFragment("/foo", "bar")).toBe("/foo#bar");
    expect(withFragment("/foo#bar", "baz")).toBe("/foo#baz");
    expect(withFragment("/foo#bar", "")).toBe("/foo#bar");
    expect(withFragment("/foo", "#")).toBe("/foo");
  });
});

describe("withoutFragment", () => {
  it("should remove the fragment section from the URL", () => {
    expect(withoutFragment("http://example.com/foo?q=123#bar")).toBe("http://example.com/foo?q=123");
  });
});

describe("withoutHost", () => {
  it("should remove the host from the URL", () => {
    expect(withoutHost("http://example.com/foo?q=123#bar")).toBe("/foo?q=123#bar");
    expect(withoutHost("http://example.com")).toBe("/");
  });
});
