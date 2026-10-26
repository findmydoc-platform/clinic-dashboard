import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

const {
  verifyReviewSystem,
  // @ts-expect-error The verifier is an executable JavaScript project tool without a public type package.
} = await import("../../.codex/skills/review-gate/scripts/verify-review-system.mjs")

let fixtureRoot: string

function write(relativePath: string, content: string) {
  writeFileSync(path.join(fixtureRoot, relativePath), content)
}

beforeEach(() => {
  fixtureRoot = mkdtempSync(path.join(tmpdir(), "review-system-"))
  cpSync(path.join(process.cwd(), ".codex"), path.join(fixtureRoot, ".codex"), { recursive: true })
  cpSync(path.join(process.cwd(), "package.json"), path.join(fixtureRoot, "package.json"))
})

afterEach(() => {
  rmSync(fixtureRoot, { recursive: true, force: true })
})

describe("review system verification", () => {
  it("accepts the configured reviewer system", () => {
    expect(verifyReviewSystem(fixtureRoot)).toEqual([])
  })

  it.each([
    ".codex/agents/security-reviewer.toml",
    ".codex/skills/review-gate/scripts/collect-review-context.mjs",
  ])("rejects a missing required file: %s", (relativePath) => {
    rmSync(path.join(fixtureRoot, relativePath))

    expect(verifyReviewSystem(fixtureRoot)).toContain(`Missing ${relativePath}`)
  })

  it("rejects a missing package entrypoint", () => {
    const packageJson = JSON.parse(readFileSync(path.join(fixtureRoot, "package.json"), "utf8"))
    delete packageJson.scripts["review:route"]
    write("package.json", JSON.stringify(packageJson))

    expect(verifyReviewSystem(fixtureRoot)).toContain("package.json must expose review:route")
  })

  it.each([
    ["another_role", "read-only"],
    ["logic_reviewer", "workspace-write"],
  ])("rejects incompatible reviewer settings: %s / %s", (name, sandboxMode) => {
    write(".codex/agents/logic-reviewer.toml", `name = "${name}"\nsandbox_mode = "${sandboxMode}"\n`)

    expect(verifyReviewSystem(fixtureRoot)).not.toEqual([])
  })
})
