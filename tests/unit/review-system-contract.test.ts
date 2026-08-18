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
    ["planning-reviewer.toml", "planning_reviewer", "gpt-5.6-terra", "medium"],
    ["logic-reviewer.toml", "logic_reviewer", "gpt-5.6-sol", "high"],
    ["security-reviewer.toml", "security_reviewer", "gpt-5.6-sol", "high"],
    ["test-reviewer.toml", "test_reviewer", "gpt-5.6-terra", "high"],
    ["ui-reviewer.toml", "ui_reviewer", "gpt-5.6-terra", "high"],
  ])("pins %s ownership and execution settings", (fileName, name, model, effort) => {
    const agent = read(`.codex/agents/${fileName}`)

    expect(agent).toContain(`name = "${name}"`)
    expect(agent).toContain(`model = "${model}"`)
    expect(agent).toContain(`model_reasoning_effort = "${effort}"`)
    expect(agent).toContain('sandbox_mode = "read-only"')
    expect(agent).toContain("severity 1-10")
    expect(agent).toContain("reproduction or logical proof")
    expect(agent).toContain("minimal recommendation")
    expect(agent).toContain("style-only")
    expect(agent).toContain("metric-only")
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

  it("keeps command-policy bypass regressions covered", () => {
    const safetyRules = read(".codex/rules/safety.rules")
    const workflowRules = read(".codex/rules/workflow.rules")

    for (const protectedRuleSource of [
      'pattern = ["git"]',
      'pattern = ["gh"]',
      'pattern = ["rtk", rtk_global_options]',
      'pattern = ["rtk", "proxy", rtk_proxy_modifiers]',
      '["rtk", "git"]',
      '["rtk", "proxy", "git"]',
      "pattern = git_prefix + [git_global_options]",
      'git_prefix + ["-C", ".", "reset", "--hard"]',
      '["rtk", "gh"]',
      '["rtk", "proxy", "gh"]',
      "pattern = github_prefix + [github_global_options]",
      'github_prefix + ["-R", "findmydoc-platform/clinic-dashboard", "pr", "create"]',
    ]) {
      expect(safetyRules).toContain(protectedRuleSource)
    }

    for (const approvalCommand of ["merge", "rebase", "revert", "cherry-pick", "am", "pull"]) {
      expect(workflowRules).toContain(`"${approvalCommand}"`)
    }
    expect(workflowRules).toContain("pattern = git_prefix")
    expect(workflowRules).toContain("pattern = github_prefix")
    expect(workflowRules).toContain('["create", "new"]')
  })
})
