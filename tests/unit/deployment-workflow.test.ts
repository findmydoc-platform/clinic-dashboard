import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { spawnSync } from "node:child_process"
import path from "node:path"
import os from "node:os"
import { afterEach, describe, expect, it } from "vitest"
import { parse } from "yaml"

type WorkflowStep = {
  readonly env?: Record<string, string>
  readonly id?: string
  readonly name?: string
  readonly run?: string
}

type WorkflowJob = {
  readonly needs?: string | readonly string[]
  readonly steps?: readonly WorkflowStep[]
  readonly uses?: string
}

type Workflow = {
  readonly jobs: Record<string, WorkflowJob>
}

const repositoryRoot = path.resolve(import.meta.dirname, "../..")
const temporaryDirectories = new Set<string>()

const readWorkflow = (name: string): Workflow =>
  parse(readFileSync(path.join(repositoryRoot, ".github/workflows", name), "utf8")) as Workflow

const namedStep = (workflow: Workflow, jobName: string, stepName: string): WorkflowStep => {
  const step = workflow.jobs[jobName]?.steps?.find((candidate) => candidate.name === stepName)
  expect(step, `Expected ${jobName} to contain the ${stepName} step.`).toBeDefined()
  return step as WorkflowStep
}

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
  it.each([
    [
      "deploy-preview.yml",
      "deploy-preview",
      "Resolve preview deployment metadata",
      "Build Vercel preview",
      "Deploy Vercel preview",
    ],
    [
      "deploy-main-preview.yml",
      "deploy-main-preview",
      "Resolve main preview deployment metadata",
      "Build Vercel main preview",
      "Deploy verified main preview",
    ],
  ])(
    "derives Preview metadata and invokes the Preview boundaries in %s",
    (name, jobName, metadataStepName, buildStepName, deployStepName) => {
      const workflow = readWorkflow(name)
      const metadataStep = namedStep(workflow, jobName, metadataStepName)
      const validationStep = namedStep(workflow, jobName, "Validate pulled Preview deployment metadata")
      const buildStep = namedStep(workflow, jobName, buildStepName)
      const deployStep = namedStep(workflow, jobName, deployStepName)

      expect(metadataStep.run).toContain("git rev-parse HEAD")
      expect(validationStep.env).toEqual({
        DEPLOYMENT_COMMIT_SHA: "${{ steps.deployment_metadata.outputs.commit_sha }}",
        DEPLOYMENT_ENVIRONMENT: "preview",
      })
      expect(validationStep.run).toBe("bash ./.github/scripts/validate-preview-deployment-metadata.sh")
      expect(buildStep.env).toEqual({
        DEPLOYMENT_COMMIT_SHA: "${{ steps.deployment_metadata.outputs.commit_sha }}",
        DEPLOYMENT_ENVIRONMENT: "preview",
      })
      expect(buildStep.run).toBe("bash ./.github/scripts/deploy/vercel-build.sh preview")
      expect(deployStep.env).toMatchObject({
        DEPLOYMENT_COMMIT_SHA: "${{ steps.deployment_metadata.outputs.commit_sha }}",
        DEPLOYMENT_ENVIRONMENT: "preview",
      })
      expect(deployStep.run).toContain(
        'deployment_url="$(bash ./.github/scripts/deploy/vercel-deploy.sh preview)"',
      )
    },
  )

  it("requires the central platform release dispatcher and has no direct production workflow", () => {
    const workflow = readWorkflow("platform-release-deploy.yml")
    const guardStep = namedStep(workflow, "verify-dispatcher", "Verify dispatch identity")

    expect(guardStep.env).toEqual({
      GITHUB_ACTOR: "${{ github.actor }}",
      GITHUB_TRIGGERING_ACTOR: "${{ github.triggering_actor }}",
    })
    expect(guardStep.run).toBe("bash ./.github/scripts/deploy/require-platform-release-dispatcher.sh")
    expect(workflow.jobs.deploy?.needs).toBe("verify-dispatcher")
    expect(workflow.jobs.deploy?.uses).toBe(
      "findmydoc-platform/platform-release/.github/workflows/reusable-deploy-dashboard.yml@fde486496d8bde13a3c8cad9d23a1cbbe075507d",
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
