import { describe, it, expect } from "vitest";
import {
  normalizeAliases,
  resolveAlias,
  reverseResolveAlias,
  filename,
} from "../../src/utils";

describe("normalizeAliases", () => {
  it("should return the same object if already normalized", () => {
    const aliases = { "@app": "/src/app" };
    const normalized1 = normalizeAliases(aliases);
    const normalized2 = normalizeAliases(normalized1);
    expect(normalized2).toBe(normalized1);
  });

  it("should sort aliases from specific to general and resolve nested aliases", () => {
    const aliases = {
      "~/": "/root/",
      "~/components": "~/comp",
    };
    const result = normalizeAliases(aliases);
    expect(result).toEqual({
      "~/": "/root/",
      "~/components": "~/comp",
    });
  });

  it("should handle empty aliases object", () => {
    const result = normalizeAliases({});
    expect(result).toEqual({});
  });
});

describe("resolveAlias", () => {
  it("should resolve alias when path matches alias prefix", () => {
    const aliases = { "@components": "/src/components" };
    const result = resolveAlias("@components/Button.ts", aliases);
    expect(result).toBe("/src/components/Button.ts");
  });

  it("should return normalized path when no alias matches", () => {
    const aliases = { "@components": "/src/components" };
    const result = resolveAlias("/src/utils/index.ts", aliases);
    expect(result).toBe("/src/utils/index.ts");
  });

  it("should normalize Windows paths when resolving aliases", () => {
    const aliases = { "@app": "C:\\project\\src" };
    const result = resolveAlias("@app\\index.ts", aliases);
    expect(result).toBe("C:/project/src/index.ts");
  });
});

describe("reverseResolveAlias", () => {
  it("should return matching reverse alias resolutions sorted by length", () => {
    const aliases = {
      "~": "/root",
      "~/app": "/root/app",
    };
    const result = reverseResolveAlias("/root/app/index.ts", aliases);
    expect(result).toEqual(["~/app/index.ts", "~/app/index.ts"]);
  });

  it("should return an empty array if no reverse alias matches", () => {
    const aliases = { "@app": "/src/app" };
    const result = reverseResolveAlias("/other/path/file.ts", aliases);
    expect(result).toEqual([]);
  });
});

describe("filename", () => {
  const cases = [
    { input: "/path/to/file.ts", expected: "file" },
    { input: "file.min.js", expected: "file.min" },
    { input: "C:\\path\\to\\image.png", expected: "image" },
    { input: "README", expected: "README" },
    { input: ".gitignore", expected: ".gitignore" },
    { input: "/path/to/", expected: undefined },
    { input: "", expected: undefined },
  ];

  for (const { input, expected } of cases) {
    it(`should extract filename for ${JSON.stringify(input)}`, () => {
      expect(filename(input)).toBe(expected);
    });
  }
});
