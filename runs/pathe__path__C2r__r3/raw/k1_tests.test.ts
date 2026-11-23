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

  it("should handle Windows drive paths in resolve", () => {
    expect(resolve("C:\\foo", "bar")).toBe("C:/foo/bar");
  });
});

describe("normalizeString", () => {
  it("should normalize string path without above root when false", () => {
    expect(normalizeString("foo/bar/../baz", false)).toBe("foo/baz");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("../foo", true)).toBe("../foo");
  });

  it("should handle empty string in normalizeString", () => {
    expect(normalizeString("", false)).toBe("");
  });
});

describe("isAbsolute", () => {
  const cases = [
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "//server/share", expected: true },
    { input: "foo/bar", expected: false },
    { input: "./foo", expected: false },
    { input: "", expected: false }
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input || "empty string"}`, () => {
      expect(isAbsolute(input)).toBe(expected);
    });
  }
});

describe("toNamespacedPath", () => {
  it("should normalize windows path for namespaced path", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  const cases = [
    { input: "index.html", expected: ".html" },
    { input: "index.coffee.md", expected: ".md" },
    { input: "index.", expected: "." },
    { input: "index", expected: "" },
    { input: ".gitignore", expected: "" },
    { input: "..", expected: "" }
  ];

  for (const { input, expected } of cases) {
    it(`should extract extension ${JSON.stringify(expected)} from ${JSON.stringify(input)}`, () => {
      expect(extname(input)).toBe(expected);
    });
  }
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should return absolute path if drive letters differ", () => {
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });

  it("should handle identical paths", () => {
    expect(relative("/foo/bar", "/foo/bar")).toBe("");
  });
});

describe("dirname", () => {
  const cases = [
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar", expected: "/foo" },
    { input: "/foo", expected: "/" },
    { input: "/", expected: "/" },
    { input: "foo/bar", expected: "foo" },
    { input: "foo", expected: "." },
    { input: "C:\\foo\\bar", expected: "C:/foo" },
    { input: "C:\\", expected: "/" }
  ];

  for (const { input, expected } of cases) {
    it(`should return ${JSON.stringify(expected)} for dirname(${JSON.stringify(input)})`, () => {
      expect(dirname(input)).toBe(expected);
    });
  }
});

describe("format", () => {
  it("should format path object into a string path", () => {
    const formatted = format({
      root: "/",
      dir: "/foo/bar",
      base: "baz.html",
      ext: ".html",
      name: "baz"
    });
    expect(formatted).toBe("/foo/bar/baz.html");
  });

  it("should format path object without root", () => {
    const formatted = format({
      dir: "foo/bar",
      name: "baz",
      ext: "txt"
    });
    expect(formatted).toBe("foo/bar/baz.txt");
  });
});

describe("basename", () => {
  const cases = [
    { input: "/foo/bar/baz.html", expected: "baz.html" },
    { input: "/foo/bar/baz.html", extension: ".html", expected: "baz" },
    { input: "/foo/bar/", expected: "bar" },
    { input: "/", expected: "" },
    { input: "", expected: "" }
  ];

  for (const { input, extension, expected } of cases) {
    it(`should return basename for ${JSON.stringify(input)}${extension ? ` with ext ${JSON.stringify(extension)}` : ""}`, () => {
      expect(basename(input, extension)).toBe(expected);
    });
  }
});

describe("parse", () => {
  it("should parse a file path into its components", () => {
    const parsed = parse("/home/user/dir/file.txt");
    expect(parsed).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });

  it("should handle paths without directory", () => {
    const parsed = parse("file.txt");
    expect(parsed).toEqual({
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
    expect(matchesGlob("/foo/bar/baz.ts", "**/*.ts")).toBe(true);
    expect(matchesGlob("/foo/bar/baz.js", "**/*.ts")).toBe(false);
  });

  it("should match path against array of glob patterns", () => {
    expect(matchesGlob("/foo/bar/baz.js", ["**/*.ts", "**/*.js"])).toBe(true);
  });
});
