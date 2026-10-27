import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export function testCommand(project, scope) {
  const commands = {
    unit: ["exec", "vitest", "run", "--project", "unit"],
    integration: ["exec", "vitest", "run", "--project", "integration"],
    storybook: ["exec", "vitest", "run", "--project", "storybook", "--bail=1"],
    e2e: ["exec", "playwright", "test", "--project", "chromium"],
  }
  const patterns = {
    unit: /^tests\/unit\/.+\.test\.tsx?$/,
    integration: /^tests\/integration\/.+\.test\.tsx?$/,
    storybook: /^src\/.+\.stories\.tsx?$/,
    e2e: /^tests\/e2e\/(?!.*-cross-app\.spec\.).+\.spec\.tsx?$/,
  }
  if (!commands[project] || scope[project] !== true || !Array.isArray(scope.tests?.[project])) {
    throw new Error("Invalid selected test project.")
  }
  const files = scope.full ? [] : scope.tests[project]
  if (!scope.full && files.length === 0) throw new Error("Selected test list is empty.")
  if (
    files.some(
      (file) => typeof file !== "string" || !patterns[project].test(file) || file.split("/").includes(".."),
    )
  ) {
    throw new Error("Selected test path is outside the requested project.")
  }
  const filters =
    project === "e2e" ? files.map((file) => `${file.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`) : files
  return [...commands[project], ...filters]
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const scope = JSON.parse(readFileSync(process.argv[3], "utf8"))
  execFileSync("pnpm", testCommand(process.argv[2], scope), { stdio: "inherit" })
}
