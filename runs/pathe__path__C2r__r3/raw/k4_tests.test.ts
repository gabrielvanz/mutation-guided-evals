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

  it("should normalize simple paths", () => {
    expect(normalize("foo/bar//baz/..")).toBe("foo/bar");
  });

  it("should handle Windows paths and convert backslashes", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths", () => {
    expect(normalize("/foo/bar/../baz")).toBe("/foo/baz");
  });

  it("should handle Windows drive letters", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should handle trailing separators", () => {
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

  it("should normalize joined paths", () => {
    expect(join("foo/bar", "../baz")).toBe("foo/baz");
  });
});

describe("resolve", () => {
  it("should resolve absolute path segments", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
  });

  it("should handle empty arguments by falling back to cwd", () => {
    const res = resolve("");
    expect(isAbsolute(res)).toBe(true);
  });
});

describe("normalizeString", () => {
  it("should normalize dot segments without allowing above root", () => {
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
  ])("should correctly identify absolute path $input as $expected", ({ input, expected }) => {
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
    expect(relative("/var/lib", "/var/lib/visible")).toBe("visible");
    expect(relative("/var/lib", "/var")).toBe("..");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz.txt", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo/bar", expected: "foo" },
    { input: "foo", expected: "." },
    { input: "", expected: "." }
  ])("should return dirname for $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format path object into string", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.txt" })).toBe("/foo/bar/baz.txt");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.txt", ext: undefined, expected: "baz.txt" },
    { input: "/foo/bar/baz.txt", ext: ".txt", expected: "baz" },
    { input: "/foo/bar/", ext: undefined, expected: "bar" }
  ])("should return basename for $input with ext $ext", ({ input, ext, expected }) => {
    expect(basename(input, ext)).toBe(expected);
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
});

describe("matchesGlob", () => {
  it("should match path against glob pattern", () => {
    expect(matchesGlob("foo/bar.js", "*.js")).toBe(false);
    expect(matchesGlob("foo/bar.js", "**/bar.js")).toBe(true);
  });
});
