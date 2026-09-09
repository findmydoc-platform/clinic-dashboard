import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const temporaryDirectories = new Set<string>()

const runPreviewMetadataValidation = (
  pulledEnvironment: string,
  environmentOverrides: Record<string, string | undefined> = {},
) => {
  const temporaryDirectory = mkdtempSync(path.join(os.tmpdir(), "dashboard-preview-metadata-"))
  temporaryDirectories.add(temporaryDirectory)
  const vercelDirectory = path.join(temporaryDirectory, ".vercel")
  mkdirSync(vercelDirectory)
  writeFileSync(path.join(vercelDirectory, ".env.preview.local"), pulledEnvironment)

  const { RELEASE_VERSION: _releaseVersion, ...environmentWithoutReleaseVersion } = process.env
  return spawnSync(
    "bash",
    [path.join(repositoryRoot, ".github/scripts/validate-preview-deployment-metadata.sh")],
    {
      cwd: temporaryDirectory,
      encoding: "utf8",
      env: {
        ...environmentWithoutReleaseVersion,
        DEPLOYMENT_COMMIT_SHA: "a".repeat(40),
        DEPLOYMENT_ENVIRONMENT: "preview",
        ...environmentOverrides,
      },
    },
  )
}

afterEach(() => {
  for (const directory of temporaryDirectories) {
    rmSync(directory, { force: true, recursive: true })
  }
  temporaryDirectories.clear()
})

describe("deployment workflow contract", () => {
  it("derives Preview metadata from the checked out commit and has no direct production workflow", () => {
    const previewWorkflow = readFileSync(
      path.join(repositoryRoot, ".github/workflows/deploy-preview.yml"),
      "utf8",
    )
    const mainPreviewWorkflow = readFileSync(
      path.join(repositoryRoot, ".github/workflows/deploy-main-preview.yml"),
      "utf8",
    )
    const platformReleaseWorkflow = readFileSync(
      path.join(repositoryRoot, ".github/workflows/platform-release-deploy.yml"),
      "utf8",
    )

    for (const workflow of [previewWorkflow, mainPreviewWorkflow]) {
      expect(workflow).toContain('deployment_commit_sha="$(git rev-parse HEAD)"')
      expect(workflow).toContain("DEPLOYMENT_ENVIRONMENT: preview")
      expect(workflow).toContain('--env "DEPLOYMENT_ENVIRONMENT=$DEPLOYMENT_ENVIRONMENT"')
      expect(workflow).toContain('--env "DEPLOYMENT_COMMIT_SHA=$DEPLOYMENT_COMMIT_SHA"')
      expect(workflow).toContain("Validate pulled Preview deployment metadata")
      expect(workflow).toContain("bash ./.github/scripts/validate-preview-deployment-metadata.sh")

      const pullIndex = workflow.indexOf("Pull Vercel preview settings")
      const validationIndex = workflow.indexOf("Validate pulled Preview deployment metadata")
      const buildIndex = workflow.indexOf("Build Vercel")
      expect(pullIndex).toBeGreaterThan(-1)
      expect(validationIndex).toBeGreaterThan(pullIndex)
      expect(buildIndex).toBeGreaterThan(validationIndex)
    }

    expect(previewWorkflow).toContain("Resolve preview deployment metadata")
    expect(mainPreviewWorkflow).toContain("Resolve main preview deployment metadata")
    expect(platformReleaseWorkflow).toContain(
      "reusable-deploy-dashboard.yml@e63054077390413aef41b4b2d39a6f4458ceedc8",
    )
    expect(existsSync(path.join(repositoryRoot, ".github/workflows/deploy-production.yml"))).toBe(false)
  })

  it("accepts a clean pulled Preview environment", () => {
    const result = runPreviewMetadataValidation("POSTHOG_HOST=https://posthog.invalid\n")

    expect(result.status).toBe(0)
  })

  it("rejects a durable release version pulled from Vercel without printing its value", () => {
    const result = runPreviewMetadataValidation('RELEASE_VERSION="v9.9.9"\n')

    expect(result.status).toBe(1)
    expect(result.stderr).toContain("Pulled Preview environment must not define RELEASE_VERSION.")
    expect(result.stderr).not.toContain("v9.9.9")
  })

  it.each([
    { name: "a runner release version", overrides: { RELEASE_VERSION: "v1.2.3" } },
    { name: "a non-Preview environment", overrides: { DEPLOYMENT_ENVIRONMENT: "production" } },
    { name: "an invalid commit SHA", overrides: { DEPLOYMENT_COMMIT_SHA: "short-sha" } },
  ])("rejects $name", ({ overrides }) => {
    expect(runPreviewMetadataValidation("", overrides).status).toBe(1)
  })
})
