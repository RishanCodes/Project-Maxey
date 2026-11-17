import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/unit/stubs/server-only.ts") } },
  test: { include: ["tests/unit/**/*.test.ts"], environment: "node", setupFiles: ["tests/unit/setup.ts"] },
});
