import path from "node:path"
import { fileURLToPath } from "node:url"
import { defineConfig } from "vitest/config"

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
      "server-only": path.resolve(dirname, "tests/setup/server-only.ts"),
    },
  },
  test: {
    environment: "node",
    globals: true,
    include: [
      "tests/unit/**/*.test.ts",
      "tests/unit/**/*.test.tsx",
      "tests/integration/**/*.test.ts",
      "tests/integration/**/*.test.tsx",
    ],
    exclude: ["node_modules", ".next", ".stryker-tmp"],
    setupFiles: ["tests/setup/vitest.ts"],
  },
})
