// Lint do arcabouço (agent/). Regras: typescript-eslint em modo type-checked + limites de complexidade.
// Uso: npm run lint   (relatório: QUALITY_REPORT.md)
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules/**", "subjects/**", "runs/**", "paper/**", "analysis/**", "agent/assets/**", "coverage/**", ".stryker-tmp/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  {
    files: ["agent/**/*.ts"],
    languageOptions: { parserOptions: { project: ["./tsconfig.json"], tsconfigRootDir: import.meta.dirname } },
    rules: {
      complexity: ["warn", 10],
      "max-lines-per-function": ["warn", { max: 60, skipBlankLines: true, skipComments: true }],
      "max-depth": ["warn", 4],
      "max-params": ["warn", 5],
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-explicit-any": "warn",
      eqeqeq: "error",
    },
  },
);
