import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
// The pinned engine matcher verifies the CLI's actual file selection semantics.
import { FileMatcher } from "../../node_modules/@stryker-mutator/core/dist/src/config/file-matcher.js"

const script = path.resolve(import.meta.dirname, "../../scripts/mutation-test.mjs")
const directories = new Set<string>()

const engine = `
export class Stryker {
  constructor(options) { this.options = options }
  async runMutationTest() {
    console.log(JSON.stringify(this.options))
    return [{ status: "Killed" }]
  }
}`
const hook = `
import { registerHooks } from "node:module"
registerHooks({
  resolve(specifier, context, nextResolve) {
    return specifier === "@stryker-mutator/core"
      ? { url: ${JSON.stringify(`data:text/javascript,${encodeURIComponent(engine)}`)}, shortCircuit: true }
      : nextResolve(specifier, context)
  }
})`

function runSelection(source: string, range = "") {
  const root = mkdtempSync(path.join(os.tmpdir(), "clinic-mutation-selection-"))
  directories.add(root)
  const test = "tests/unit/[clinicId].test.ts"
  for (const file of [source, test]) {
    const absolute = path.join(root, file)
    mkdirSync(path.dirname(absolute), { recursive: true })
    writeFileSync(absolute, "export function selected() {\n  return true\n}\n")
  }

  const result = spawnSync(
    process.execPath,
    [
      "--import",
      `data:text/javascript,${encodeURIComponent(hook)}`,
      script,
      "--mutate",
      `${source}${range}`,
      "--testFiles",
      test,
    ],
    { cwd: root, encoding: "utf8" },
  )
  expect(result.status, result.stderr).toBe(0)
  const options = JSON.parse(result.stdout) as { mutate: string[]; testFiles: string[] }
  return { options, root, source, test }
}

afterEach(() => {
  for (const root of directories) rmSync(root, { force: true, recursive: true })
  directories.clear()
})

describe("focused mutation command file selection", () => {
  it.each([
    "src/app/clinics/[clinicId]/route.ts",
    "src/app/(workspace)/clinics/[clinicId]/route.ts",
    "src/app/[[...slug]]/route.ts",
    "src/lib/security/public-routes.ts",
  ])("selects only the literal production file %s", (source) => {
    const { options, root } = runSelection(source)
    expect(options.mutate).toHaveLength(1)
    const matcher = new FileMatcher(path.join(root, options.mutate[0]!), false)
    expect(matcher.matches(path.join(root, source))).toBe(true)
    if (source.includes("[clinicId]")) {
      expect(matcher.matches(path.join(root, source.replace("[clinicId]", "c")))).toBe(false)
    }
  })

  it("preserves the line range when selecting a dynamic route", () => {
    const { options, root, source } = runSelection("src/app/clinics/[clinicId]/route.ts", ":1-3")
    const [pattern, range] = options.mutate[0]!.split(":")
    expect(range).toBe("1-3")
    expect(new FileMatcher(path.join(root, pattern!), false).matches(path.join(root, source))).toBe(true)
  })

  it("selects a literal test filename rather than a glob character class", () => {
    const { options, root, test } = runSelection("src/lib/security/public-routes.ts")
    expect(options.testFiles).toHaveLength(1)
    const matcher = new FileMatcher(path.join(root, options.testFiles[0]!), false)
    expect(matcher.matches(path.join(root, test))).toBe(true)
    expect(matcher.matches(path.join(root, "tests/unit/c.test.ts"))).toBe(false)
  })
})
