import path from "node:path"
import { fileURLToPath } from "node:url"
import { storybookTest } from "@storybook/addon-vitest/vitest-plugin"
import { playwright } from "@vitest/browser-playwright"
import { defineConfig, defineProject } from "vitest/config"

const dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  optimizeDeps: {
    include: ["next/link"],
  },
  resolve: {
    alias: {
      "@": path.resolve(dirname, "src"),
    },
  },
  test: {
    projects: [
      defineProject({
        resolve: {
          alias: {
            "@": path.resolve(dirname, "src"),
            "server-only": path.resolve(dirname, "tests/setup/server-only.ts"),
          },
        },
        test: {
          environment: "node",
          exclude: ["node_modules", ".next"],
          globals: true,
          include: ["tests/unit/**/*.test.ts", "tests/unit/**/*.test.tsx"],
          name: "unit",
          setupFiles: ["tests/setup/vitest.ts"],
        },
      }),
      {
        extends: true,
        plugins: [
          storybookTest({
            configDir: path.join(dirname, ".storybook"),
          }),
        ],
        test: {
          browser: {
            enabled: true,
            headless: true,
            instances: [{ browser: "chromium" }],
            provider: playwright({}),
          },
          name: "storybook",
          setupFiles: [".storybook/vitest.setup.ts"],
        },
      },
    ],
  },
})
