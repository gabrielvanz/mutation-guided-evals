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
    expect(normalize("foo/bar//baz/asdf")).toBe("foo/bar/baz/asdf");
  });

  it("should handle empty string as current directory", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize Windows paths with backslashes", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths and dots", () => {
    expect(normalize("/foo/bar//baz/..")).toBe("/foo/bar");
  });

  it("should preserve drive letters", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
    expect(normalize("C:")).toBe("C:/");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });

  it("should handle UNC paths", () => {
    expect(normalize("\\\\server\\share\\dir")).toBe("//server/share/dir");
  });
});

describe("join", () => {
  it("should join multiple segments", () => {
    expect(join("/foo", "bar", "baz/asdf", "quux")).toBe("/foo/bar/baz/asdf/quux");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle relative and absolute mixed segments", () => {
    expect(join("/foo", "../bar")).toBe("/bar");
  });

  it("should return dot for empty segments", () => {
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve absolute path sequence", () => {
    expect(resolve("/var", "lib", "router")).toBe("/var/lib/router");
  });

  it("should resolve with parent directory references", () => {
    expect(resolve("/var/lib", "../", "router")).toBe("/var/router");
  });

  it("should fall back to cwd if no arguments are provided", () => {
    expect(typeof resolve()).toBe("string");
  });
});

describe("normalizeString", () => {
  it("should normalize path strings allowing above root", () => {
    expect(normalizeString("/foo/../bar", true)).toBe("bar");
    expect(normalizeString("foo/../../bar", true)).toBe("../bar");
  });

  it("should normalize path strings disallowing above root", () => {
    expect(normalizeString("/foo/../../bar", false)).toBe("bar");
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
  ])("should correctly identify absolute path $input", ({ input, expected }) => {
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
    { input: "index.html", expected: ".html" },
    { input: "index.coffee.md", expected: ".md" },
    { input: "index.", expected: "." },
    { input: "index", expected: "" },
    { input: ".index", expected: "" },
    { input: ".index.s", expected: ".s" }
  ])("should return extension for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should calculate relative path between two absolute paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should return target if drive letters differ", () => {
    expect(relative("C:/foo/bar", "D:/foo/bar")).toBe("D:/foo/bar");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz/asdf", expected: "/foo/bar/baz" },
    { input: "foo/bar", expected: "foo" },
    { input: "/foo", expected: "/" },
    { input: "", expected: "." }
  ])("should return dirname for $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object into a string path", () => {
    expect(
      format({
        root: "/",
        dir: "/home/user/dir",
        base: "file.txt"
      })
    ).toBe("/home/user/dir/file.txt");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz/asdf.html", ext: undefined, expected: "asdf.html" },
    { input: "/foo/bar/baz/asdf.html", ext: ".html", expected: "asdf" },
    { input: "foo/bar/", ext: undefined, expected: "bar" }
  ])("should return basename for $input with ext $ext", ({ input, ext, expected }) => {
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
    expect(matchesGlob("/foo/bar/baz.js", "*.js")).toBe(false);
    expect(matchesGlob("/foo/bar/baz.js", "**/baz.js")).toBe(true);
  });
});
