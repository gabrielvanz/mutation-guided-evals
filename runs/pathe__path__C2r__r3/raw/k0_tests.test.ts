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
  ])("should return $expected for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should return absolute path if drive letters differ", () => {
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "C:/foo", expected: "C:/" }
  ])("should return $expected for $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format a path object", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.txt" })).toBe("/foo/bar/baz.txt");
  });

  it("should format using ext and name if base is missing", () => {
    expect(format({ dir: "/foo/bar", name: "baz", ext: ".txt" })).toBe("/foo/bar/baz.txt");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.txt", expected: "baz.txt" },
    { input: "/foo/bar/baz.txt", extension: ".txt", expected: "baz" },
    { input: "/foo/bar/", expected: "bar" }
  ])("should return $expected for $input with extension $extension", ({ input, extension, expected }) => {
    expect(basename(input, extension)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse a path into its components", () => {
    expect(parse("/home/user/dir/file.txt")).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });

  it("should parse path without directory", () => {
    expect(parse("file.txt")).toEqual({
      root: "",
      dir: "",
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
