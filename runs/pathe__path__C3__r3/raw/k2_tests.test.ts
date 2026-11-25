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
  it("should normalize empty path to current directory", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize standard paths", () => {
    expect(normalize("foo/bar//baz/../asdf")).toBe("foo/bar/asdf");
  });

  it("should normalize Windows paths", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });

  it("should handle absolute paths correctly when normalizing", () => {
    expect(normalize("/foo/../")).toBe("/");
  });

  it("should correctly handle drive letters like C:", () => {
    expect(normalize("C:")).toBe("C:/");
    expect(normalize("1:")).toBe("1:");
  });

  it("should handle relative UNC paths correctly", () => {
    expect(normalize("\\\\server\\share")).toBe("//server/share");
  });
});

describe("join", () => {
  it("should join multiple segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle segments with slashes correctly", () => {
    expect(join("/foo", "bar")).toBe("/foo/bar");
    expect(join("foo/", "/bar")).toBe("foo/bar");
  });

  it("should not drop leading slash from segment when joining", () => {
    expect(join("foo/", "/bar/baz")).toBe("foo/bar/baz");
  });

  it("should handle trailing slash in path correctly during join", () => {
    expect(join("foo/", "bar")).toBe("foo/bar");
  });
});

describe("resolve", () => {
  it("should resolve relative paths", () => {
    expect(resolve("foo", "bar")).toContain("foo/bar");
  });

  it("should resolve absolute paths correctly", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should correctly handle absolute and relative combination", () => {
    expect(resolve("/foo", "bar")).toBe("/foo/bar");
  });

  it("should return dot when resolved path length is zero", () => {
    expect(resolve("", "")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize string path without allowing above root", () => {
    expect(normalizeString("/foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("../foo", true)).toBe("../foo");
  });

  it("should handle complex dot segments correctly with strict condition", () => {
    expect(normalizeString("a/b/..", false)).toBe("a");
    expect(normalizeString("a/b/../..", false)).toBe("");
  });

  it("should handle multiple dots and specific edge cases", () => {
    expect(normalizeString("a/../../b", true)).toBe("../b");
    expect(normalizeString("a/../../b", false)).toBe("b");
  });
});

describe("isAbsolute", () => {
  it.each([
    { input: "/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "foo/bar", expected: false },
    { input: "", expected: false }
  ])("should determine if $input is absolute: $expected", ({ input, expected }) => {
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
    { input: ".gitignore", expected: "" }
  ])("should return extension for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should handle different drive letters properly without incorrect logical shortcuts", () => {
    expect(relative("C:\\foo", "D:\\bar")).toBe("D:/bar");
  });

  it("should handle same drive letter relative paths", () => {
    expect(relative("C:\\foo\\bar", "C:\\foo\\baz")).toBe("../baz");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo", expected: "/" },
    { input: "foo/bar", expected: "foo" },
    { input: "foo", expected: "." },
    { input: "C:", expected: "." },
    { input: "C:/foo//", expected: "C:/" }
  ])("should return dirname of $input", ({ input, expected }) => {
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

  it("should handle extension with or without leading dot correctly", () => {
    expect(format({ name: "file", ext: "txt" })).toBe("file.txt");
    expect(format({ name: "file", ext: ".txt" })).toBe("file.txt");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.html", extension: undefined, expected: "baz.html" },
    { input: "/foo/bar/baz.html", extension: ".html", expected: "baz" },
    { input: "/foo/bar/baz/", extension: undefined, expected: "baz" }
  ])("should return basename of $input", ({ input, extension, expected }) => {
    expect(basename(input, extension)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse path into segments", () => {
    const result = parse("/home/user/dir/file.txt");
    expect(result).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });

  it("should handle root paths safely without crashing on optional chaining", () => {
    const result = parse("/");
    expect(result).toEqual({
      root: "/",
      dir: "/",
      base: "",
      ext: "",
      name: ""
    });
  });

  it("should correctly identify directory when no slash exists", () => {
    const result = parse("file.txt");
    expect(result.dir).toBe("");
  });
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("/foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar.js", "**/bar.js")).toBe(true);
  });
});
