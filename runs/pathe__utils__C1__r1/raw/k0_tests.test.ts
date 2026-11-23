import { describe, it, expect } from "vitest";
import { normalizeAliases, resolveAlias, reverseResolveAlias, filename } from "../../src/utils";

describe("utils", () => {
  describe("normalizeAliases", () => {
    it("should return the same object if already normalized", () => {
      const aliases = { "@app": "/src/app" };
      const normalized1 = normalizeAliases(aliases);
      const normalized2 = normalizeAliases(normalized1);
      expect(normalized2).toBe(normalized1);
    });

    it("should sort aliases by specificity (longest parts first)", () => {
      const aliases = {
        "fs": "/node_modules/fs",
        "fs/promises": "/node_modules/fs/promises",
      };
      const normalized = normalizeAliases(aliases);
      const keys = Object.keys(normalized);
      expect(keys[0]).toBe("fs/promises");
      expect(keys[1]).toBe("fs");
    });

    it("should resolve alias values in relation to each other recursively", () => {
      const aliases = {
        "@base": "/root",
        "@app": "@base/app",
      };
      const normalized = normalizeAliases(aliases);
      expect(normalized["@app"]).toBe("/root/app");
    });
  });

  describe("resolveAlias", () => {
    it("should resolve matching alias with trailing slash boundaries", () => {
      const aliases = { "@components": "/src/components" };
      const resolved = resolveAlias("@components/Button.ts", aliases);
      expect(resolved).toBe("/src/components/Button.ts");
    });

    it("should return normalized path if no alias matches", () => {
      const aliases = { "@components": "/src/components" };
      const resolved = resolveAlias("src/utils.ts", aliases);
      expect(resolved).toBe("src/utils.ts");
    });

    it("should not match partial alias segments without slash boundary", () => {
      const aliases = { "@comp": "/src/components" };
      const resolved = resolveAlias("@components/Button.ts", aliases);
      expect(resolved).toBe("@components/Button.ts");
    });
  });

  describe("reverseResolveAlias", () => {
    it("should return matching reversed alias resolutions sorted by length", () => {
      const aliases = {
        "@root": "/my/root",
        "@app": "/my/root/app",
      };
      const result = reverseResolveAlias("/my/root/app/index.ts", aliases);
      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toContain("@root");
    });

    it("should return an empty array if path does not match any alias target", () => {
      const aliases = { "@app": "/my/root/app" };
      const result = reverseResolveAlias("/other/path/index.ts", aliases);
      expect(result).toEqual([]);
    });
  });

  describe("filename", () => {
    it("should extract filename without extension", () => {
      expect(filename("/path/to/file.ts")).toBe("file");
      expect(filename("C:\\path\\to\\file.bundle.js")).toBe("file.bundle");
    });

    it("should handle files without extension", () => {
      expect(filename("/path/to/README")).toBe("README");
    });

    it("should return undefined or handle empty/dotfiles appropriately", () => {
      expect(filename("")).toBe(undefined);
      expect(filename(".gitignore")).toBe(".gitignore");
    });
  });
});
