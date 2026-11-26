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
    it(`should return ${expected} for input "${input}"`, () => {
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
    { input: "/foo/bar", expected: false },
    { input: "", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for input "${input}"`, () => {
      expect(hasProtocol(input)).toBe(expected);
    });
  }

  it("should accept relative when option acceptRelative is true", () => {
    expect(hasProtocol("//example.com", { acceptRelative: true })).toBe(true);
    expect(hasProtocol("//example.com", true)).toBe(true);
  });

  it("should handle strict option", () => {
    expect(hasProtocol("data:text/plain", { strict: true })).toBe(false);
    expect(hasProtocol("https://example.com", { strict: true })).toBe(true);
  });
});

describe("isScriptProtocol", () => {
  it("should return true for script protocols", () => {
    expect(isScriptProtocol("javascript:")).toBe(true);
    expect(isScriptProtocol("data:")).toBe(true);
    expect(isScriptProtocol("blob:")).toBe(true);
    expect(isScriptProtocol("vbscript:")).toBe(true);
  });

  it("should return false for non-script protocols or empty input", () => {
    expect(isScriptProtocol("https://example.com")).toBe(false);
    expect(isScriptProtocol("")).toBe(false);
    expect(isScriptProtocol(undefined)).toBe(false);
  });
});

describe("hasTrailingSlash", () => {
  const cases = [
    { input: "/foo/", expected: true },
    { input: "/foo", expected: false },
    { input: "", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for input "${input}"`, () => {
      expect(hasTrailingSlash(input)).toBe(expected);
    });
  }

  it("should respect query and fragment when specified", () => {
    expect(hasTrailingSlash("/foo?query=true", true)).toBe(false);
    expect(hasTrailingSlash("/foo/?query=true", true)).toBe(true);
    expect(hasTrailingSlash("/foo/#hash", true)).toBe(true);
    expect(hasTrailingSlash("/foo#hash/", true)).toBe(true);
  });
});

describe("withoutTrailingSlash", () => {
  const cases = [
    { input: "/foo/", expected: "/foo" },
    { input: "/foo", expected: "/foo" },
    { input: "", expected: "/" },
    { input: "/", expected: "/" },
  ];

  for (const { input, expected } of cases) {
    it(`should return "${expected}" for input "${input}"`, () => {
      expect(withoutTrailingSlash(input)).toBe(expected);
    });
  }

  it("should respect query and fragment when specified", () => {
    expect(withoutTrailingSlash("/path/?query=true", true)).toBe("/path?query=true");
    expect(withoutTrailingSlash("/path?query=true/", true)).toBe("/path?query=true/");
  });
});

describe("withTrailingSlash", () => {
  const cases = [
    { input: "/foo", expected: "/foo/" },
    { input: "/foo/", expected: "/foo/" },
    { input: "", expected: "/" },
  ];

  for (const { input, expected } of cases) {
    it(`should return "${expected}" for input "${input}"`, () => {
      expect(withTrailingSlash(input)).toBe(expected);
    });
  }

  it("should respect query and fragment when specified", () => {
    expect(withTrailingSlash("/path?query=true", true)).toBe("/path/?query=true");
    expect(withTrailingSlash("/path/", true)).toBe("/path/");
    expect(withTrailingSlash("", true)).toBe("/");
    expect(withTrailingSlash("#hash", true)).toBe("#hash");
  });
});

