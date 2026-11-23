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
    expect(normalize("C:\\foo\\bar\\baz\\asdf")).toBe("C:/foo/bar/baz/asdf");
  });

  it("should handle dot and double dot segments", () => {
    expect(normalize("/foo/bar//baz/asdf/quux/..")).toBe("/foo/bar/baz/asdf");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("/foo/bar/")).toBe("/foo/bar/");
  });

  it("should handle drive letter alone", () => {
    expect(normalize("C:")).toBe("C:/");
  });
});

describe("join", () => {
  it("should join multiple segments", () => {
    expect(join("/foo", "bar", "baz/asdf", "quux", "..")).toBe("/foo/bar/baz/asdf");
  });

  it("should ignore empty segments", () => {
    expect(join("/foo", "", "bar")).toBe("/foo/bar");
  });

  it("should return dot for empty segments list", () => {
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve relative paths to absolute", () => {
    const result = resolve("foo/bar", "/baz/quux", "..");
    expect(result).toBe("/baz");
  });

  it("should handle empty arguments", () => {
    const result = resolve("");
    expect(isAbsolute(result)).toBe(true);
  });
});

describe("normalizeString", () => {
  it("should normalize path strings respecting allowAboveRoot", () => {
    expect(normalizeString("/foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("/foo/../../bar", true)).toBe("../bar");
  });
});

describe("isAbsolute", () => {
  it.each([
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "foo/bar", expected: false },
    { input: "", expected: false }
  ])("should correctly identify absolute path $input", ({ input, expected }) => {
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
    { input: ".index", expected: "" },
    { input: "..", expected: "" }
  ])("should return extension for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should return absolute path if drive letters differ", () => {
    expect(relative("C:/foo/bar", "D:/foo/bar")).toBe("D:/foo/bar");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz/asdf", expected: "/foo/bar/baz" },
    { input: "C:\\foo\\bar", expected: "C:/foo" },
    { input: "/foo", expected: "/" },
    { input: "foo", expected: "." }
  ])("should return dirname for $input", ({ input, expected }) => {
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
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz/asdf.html", extension: undefined, expected: "asdf.html" },
    { input: "/foo/bar/baz/asdf.html", extension: ".html", expected: "asdf" },
    { input: "", extension: undefined, expected: "" }
  ])("should return basename for $input with extension $extension", ({ input, extension, expected }) => {
    expect(basename(input, extension)).toBe(expected);
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
    expect(matchesGlob("/foo/bar/baz.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar/baz.js", "**/baz.js")).toBe(true);
  });
});
