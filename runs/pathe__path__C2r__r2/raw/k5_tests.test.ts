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

  it("should handle drive letters", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
    expect(normalize("C:")).toBe("C:/");
  });

  it("should handle UNC paths", () => {
    expect(normalize("\\\\server\\share\\dir")).toBe("//server/share/dir");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("/foo", "bar", "baz/asdf", "quux", "..")).toBe("/foo/bar/baz/asdf");
  });

  it("should ignore empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should return dot for empty arguments", () => {
    expect(join()).toBe(".");
    expect(join("", "")).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve absolute paths", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should handle multiple absolute paths", () => {
    expect(resolve("/foo/bar", "/baz/quux")).toBe("/baz/quux");
  });

  it("should handle empty inputs by falling back to cwd", () => {
    expect(resolve("")).not.toBe("");
  });
});

describe("normalizeString", () => {
  it("should normalize string path segments and respect allowAboveRoot", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
    expect(normalizeString("../foo", true)).toBe("../foo");
    expect(normalizeString("../foo", false)).toBe("foo");
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
  ])("should correctly identify absolute path $input as $expected", ({ input, expected }) => {
    expect(isAbsolute(input)).toBe(expected);
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows path for namespaced usage", () => {
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
  ])("should return extension for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/var/lib", "/var/lib/air")).toBe("air");
    expect(relative("/var/lib", "/var")).toBe("..");
  });

  it("should handle different drive letters", () => {
    expect(relative("C:/foo/bar", "D:/bar/baz")).toBe("D:/bar/baz");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz.js", expected: "/foo/bar" },
    { input: "/foo", expected: "/" },
    { input: "", expected: "." },
    { input: "foo", expected: "." },
    { input: "C:/foo/bar", expected: "C:/foo" }
  ])("should return dirname for $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object into a string path", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.js" })).toBe("/foo/bar/baz.js");
    expect(format({ name: "baz", ext: ".js" })).toBe("baz.js");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.js", extension: undefined, expected: "baz.js" },
    { input: "/foo/bar/baz.js", extension: ".js", expected: "baz" },
    { input: "", extension: undefined, expected: "" },
    { input: "/", extension: undefined, expected: "" }
  ])("should return basename for $input with ext $extension", ({ input, extension, expected }) => {
    expect(basename(input, extension)).toBe(expected);
  });
});

describe("parse", () => {
  it("should parse path into components", () => {
    const result = parse("/home/user/dir/file.txt");
    expect(result).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });

  it("should handle path without directory", () => {
    const result = parse("file.txt");
    expect(result).toEqual({
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
    expect(matchesGlob("foo/bar.js", "**/*.js")).toBe(true);
    expect(matchesGlob("/foo/bar.js", ["/foo/*.js"])).toBe(true);
  });
});
