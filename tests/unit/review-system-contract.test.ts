import { readFileSync } from "node:fs"
import path from "node:path"
import { describe, expect, it } from "vitest"

const repositoryRoot = process.cwd()

function read(relativePath: string) {
  return readFileSync(path.join(repositoryRoot, relativePath), "utf8")
}

describe("review system contracts", () => {
  it("uses the current project concurrency key only", () => {
    const config = read(".codex/config.toml")

    expect(config).toContain("max_concurrent_threads_per_session = 4")
    expect(config).not.toMatch(/\bmax_threads\b/)
    expect(config).not.toMatch(/\bmax_depth\b/)
  })

  it.each([
    ["planning-reviewer.toml", "planning_reviewer", "medium"],
    ["logic-reviewer.toml", "logic_reviewer", "high"],
    ["architecture-reviewer.toml", "architecture_reviewer", "high"],
    ["security-reviewer.toml", "security_reviewer", "high"],
    ["test-reviewer.toml", "test_reviewer", "high"],
    ["ui-reviewer.toml", "ui_reviewer", "high"],
  ])("keeps %s ownership and execution settings", (fileName, name, effort) => {
    const agent = read(`.codex/agents/${fileName}`)

    expect(agent).toContain(`name = "${name}"`)
    expect(agent).toContain(`model_reasoning_effort = "${effort}"`)
    expect(agent).toContain('sandbox_mode = "read-only"')
    expect(agent).toContain("severity 1-10")
    expect(agent).toContain("reproduction or logical proof")
    expect(agent).toContain("minimal recommendation")
    expect(agent).toContain("style-only")
    expect(agent).toContain("metric-only")
  })

  it.each([
    ["test-reviewer.toml", "Freeman and Pryce's outside-in TDD", "Kent Beck's Test Desiderata"],
    [
      "architecture-reviewer.toml",
      "Parnas's information-hiding criterion",
      "Robert C. Martin's Dependency Rule",
    ],
    ["ui-reviewer.toml", "Luke Wroblewski's Mobile First", "Ethan Marcotte's Responsive Web Design"],
  ])("keeps the method anchors and audit mode in %s", (fileName, firstAnchor, secondAnchor) => {
    const agent = read(`.codex/agents/${fileName}`)

    expect(agent).toContain(firstAnchor)
    expect(agent).toContain(secondAnchor)
    expect(agent).toContain("Repository audit")
  })

  it("keeps the skill metadata", () => {
    const skill = read(".codex/skills/review-gate/SKILL.md")
    const openAiYaml = read(".codex/skills/review-gate/agents/openai.yaml")

    expect(skill).toMatch(/^name: review-gate$/m)
    expect(skill).not.toContain("TODO")
    expect(openAiYaml).toContain("$review-gate")
  })

  it("keeps reviewer execution details in the Review Gate skill", () => {
    const rootInstructions = read("AGENTS.md")
    const skill = read(".codex/skills/review-gate/SKILL.md")
    const plan = read("docs/plans/clinic-dashboard-reviewer-system.md")

    for (const content of [skill, plan]) {
      expect(content).toContain("parent task")
      expect(content).not.toContain("switch the task checkpoint to read-only")
      expect(content).not.toContain("read-only parent task checkpoint")
    }

    expect(rootInstructions).toContain("$review-gate")
    expect(rootInstructions).toContain("authoritative source")
    expect(rootInstructions).toContain("explicit user approval")
    expect(rootInstructions).not.toContain('sandbox_mode = "read-only"')
    expect(rootInstructions).not.toContain("Severity 7-10")
    expect(rootInstructions).not.toContain("planning_reviewer")
    expect(skill).toContain('sandbox_mode = "read-only"')
    expect(plan).toContain("parent task permission does not need to change")
  })

  it("exposes routing and verification through package scripts and check", () => {
    const packageJson = JSON.parse(read("package.json"))

    expect(packageJson.scripts["review:route"]).toBe(
      "node .codex/skills/review-gate/scripts/collect-review-context.mjs",
    )
    expect(packageJson.scripts["review:verify"]).toBe(
      "node .codex/skills/review-gate/scripts/verify-review-system.mjs",
    )
    expect(packageJson.scripts.check).toContain("pnpm review:verify")
  })

  it("keeps the focused destructive and external-write command policy", () => {
    const safetyRules = read(".codex/rules/safety.rules")
    const workflowRules = read(".codex/rules/workflow.rules")

    for (const destructivePrefix of [
      '["rtk", "git", "reset", "--hard"]',
      '["rtk", "proxy", "git", "reset", "--hard"]',
      '["rtk", "git", "clean", ["-f", "-fd", "-df", "-fx", "-xf", "-fdx", "-dfx"]]',
      '["rtk", "proxy", "git", "clean", ["-f", "-fd", "-df", "-fx", "-xf", "-fdx", "-dfx"]]',
    ]) {
      expect(safetyRules).toContain(destructivePrefix)
    }

    for (const externalWritePrefix of [
      '["rtk", "git", "push"]',
      '["rtk", "proxy", "git", "push"]',
      'pattern = github_prefix + ["pr", github_pull_request_write_actions]',
      'pattern = github_prefix + ["issue", github_issue_write_actions]',
    ]) {
      expect(workflowRules).toContain(externalWritePrefix)
    }
  })
})
