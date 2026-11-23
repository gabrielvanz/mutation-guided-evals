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
    expect(normalize("foo/bar/..")).toBe("foo");
  });

  it("should handle empty string", () => {
    expect(normalize("")).toBe(".");
  });

  it("should normalize Windows backslashes", () => {
    expect(normalize("foo\\bar\\baz")).toBe("foo/bar/baz");
  });

  it("should handle absolute paths", () => {
    expect(normalize("/foo/../bar")).toBe("/bar");
  });

  it("should handle duplicate slashes", () => {
    expect(normalize("foo//bar///baz")).toBe("foo/bar/baz");
  });

  it("should preserve trailing slash", () => {
    expect(normalize("foo/bar/")).toBe("foo/bar/");
  });

  it("should handle drive letters", () => {
    expect(normalize("C:\\foo\\bar")).toBe("C:/foo/bar");
  });

  it("should handle UNC paths", () => {
    expect(normalize("\\\\server\\share\\dir")).toBe("//server/share/dir");
  });
});

describe("join", () => {
  it("should join path segments", () => {
    expect(join("foo", "bar", "baz")).toBe("foo/bar/baz");
  });

  it("should handle empty segments", () => {
    expect(join("foo", "", "bar")).toBe("foo/bar");
  });

  it("should handle leading/trailing slashes correctly", () => {
    expect(join("/foo/", "/bar")).toBe("/foo/bar");
  });

  it("should return dot for empty join", () => {
    expect(join()).toBe(".");
  });
});

describe("resolve", () => {
  it("should resolve relative paths", () => {
    const result = resolve("foo", "bar");
    expect(result).toContain("foo/bar");
  });

  it("should resolve absolute paths", () => {
    expect(resolve("/foo", "/bar")).toBe("/bar");
  });

  it("should handle empty arguments by falling back to cwd", () => {
    const result = resolve("");
    expect(isAbsolute(result)).toBe(true);
  });
});

describe("normalizeString", () => {
  it("should normalize dot segments", () => {
    expect(normalizeString("foo/./bar/../baz", true)).toBe("foo/baz");
  });

  it("should allow above root when specified", () => {
    expect(normalizeString("../foo", true)).toBe("../foo");
  });

  it("should not allow above root when false", () => {
    expect(normalizeString("../foo", false)).toBe("foo");
  });
});

describe("isAbsolute", () => {
  const cases = [
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
    { input: "//server/share", expected: true },
    { input: "foo/bar", expected: false },
    { input: "", expected: false }
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input}`, () => {
      expect(isAbsolute(input)).toBe(expected);
    });
  }
});

describe("toNamespacedPath", () => {
  it("should normalize windows path as namespaced path", () => {
    expect(toNamespacedPath("C:\\foo\\bar")).toBe("C:/foo/bar");
  });
});

describe("extname", () => {
  const cases = [
    { input: "index.html", expected: ".html" },
    { input: "index.coffee.md", expected: ".md" },
    { input: "index.", expected: "." },
    { input: "index", expected: "" },
    { input: ".index", expected: "" },
    { input: "..", expected: "" }
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input}`, () => {
      expect(extname(input)).toBe(expected);
    });
  }
});

describe("relative", () => {
  it("should calculate relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
  });

  it("should handle identical paths", () => {
    expect(relative("/foo/bar", "/foo/bar")).toBe("");
  });
});

describe("dirname", () => {
  const cases = [
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "", expected: "." },
    { input: "C:\\foo\\bar", expected: "C:/foo" }
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input}`, () => {
      expect(dirname(input)).toBe(expected);
    });
  }
});

describe("format", () => {
  it("should format path object", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.html" })).toBe("/foo/bar/baz.html");
  });

  it("should construct base from name and ext if base is missing", () => {
    expect(format({ name: "index", ext: ".js" })).toBe("index.js");
  });
});

describe("basename", () => {
  const cases = [
    { input: "/foo/bar/baz.html", expected: "baz.html" },
    { input: "/foo/bar/baz.html", ext: ".html", expected: "baz" },
    { input: "/foo/bar/", expected: "bar" },
    { input: "", expected: "" }
  ];

  for (const { input, ext, expected } of cases) {
    it(`should return ${expected} for basename(${input}${ext ? `, ${ext}` : ""})`, () => {
      expect(basename(input, ext)).toBe(expected);
    });
  }
});

describe("parse", () => {
  it("should parse a path into its segments", () => {
    const parsed = parse("/home/user/dir/file.txt");
    expect(parsed).toEqual({
      root: "/",
      dir: "/home/user/dir",
      base: "file.txt",
      ext: ".txt",
      name: "file"
    });
  });

  it("should handle paths without directories", () => {
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
    expect(matchesGlob("src/index.ts", "src/*.ts")).toBe(true);
    expect(matchesGlob("src/index.js", "src/*.ts")).toBe(false);
  });
});
