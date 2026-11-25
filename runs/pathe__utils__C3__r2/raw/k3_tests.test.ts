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

  it("should resolve relative alias values that start with another alias correctly using path separators", () => {
    const input = {
      "@base": "/app",
      "@components": "@base/components"
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "@components": "/app/components",
      "@base": "/app"
    });
  });

  it("should not resolve alias values when path separator requirement is missing", () => {
    const input = {
      "@app": "/app",
      "@apple": "@app/data"
    };
    const result = normalizeAliases(input);
    expect(result).toEqual({
      "@apple": "@app/data",
      "@app": "/app"
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

  it("should handle alias with trailing slash when resolving paths", () => {
    const customAliases = {
      "@components/": "/app/src/components/"
    };
    expect(resolveAlias("@components/Button.ts", customAliases)).toBe("/app/src/components/Button.ts");
  });
});

describe("reverseResolveAlias", () => {
  const aliases = {
    "@": "/app/src",
    "@components": "/app/src/components"
  };

  it("should return sorted possible alias resolutions", () => {
    const result = reverseResolveAlias("/app/src/components/Button.ts", aliases);
    expect(result).toEqual(["@/components/Button.ts", "@components/Button.ts"]);
  });

  it("should return empty array when no alias matches", () => {
    const result = reverseResolveAlias("/other/path/file.ts", aliases);
    expect(result).toEqual([]);
  });

  it("should handle trailing slash in alias during reverse resolution", () => {
    const customAliases = {
      "@components/": "/app/src/components/"
    };
    const result = reverseResolveAlias("/app/src/components/Button.ts", customAliases);
    expect(result).toEqual(["@components/Button.ts"]);
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
