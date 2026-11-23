import { describe, it, expect } from "vitest";
import {
  normalizeAliases,
  resolveAlias,
  reverseResolveAlias,
  filename
} from "../../src/utils";

describe("normalizeAliases", () => {
  it("should sort aliases from specific to general and resolve nested aliases", () => {
    const input = {
      "~/": "/root/",
      "~/components": "/root/src/components"
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "~/components": "/root/src/components",
      "~/": "/root/"
    });
  });

  it("should return the same object if already normalized", () => {
    const input = {
      "~/": "/root/"
    };
    const normalized = normalizeAliases(input);
    const reNormalized = normalizeAliases(normalized);
    expect(reNormalized).toBe(normalized);
  });

  it("should resolve nested aliases when one alias points to another", () => {
    const input = {
      "@lib": "@core/lib",
      "@core": "/app/core"
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "@core": "/app/core",
      "@lib": "/app/core/lib"
    });
  });
});

describe("resolveAlias", () => {
  const aliases = {
    "@": "/app/src",
    "@components": "/app/src/components"
  };

  const testCases = [
    { path: "@components/Button.ts", expected: "/app/src/components/Button.ts" },
    { path: "@/utils/index.ts", expected: "/app/src/utils/index.ts" },
    { path: "C:\\app\\src\\components\\Button.ts", expected: "C:/app/src/components/Button.ts" },
    { path: "@unmatched/file.ts", expected: "@unmatched/file.ts" }
  ];

  for (const { path, expected } of testCases) {
    it(`should resolve ${path} to ${expected}`, () => {
      expect(resolveAlias(path, aliases)).toBe(expected);
    });
  }

  it("should not resolve alias when character after alias is not a separator", () => {
    const simpleAliases = {
      "@app": "/path/to/app"
    };
    expect(resolveAlias("@apples/file.ts", simpleAliases)).toBe("@apples/file.ts");
  });
});

describe("reverseResolveAlias", () => {
  const aliases = {
    "@": "/app/src",
    "@components": "/app/src/components"
  };

  it("should return sorted possible alias resolutions ordered by length descending", () => {
    const customAliases = {
      "@": "/app/src",
      "@sub": "/app/src/sub",
      "@nested": "/app/src/sub/nested"
    };
    const result = reverseResolveAlias("/app/src/sub/nested/file.ts", customAliases);
    expect(result).toEqual([
      "@/sub/nested/file.ts",
      "@sub/nested/file.ts",
      "@nested/file.ts"
    ]);
  });

  it("should return empty array when no alias matches", () => {
    const result = reverseResolveAlias("/other/path/file.ts", aliases);
    expect(result).toEqual([]);
  });

  it("should correctly handle trailing slashes and path boundaries during reverse resolution", () => {
    const result = reverseResolveAlias("/app/src/components/Button.ts", aliases);
    expect(result).toEqual([
      "@/components/Button.ts",
      "@components/Button.ts"
    ]);
  });
});

describe("filename", () => {
  const testCases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "C:\\path\\to\\file.d.ts", expected: "file.d" },
    { input: "/path/to/.gitignore", expected: ".gitignore" },
    { input: "file-only.js", expected: "file-only" },
    { input: "/path/to/", expected: undefined },
    { input: "", expected: undefined }
  ];

  for (const { input, expected } of testCases) {
    it(`should extract filename for ${JSON.stringify(input)}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
