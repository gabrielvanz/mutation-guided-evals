import { describe, it, expect } from "vitest";
import {
  sep,
  normalize,
  join,
  resolve,
  normalizeString,
  isAbsolute,
  toNamespacedPath,
  extname,
  relative,
  dirname,
  format,
  basename,
  parse,
  matchesGlob
} from "../../src/_path";

describe("sep", () => {
  it("should be a forward slash", () => {
    expect(sep).toBe("/");
  });
});

describe("normalize", () => {
  it("should normalize simple paths", () => {
    expect(normalize("foo/bar//baz")).toBe("foo/bar/baz");
  });

  it("should handle empty string", () => {
    expect(normalize("")).toBe(".");
  });

  it("should handle windows style paths", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should handle absolute paths", () => {
    expect(normalize("/foo/../bar")).toBe("/bar");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle leading and trailing slashes correctly", () => {
    expect(join("/foo", "bar/")).toBe("/foo/bar/");
  });
});

describe("resolve", () => {
  it("should resolve absolute path from segments", () => {
    expect(resolve("/foo", "bar")).toBe("/foo/bar");
  });

  it("should handle empty segments", () => {
    expect(resolve("")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize string segments without allowing above root", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("../foo", true)).toBe("../foo");
  });
});

describe("isAbsolute", () => {
  it.each([
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "foo/bar", expected: false },
    { input: "", expected: false }
  ])("should return $expected for $input", ({ input, expected }) => {
    expect(isAbsolute(input)).toBe(expected);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows paths for namespacing", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it.each([
    { input: "index.js", expected: ".js" },
    { input: "index.html.css", expected: ".css" },
    { input: "index", expected: "" },
    { input: ".gitignore", expected: "" },
    { input: "..", expected: "" }
  ])("should return $expected for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz.js", expected: "/foo/bar" },
    { input: "/foo", expected: "/" },
    { input: "foo", expected: "." }
  ])("should return $expected for dirname of $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format a path object", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.js" })).toBe("/foo/bar/baz.js");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.js", extension: undefined, expected: "baz.js" },
    { input: "/foo/bar/baz.js", extension: ".js", expected: "baz" }
  ])("should return $expected for basename of $input", ({ input, extension, expected }) => {
    expect(basename(input, extension)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse a path into components", () => {
    expect(parse("/home/user/dir/file.txt")).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("bar.js", "*.js")).toBe(true);
  });
});
