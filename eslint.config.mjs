import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    ".open-next/**",
    ".wrangler/**",
    ".opencode/**",
    "src/generated/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  {
    rules: {
      "no-unused-vars": "warn",
      "no-console": "off",
    },
  },
]);

export default eslintConfig;