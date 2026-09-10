import { afterEach, describe, expect, it } from "vitest"
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { spawnSync } from "node:child_process"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const temporaryDirectories = new Set<string>()

const expectArgument = (argumentsPassedToVercel: readonly string[], flag: string, value: string) => {
  expect(
    argumentsPassedToVercel.some(
      (argument, index) => argument === flag && argumentsPassedToVercel[index + 1] === value,
    ),
  ).toBe(true)
}

const runCommand = (scriptName: string, target: "preview" | "production") => {
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "dashboard-vercel-command-"))
  temporaryDirectories.add(temporaryDirectory)
  const binaryDirectory = path.join(temporaryDirectory, "bin")
  const commandLog = path.join(temporaryDirectory, "vercel-commands.log")
  const fakePnpm = path.join(binaryDirectory, "pnpm")
  mkdirSync(binaryDirectory)

  writeFileSync(
    fakePnpm,
    `#!/usr/bin/env bash
set -euo pipefail
{
  printf 'DEPLOYMENT_ENVIRONMENT=%s\\n' "$DEPLOYMENT_ENVIRONMENT"
  printf 'DEPLOYMENT_COMMIT_SHA=%s\\n' "$DEPLOYMENT_COMMIT_SHA"
  printf 'RELEASE_VERSION=%s\\n' "\${RELEASE_VERSION-<unset>}"
  printf '%s\\n' "$@"
  printf '%s\\n' '--'
} >> "$VERCEL_STUB_LOG"
if [[ " $* " == *" deploy "* ]]; then
  printf '%s\\n' 'https://dashboard-stub.vercel.app'
fi
`,
  )
  chmodSync(fakePnpm, 0o755)

  const environment = {
    ...process.env,
    DEPLOYMENT_COMMIT_SHA: "a".repeat(40),
    DEPLOYMENT_ENVIRONMENT: target,
    PATH: `${binaryDirectory}:${process.env.PATH}`,
    VERCEL_CLI_VERSION: "56.0.0",
    VERCEL_STUB_LOG: commandLog,
    VERCEL_TOKEN: "test-token", // pragma: allowlist secret
    ...(target === "production" ? { RELEASE_VERSION: "v1.2.3" } : {}),
  }
  delete environment.RELEASE_VERSION
  if (target === "production") environment.RELEASE_VERSION = "v1.2.3"

  const result = spawnSync(
    "bash",
    [path.join(repositoryRoot, ".github/scripts/deploy", scriptName), target],
    { cwd: temporaryDirectory, encoding: "utf8", env: environment },
  )

  return { commandLog, result }
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { force: true, recursive: true })
  }
  temporaryDirectories.clear()
})

describe("dashboard Vercel deployment contract", () => {
  it("passes Preview deployment metadata into the Vercel build process", () => {
    const { commandLog, result } = runCommand("vercel-build.sh", "preview")

    expect(result.status).toBe(0)
    const captured = readFileSync(commandLog, "utf8")
    expect(captured).toContain("DEPLOYMENT_ENVIRONMENT=preview")
    expect(captured).toContain(`DEPLOYMENT_COMMIT_SHA=${"a".repeat(40)}`)
    expect(captured).toContain("RELEASE_VERSION=<unset>")
    expect(captured).toContain("build")
  })

  it("passes production deployment metadata into Vercel runtime configuration", () => {
    const { commandLog, result } = runCommand("vercel-deploy.sh", "production")

    expect(result.status).toBe(0)
    const argumentsPassedToVercel =
      readFileSync(commandLog, "utf8").trim().split("\n--\n")[0]?.split("\n") ?? []
    expectArgument(argumentsPassedToVercel, "--env", "DEPLOYMENT_ENVIRONMENT=production")
    expectArgument(argumentsPassedToVercel, "--env", `DEPLOYMENT_COMMIT_SHA=${"a".repeat(40)}`)
    expectArgument(argumentsPassedToVercel, "--env", "RELEASE_VERSION=v1.2.3")
  })
})
