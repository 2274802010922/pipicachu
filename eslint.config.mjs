import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";
export default defineConfig([
  ...nextVitals,
  ...nextTypescript,
  globalIgnores([
    ".next/**",
    ".next-preview/**",
    ".next-before-escrow/**",
    "target/**",
    "work/**",
    "playwright-report/**",
    "test-results/**",
    "next-env.d.ts",
  ]),
]);
