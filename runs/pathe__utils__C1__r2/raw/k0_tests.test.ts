import { describe, it, expect } from "vitest";
import { normalizeAliases, resolveAlias, reverseResolveAlias, filename } from "../../src/utils";

describe("normalizeAliases", () => {
  it("should return the same object if already normalized", () => {
    const aliases = { "@app": "/src/app" };
    const normalized1 = normalizeAliases(aliases);
    const normalized2 = normalizeAliases(normalized1);
    expect(normalized1).toBe(normalized2);
  });

  it("should sort and resolve aliases correctly", () => {
    const aliases = {
      "@": "/root",
      "@components": "/root/components",
    };
    const normalized = normalizeAliases(aliases);
    expect(normalized["@components"]).toBe("/root/components");
  });
});

describe("resolveAlias", () => {
  it("should resolve a matching alias with trailing slash", () => {
    const aliases = { "@foo/": "/bar/" };
    const resolved = resolveAlias("@foo/baz", aliases);
    expect(resolved).toBe("/bar/baz");
  });

  it("should return normalized path if no alias matches", () => {
    const aliases = { "@foo/": "/bar/" };
    const resolved = resolveAlias("other/path", aliases);
    expect(resolved).toBe("other/path");
  });
});

describe("reverseResolveAlias", () => {
  it("should return matching reverse alias resolutions", () => {
    const aliases = { "@": "/src" };
    const resolutions = reverseResolveAlias("/src/index.ts", aliases);
    expect(Array.isArray(resolutions)).toBe(true);
  });
});

describe("filename", () => {
  it("should extract filename without extension", () => {
    expect(filename("/path/to/file.ts")).toBe("file");
    expect(filename("file.js")).toBe("file");
  });

  it("should return undefined for empty path segments", () => {
    expect(filename("")).toBe(undefined);
  });

  it("should handle files starting with a dot or no extension", () => {
    expect(filename("/path/to/.gitignore")).toBe(".gitignore");
    expect(filename("/path/to/README")).toBe("README");
  });
});
