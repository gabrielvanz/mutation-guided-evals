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
  it("should normalize empty string to dot", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize windows paths", () => {
    expect(normalize("C:\\foo\\bar\\baz")).toBe("C:/foo/bar/baz");
  });

  it("should collapse duplicate slashes and resolve dots", () => {
    expect(normalize("/foo//bar/./baz/../qux")).toBe("/foo/bar/qux");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
  });

  it("should handle drive letter alone", () => {
    expect(normalize("C:")).toBe("C:/");
  });
});

describe("join", () => {
  it("should join multiple path segments", () => {
    expect(join("/foo", "bar", "baz/asdf")).toBe("/foo/bar/baz/asdf");
  });

  it("should handle empty segments", () => {
    expect(join("/foo", "", "bar")).toBe("/foo/bar");
  });

  it("should normalize when joining", () => {
    expect(join("/foo", "../bar")).toBe("/bar");
  });
});

describe("resolve", () => {
  it("should resolve segments into an absolute path", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should handle empty arguments by falling back to cwd", () => {
    expect(resolve("")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize path string without allowing above root", () => {
    expect(normalizeString("/foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("/foo/../../bar", true)).toBe("../bar");
  });
});

describe("isAbsolute", () => {
  it.each([
    { input: "/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "foo/bar", expected: false },
    { input: "", expected: false }
  ])("should return $expected for $input", ({ input, expected }) => {
    expect(isAbsolute(input)).toBe(expected);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows path for namespacing", () => {
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
  ])("should return $expected for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "", expected: "." }
  ])("should return $expected for dirname of $input", ({ input, expected }) => {
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
    { input: "/foo/bar/baz.html", ext: undefined, expected: "baz.html" },
    { input: "/foo/bar/baz.html", ext: ".html", expected: "baz" },
    { input: "/", ext: undefined, expected: "" }
  ])("should return $expected for basename of $input", ({ input, ext, expected }) => {
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
