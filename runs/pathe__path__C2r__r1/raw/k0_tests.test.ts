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
  it("should handle empty string", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize backslashes and duplicate slashes", () => {
    expect(normalize("foo\\bar//baz")).toBe("foo/bar/baz");
  });

  it("should normalize relative paths with . and ..", () => {
    expect(normalize("foo/./bar/../baz")).toBe("foo/baz");
  });

  it("should handle absolute paths", () => {
    expect(normalize("/foo/bar/..")).toBe("/foo");
  });

  it("should handle Windows drive letters", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
    expect(normalize("C:")).toBe("C:/");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });
});

describe("join", () => {
  it("should join multiple segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle leading and trailing slashes correctly", () => {
    expect(join("/foo", "bar/")).toBe("/foo/bar/");
  });

  it("should return . for empty inputs", () => {
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve relative paths to absolute", () => {
    expect(resolve("foo", "bar")).toContain("/foo/bar");
  });

  it("should handle absolute path segments", () => {
    expect(resolve("/foo", "/bar", "baz")).toBe("/bar/baz");
  });

  it("should handle empty paths", () => {
    expect(resolve("")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize segments and respect allowAboveRoot", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
    expect(normalizeString("../foo", true)).toBe("../foo");
    expect(normalizeString("../foo", false)).toBe("foo");
  });
});

describe("isAbsolute", () => {
  it("should identify absolute paths", () => {
    expect(isAbsolute("/foo/bar")).toBe(true);
    expect(isAbsolute("C:/foo/bar")).toBe(true);
    expect(isAbsolute("C:\\foo\\bar")).toBe(true);
    expect(isAbsolute("foo/bar")).toBe(false);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows paths for namespacing", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
    expect(toNamespacedPath("foo/bar")).toBe("foo/bar");
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
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should handle identical paths", () => {
    expect(relative("/foo/bar", "/foo/bar")).toBe("");
  });

  it("should handle different drive letters on Windows", () => {
    expect(relative("C:/foo/bar", "D:/foo/bar")).toBe("D:/foo/bar");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "C:/foo/bar", expected: "C:/foo" }
  ])("should return $expected for dirname($input)", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object into string", () => {
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

  it("should format without root", () => {
    expect(
      format({
        dir: "home/user",
        name: "file",
        ext: "txt"
      })
    ).toBe("home/user/file.txt");
  });
});

describe("basename", () => {
  it("should return base name with optional extension removal", () => {
    expect(basename("/foo/bar/baz.html")).toBe("baz.html");
    expect(basename("/foo/bar/baz.html", ".html")).toBe("baz");
    expect(basename("")).toBe("");
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

  it("should parse file without directory", () => {
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
    expect(matchesGlob("bar.js", "*.js")).toBe(true);
    expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
  });
});
