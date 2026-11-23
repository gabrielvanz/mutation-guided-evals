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
  it("should normalize empty path to dot", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize windows paths", () => {
    expect(normalize("C:\\foo\\bar\\..\\baz")).toBe("C:/foo/baz");
  });

  it("should collapse multiple slashes", () => {
    expect(normalize("foo//bar/baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths", () => {
    expect(normalize("/foo/bar/..")).toBe("/foo");
  });

  it("should handle trailing slash", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle slashes correctly", () => {
    expect(join("/foo", "bar")).toBe("/foo/bar");
  });
});

describe("resolve", () => {
  it("should resolve absolute path segments", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should handle empty arguments by resolving to cwd", () => {
    expect(typeof resolve("")).toBe("string");
  });
});

describe("normalizeString", () => {
  it("should normalize relative path string", () => {
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
  it("should normalize windows path for namespaced path", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  it.each([
    { input: "index.html", expected: ".html" },
    { input: "index.coffee.md", expected: ".md" },
    { input: "index.", expected: "." },
    { input: "index", expected: "" },
    { input: ".gitignore", expected: "" },
    { input: "..", expected: "" }
  ])("should return $expected for extname($input)", ({ input, expected }) => {
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
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo", expected: "/" },
    { input: "foo/bar", expected: "foo" },
    { input: "foo", expected: "." },
    { input: "", expected: "." }
  ])("should return $expected for dirname($input)", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.html" })).toBe("/foo/bar/baz.html");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.html", expected: "baz.html" },
    { input: "/foo/bar/baz.html", ext: ".html", expected: "baz" },
    { input: "/foo/bar/", expected: "bar" }
  ])("should return $expected for basename", ({ input, ext, expected }) => {
    expect(basename(input, ext)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse path into components", () => {
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
    expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
  });
});