describe("hasLeadingSlash", () => {
  const cases = [
    { input: "/foo", expected: true },
    { input: "foo", expected: false },
    { input: "", expected: false },
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for input "${input}"`, () => {
      expect(hasLeadingSlash(input)).toBe(expected);
    });
  }
});

describe("withoutLeadingSlash", () => {
  const cases = [
    { input: "/foo", expected: "foo" },
    { input: "foo", expected: "foo" },
    { input: "", expected: "/" },
    { input: "/", expected: "/" },
  ];

  for (const { input, expected } of cases) {
    it(`should return "${expected}" for input "${input}"`, () => {
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
    it(`should return "${expected}" for input "${input}"`, () => {
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
    it(`should return "${expected}" for input "${input}"`, () => {
      expect(cleanDoubleSlashes(input)).toBe(expected);
    });
  }
});

describe("withBase", () => {
  it("should prepend base if not present", () => {
    expect(withBase("/foo/bar", "/baz")).toBe("/baz/foo/bar");
  });

  it("should not prepend base if already present", () => {
    expect(withBase("/foo/bar", "/foo")).toBe("/foo/bar");
  });

  it("should return input as-is if base is empty or input has protocol", () => {
    expect(withBase("/foo/bar", "")).toBe("/foo/bar");
    expect(withBase("https://example.com", "/foo")).toBe("https://example.com");
  });
});

describe("withoutBase", () => {
  it("should remove base if present", () => {
    expect(withoutBase("/foo/bar", "/foo")).toBe("/bar");
  });

  it("should not remove base if not present", () => {
    expect(withoutBase("/baz/foo", "/foo")).toBe("/baz/foo");
  });

  it("should return input if base is empty", () => {
    expect(withoutBase("/foo/bar", "")).toBe("/foo/bar");
  });

  it("should prevent partial match injection", () => {
    expect(withoutBase("/admin-dashboard", "/admin")).toBe("/admin-dashboard");
  });
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
  });

  it("should return input as-is if no query exists", () => {
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
    it(`should return ${expected} for input "${input}"`, () => {
      expect(isEmptyURL(input)).toBe(expected);
    });
  }
});

describe("isNonEmptyURL", () => {
  it("should return false for empty or slash", () => {
    expect(isNonEmptyURL("")).toBeFalsy();
    expect(isNonEmptyURL("/")).toBeFalsy();
  });

  it("should return true for non-empty URLs", () => {
    expect(isNonEmptyURL("/foo")).toBe(true);
  });
});

describe("joinURL", () => {
  it("should join multiple segments into a single URL", () => {
    expect(joinURL("a", "/b", "/c")).toBe("a/b/c");
    expect(joinURL("http://example.com", "foo", "bar")).toBe("http://example.com/foo/bar");
  });
});

describe("joinRelativeURL", () => {
  it("should join relative URL segments", () => {
    expect(joinRelativeURL("/a", "../b", "./c")).toBe("/b/c");
  });
});

describe("withHttp", () => {
  it("should replace or add http:// protocol", () => {
    expect(withHttp("https://example.com")).toBe("http://example.com");
    expect(withHttp("example.com")).toBe("http://example.com");
  });
});

describe("withHttps", () => {
  it("should replace or add https:// protocol", () => {
    expect(withHttps("http://example.com")).toBe("https://example.com");
    expect(withHttps("example.com")).toBe("https://example.com");
  });
});

describe("withoutProtocol", () => {
  it("should remove protocol from input", () => {
    expect(withoutProtocol("http://example.com")).toBe("example.com");
    expect(withoutProtocol("example.com")).toBe("example.com");
  });
});

describe("withProtocol", () => {
  it("should replace protocol with specified one", () => {
    expect(withProtocol("http://example.com", "ftp://")).toBe("ftp://example.com");
  });
});

describe("normalizeURL", () => {
  it("should normalize encoding, slashes, and search query", () => {
    expect(normalizeURL("test?query=123 123#hash, test")).toBe("test?query=123+123#hash,%20test");
    expect(normalizeURL("http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("resolveURL", () => {
  it("should resolve URL segments", () => {
    expect(resolveURL("http://foo.com/foo?test=123#token", "bar", "baz")).toBe("http://foo.com/foo/bar/baz?test=123#token");
  });

  it("should throw TypeError if base is not a string", () => {
    // @ts-expect-error testing invalid argument type
    expect(() => resolveURL(123)).toThrow(TypeError);
  });

  it("should return base when filtered inputs is empty", () => {
    expect(resolveURL("http://foo.com", "", "/")).toBe("http://foo.com");
  });
});

describe("isSamePath", () => {
  it("should check if two paths are equal ignoring trailing slashes and encoding", () => {
    expect(isSamePath("/foo", "/foo/")).toBe(true);
    expect(isSamePath("/foo%20bar", "/foo bar")).toBe(true);
    expect(isSamePath("/foo", "/bar")).toBe(false);
  });
});

describe("isEqual", () => {
  it("should compare URLs with default options", () => {
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
  it("should add or replace fragment", () => {
    expect(withFragment("/foo", "bar")).toBe("/foo#bar");
    expect(withFragment("/foo#bar", "baz")).toBe("/foo#baz");
    expect(withFragment("/foo#bar", "")).toBe("/foo#bar");
    expect(withFragment("/foo", "#")).toBe("/foo");
  });
});

describe("withoutFragment", () => {
  it("should remove fragment from URL", () => {
    expect(withoutFragment("http://example.com/foo?q=123#bar")).toBe("http://example.com/foo?q=123");
  });
});

describe("withoutHost", () => {
  it("should remove host from URL", () => {
    expect(withoutHost("http://example.com/foo?q=123#bar")).toBe("/foo?q=123#bar");
  });
});
