import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"
import { parse } from "yaml"

type Step = {
  name?: string
  id?: string
  if?: string
  uses?: string
  run?: string
  with?: Record<string, unknown>
}
type Job = { name?: string; if?: string; needs?: string; steps?: Step[] }
type Workflow = {
  on: Record<string, { paths?: string[]; "paths-ignore"?: string[] }>
  jobs: Record<string, Job>
}
const root = path.resolve(import.meta.dirname, "../..")
const workflow = (file: string): Workflow =>
  parse(readFileSync(path.join(root, ".github/workflows", file), "utf8"))

describe("CI routing workflow contracts", () => {
  it.each([
    ["ci.yml", "quality", "Quality"],
    ["dependency-review.yml", "dependency-review", "Dependency Review"],
    ["workflow-security.yml", "workflow-security", "Workflow Security"],
    ["deploy-preview.yml", "deploy-preview", "Vercel Preview"],
    ["pr-gates.yml", "semantic-title", "Semantic PR title"],
    ["pr-gates.yml", "linked-issue", "Linked issue"],
  ])("preserves required check %s / %s", (file, job, name) => {
    const config = workflow(file)
    expect(config.jobs[job].name).toBe(name)
    expect(config.on.pull_request.paths).toBeUndefined()
    expect(config.on.pull_request["paths-ignore"]).toBeUndefined()
  })

  it("classifies before package installation and gates each expensive Quality step", () => {
    const steps = workflow("ci.yml").jobs.quality.steps ?? []
    const scopeIndex = steps.findIndex((step) => step.id === "scope")
    const installIndex = steps.findIndex((step) => step.name === "Install dependencies")
    expect(scopeIndex).toBeGreaterThan(-1)
    expect(scopeIndex).toBeLessThan(installIndex)
    for (const [name, output] of [
      ["Install dependencies", "check"],
      ["Format", "check"],
      ["Static checks, AI drift, and dead code", "check"],
      ["Unit tests", "unit"],
      ["Integration tests", "integration"],
      ["Storybook browser tests", "storybook"],
      ["Storybook build", "storybook_build"],
      ["Application build", "build"],
      ["End-to-end smoke test", "e2e"],
    ]) {
      expect(steps.find((step) => step.name === name)?.if).toBe(`steps.scope.outputs.${output} != 'false'`)
    }
    expect(steps.find((step) => step.name === "Documentation")?.run).toBe(
      'node scripts/ci/docs-check.mjs "$SCOPE_MANIFEST"',
    )
    expect(steps.find((step) => step.name === "Install Chromium")?.if).toContain("steps.scope.outputs.e2e")
  })

  it("runs dependency review when classification fails", () => {
    const steps = workflow("dependency-review.yml").jobs["dependency-review"].steps ?? []
    const review = steps.find((step) => step.uses?.startsWith("actions/dependency-review-action@"))
    expect(review?.if).toContain("steps.scope.outcome != 'success'")
    expect(review?.if).toContain("steps.scope.outputs.dependency != 'false'")
  })

  it.each(["deploy-preview.yml", "deploy-main-preview.yml"])(
    "preserves conservative Preview fallback in %s",
    (file) => {
      const config = workflow(file)
      const job = config.jobs[file === "deploy-preview.yml" ? "deploy-preview" : "deploy-main-preview"]
      expect(job.needs).toBe("scope")
      expect(job.if).toContain("needs.scope.result != 'success'")
      expect(job.if).toContain("needs.scope.outputs.preview != 'false'")
      expect(job.if).toContain("!cancelled()")
      if (file === "deploy-preview.yml") {
        expect(job.if).toContain("github.event.pull_request.draft == false")
        expect(job.if).toContain("github.event.pull_request.head.repo.full_name == github.repository")
        expect(job.if).toContain("dependabot[bot]")
      } else {
        expect(job.if).toContain("github.ref == 'refs/heads/main'")
        expect(config.on).toHaveProperty("workflow_dispatch")
      }
    },
  )

  it("keeps changed-file secrets independent from workflow audits", () => {
    const steps = workflow("workflow-security.yml").jobs["workflow-security"].steps ?? []
    expect(steps.find((step) => step.name === "Workflow lint")?.if).toContain("workflow_security != 'false'")
    expect(steps.find((step) => step.name === "Workflow security audit")?.if).toContain(
      "workflow_security != 'false'",
    )
    expect(steps.find((step) => step.name === "Detect secrets in selected files")?.if).toBeUndefined()
    expect(workflow("workflow-security.yml").on.push.paths).toBeUndefined()
  })

  it("stages CodeQL activation and preserves both languages and scheduled scans", () => {
    const config = workflow("codeql.yml")
    expect(config.jobs.scope.if).toBe("vars.CODEQL_ADVANCED_ENABLED == 'true'")
    expect(config.on).toHaveProperty("schedule")
    expect(config.on).toHaveProperty("workflow_dispatch")
    for (const [job, language] of [
      ["javascript", "javascript-typescript"],
      ["actions", "actions"],
    ]) {
      expect(config.jobs[job].if).toContain("needs.scope.result != 'success'")
      expect(
        config.jobs[job].steps?.find((step) => step.uses?.startsWith("github/codeql-action/init@"))?.with
          ?.languages,
      ).toBe(language)
    }
  })
})
