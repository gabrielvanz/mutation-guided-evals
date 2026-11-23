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
  const cases = [
    { input: "/foo/bar", expected: true },
    { input: "C:/foo/bar", expected: true },
    { input: "C:\\foo\\bar", expected: true },
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
  it("should normalize Windows path for namespacing", () => {
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

  it("should return absolute path if drive letters differ", () => {
    expect(relative("C:/foo", "D:/bar")).toBe("D:/bar");
  });
});

describe("dirname", () => {
  const cases = [
    { input: "/foo/bar/baz", expected: "/foo/bar" },
    { input: "/foo/bar/", expected: "/foo" },
    { input: "foo", expected: "." },
    { input: "", expected: "." }
  ];

  for (const { input, expected } of cases) {
    it(`should return ${expected} for ${input}`, () => {
      expect(dirname(input)).toBe(expected);
    });
  }
});

describe("format", () => {
  it("should format path object into string", () => {
    expect(format({ root: "/", dir: "/foo/bar", base: "baz.txt" })).toBe("/foo/bar/baz.txt");
  });

  it("should format path object with ext", () => {
    expect(format({ dir: "foo", name: "bar", ext: "txt" })).toBe("foo/bar.txt");
  });
});

describe("basename", () => {
  it("should return base name of path", () => {
    expect(basename("/foo/bar/baz.html")).toBe("baz.html");
  });

  it("should strip extension if provided", () => {
    expect(basename("/foo/bar/baz.html", ".html")).toBe("baz");
  });
});

describe("parse", () => {
  it("should parse path into object components", () => {
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
    expect(matchesGlob("foo/bar.js", "**/*.js")).toBe(true);
    expect(matchesGlob("foo/bar.js", "*.ts")).toBe(false);
  });
});
