import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  // UI copy uses plain apostrophes and quotes on purpose.
  { rules: { "react/no-unescaped-entities": "off" } },
  { ignores: [".next/**", ".next-cloud/**", "node_modules/**", "public/sw.js", "playwright-report/**", "test-results/**", "next-env.d.ts"] },
];

export default config;
