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
  it("should equal a POSIX slash", () => {
    expect(sep).toBe("/");
  });
});

describe("normalize", () => {
  it("should handle empty path string", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize Windows paths and backslashes", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should collapse duplicate slashes", () => {
    expect(normalize("foo//bar///baz")).toBe("foo/bar/baz");
  });

  it("should handle current and parent directory segments", () => {
    expect(normalize("foo/./bar/../baz")).toBe("foo/baz");
  });

  it("should preserve absolute paths", () => {
    expect(normalize("/foo/bar/..")).toBe("/foo");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });

  it("should handle Windows drive letter paths", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should handle UNC paths", () => {
    expect(normalize("\\\\server\\share\\foo")).toBe("//server/share/foo");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should omit empty segments", () => {
    expect(join("foo", "", "bar", null as unknown as string, "baz")).toBe("foo/bar/baz");
  });

  it("should normalize the joined path", () => {
    expect(join("foo/", "/bar")).toBe("foo/bar");
  });

  it("should handle zero arguments", () => {
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve relative paths to an absolute path", () => {
    const resolved = resolve("foo", "bar");
    expect(isAbsolute(resolved)).toBe(true);
    expect(resolved.endsWith("foo/bar")).toBe(true);
  });

  it("should handle absolute path segments during resolution", () => {
    expect(resolve("/foo", "/bar", "baz")).toBe("/bar/baz");
  });

  it("should handle empty path segments", () => {
    expect(resolve("/foo", "", "bar")).toBe("/foo/bar");
  });

  it("should handle Windows drive letters and UNC in resolve", () => {
    expect(resolve("C:\\foo", "bar")).toBe("C:/foo/bar");
  });
});

describe("normalizeString", () => {
  it("should normalize string segments without allowing above root", () => {
    expect(normalizeString("/foo/../bar", false)).toBe("bar");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("/foo/../../bar", true)).toBe("../bar");
  });

  it("should handle empty string", () => {
    expect(normalizeString("", false)).toBe("");
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
    { input: "foo/bar..txt", expected: ".txt" },
    { input: "..", expected: "" }
  ])("should return extension for $input", ({ input, expected }) => {
    expect(extname(input)).toBe(expected);
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/var/lib", "/var/lib/air")).toBe("air");
    expect(relative("/var/lib/air", "/var/lib")).toBe("..");
  });

  it("should return absolute path if drive letters differ on Windows", () => {
    expect(relative("C:/foo/bar", "D:/foo/bar")).toBe("D:/foo/bar");
  });
});

describe("dirname", () => {
  it.each([
    { input: "/foo/bar/baz.txt", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo/bar", expected: "foo" },
    { input: "bar", expected: "." },
    { input: "/bar", expected: "/" },
    { input: "C:\\foo\\bar", expected: "C:/foo" },
    { input: "C:\\", expected: "/" }
  ])("should return dirname for $input", ({ input, expected }) => {
    expect(dirname(input)).toBe(expected);
  });
});

describe("format", () => {
  it("should format a path object into a string", () => {
    expect(
      format({
        root: "/",
        dir: "/path/to",
        base: "file.txt"
      })
    ).toBe("/path/to/file.txt");
  });

  it("should format a path object using name and ext", () => {
    expect(
      format({
        root: "/",
        dir: "/path/to",
        name: "file",
        ext: "txt"
      })
    ).toBe("/path/to/file.txt");
  });
});

describe("basename", () => {
  it.each([
    { input: "/foo/bar/baz.txt", extension: undefined, expected: "baz.txt" },
    { input: "/foo/bar/baz.txt", extension: ".txt", expected: "baz" },
    { input: "/foo/bar/", extension: undefined, expected: "bar" },
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

  it("should handle paths without directories", () => {
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
    expect(matchesGlob("/foo/bar/baz.ts", "*.ts")).toBe(false);
    expect(matchesGlob("/foo/bar/baz.ts", "**/*.ts")).toBe(true);
  });

  it("should match path against array of patterns", () => {
    expect(matchesGlob("/foo/bar/baz.ts", ["*.js", "**/*.ts"])).toBe(true);
  });
});
