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
  it("should normalize paths correctly", () => {
    const cases = [
      { input: "", expected: "." },
      { input: "foo//bar", expected: "foo/bar" },
      { input: "foo/./bar", expected: "foo/bar" },
      { input: "foo/../bar", expected: "bar" },
      { input: "C:\\dir\\file", expected: "C:/dir/file" },
      { input: "/foo/bar/..", expected: "/foo" },
      { input: "/", expected: "/" },
      { input: "foo/", expected: "foo/" }
    ];

    for (const { input, expected } of cases) {
      expect(normalize(input)).toBe(expected);
    }
  });
});

describe("join", () => {
  it("should join path segments", () => {
    const cases = [
      { input: ["foo", "bar"], expected: "foo/bar" },
      { input: ["/foo", "bar"], expected: "/foo/bar" },
      { input: ["foo", ""], expected: "foo" },
      { input: ["", "bar"], expected: "bar" },
      { input: ["foo/", "/bar"], expected: "foo/bar" }
    ];

    for (const { input, expected } of cases) {
      expect(join(...input)).toBe(expected);
    }
  });
});

describe("resolve", () => {
  it("should resolve paths to absolute paths", () => {
    expect(resolve("/foo/bar", "./baz")).toBe("/foo/bar/baz");
    expect(resolve("C:\\foo", "bar")).toBe("C:/foo/bar");
    expect(resolve("")).toBeTypeOf("string");
  });
});

describe("normalizeString", () => {
  it("should normalize string paths with allowAboveRoot flag", () => {
    expect(normalizeString("foo/../bar", false)).toBe("bar");
    expect(normalizeString("../foo", true)).toBe("../foo");
    expect(normalizeString("../foo", false)).toBe("foo");
  });
});

describe("isAbsolute", () => {
  it("should detect absolute paths", () => {
    const cases = [
      { input: "/foo/bar", expected: true },
      { input: "C:/foo/bar", expected: true },
      { input: "C:\\foo\\bar", expected: true },
      { input: "foo/bar", expected: false },
      { input: "", expected: false }
    ];

    for (const { input, expected } of cases) {
      expect(isAbsolute(input)).toBe(expected);
    }
  });
});

describe("toNamespacedPath", () => {
  it("should normalize windows paths for namespaced path", () => {
    expect(toNamespacedPath("C:\\dir\\file")).toBe("C:/dir/file");
  });
});

describe("extname", () => {
  it("should return the file extension", () => {
    const cases = [
      { input: "index.ts", expected: ".ts" },
      { input: "dir/file.tar.gz", expected: ".gz" },
      { input: "README", expected: "" },
      { input: "..", expected: "" }
    ];

    for (const { input, expected } of cases) {
      expect(extname(input)).toBe(expected);
    }
  });
});

describe("relative", () => {
  it("should compute relative path between two paths", () => {
    expect(relative("/data/orandea/test/aaa", "/data/orandea/impl/bbb")).toBe("../../impl/bbb");
    expect(relative("C:/foo/bar", "D:/baz")).toBe("D:/baz");
  });
});

describe("dirname", () => {
  it("should return the directory name of a path", () => {
    const cases = [
      { input: "/foo/bar/baz.txt", expected: "/foo/bar" },
      { input: "/foo/bar/", expected: "/foo" },
      { input: "foo.txt", expected: "." },
      { input: "C:\\", expected: "/" }
    ];

    for (const { input, expected } of cases) {
      expect(dirname(input)).toBe(expected);
    }
  });
});

describe("format", () => {
  it("should format a path object into a path string", () => {
    expect(format({ root: "/", dir: "/path/to", base: "file.txt" })).toBe("/path/to/file.txt");
    expect(format({ name: "file", ext: "txt" })).toBe("file.txt");
  });
});

describe("basename", () => {
  it("should return the last portion of a path", () => {
    expect(basename("/foo/bar/baz.txt")).toBe("baz.txt");
    expect(basename("/foo/bar/baz.txt", ".txt")).toBe("baz");
    expect(basename("")).toBe("");
  });
});

describe("parse", () => {
  it("should parse a path into an object", () => {
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
  it("should match paths against glob patterns", () => {
    expect(matchesGlob("/foo/bar.ts", "*.ts")).toBe(false);
    expect(matchesGlob("/foo/bar.ts", "**/bar.ts")).toBe(true);
    expect(matchesGlob("src/index.ts", ["src/*.ts"])).toBe(true);
  });
});
