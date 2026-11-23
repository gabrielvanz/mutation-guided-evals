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
  it("should normalize empty string to .", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize simple paths", () => {
    expect(normalize("foo/bar//baz/..")).toBe("foo/bar");
  });

  it("should normalize Windows paths with backslashes", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths and trailing slashes", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
  });

  it("should handle drive letters", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
    expect(normalize("C:")).toBe("C:/");
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
    expect(join("/foo", "bar/")).toBe("/foo/bar/");
  });
});

describe("resolve", () => {
  it("should resolve relative paths", () => {
    const resolved = resolve("foo", "bar");
    expect(resolved).not.toBe("");
    expect(isAbsolute(resolved)).toBe(true);
  });

  it("should handle empty arguments", () => {
    const resolved = resolve("");
    expect(isAbsolute(resolved)).toBe(true);
  });
});

describe("normalizeString", () => {
  it("should normalize dots without allowing above root", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("foo/../../bar", true)).toBe("../bar");
  });
});

describe("isAbsolute", () => {
  it.each([
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "//server/share", expected: true },
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
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should handle same paths", () => {
    expect(relative("/foo/bar", "/foo/bar")).toBe("");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "", expected: "." },
    { input: "C:/foo/bar", expected: "C:/foo" }
  ])("should return $expected for dirname($input)", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object", () => {
    expect(
      format({
        root: "/",
        dir: "/home/user/dir",
        base: "file.txt",
        ext: ".txt",
        name: "file"
      })
    ).toBe("/home/user/dir/file.txt");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.html", ext: undefined, expected: "baz.html" },
    { input: "/foo/bar/baz.html", ext: ".html", expected: "baz" },
    { input: "C:\\foo\\bar\\", ext: undefined, expected: "bar" }
  ])("should return $expected for basename($input, $ext)", ({ input, ext, expected }) => {
    expect(basename(input, ext)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse a path into its components", () => {
    const parsed = parse("/home/user/dir/file.txt");
    expect(parsed).toEqual({
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
    expect(matchesGlob("foo/bar.js", "**/bar.js")).toBe(true);
  });
});
