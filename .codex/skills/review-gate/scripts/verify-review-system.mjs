#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath } from "node:url"

const scriptDirectory = dirname(fileURLToPath(import.meta.url))
const repositoryRoot = resolve(scriptDirectory, "../../../..")
const failures = []

function read(relativePath) {
  const absolutePath = resolve(repositoryRoot, relativePath)
  if (!existsSync(absolutePath)) {
    failures.push(`Missing ${relativePath}`)
    return ""
  }
  return readFileSync(absolutePath, "utf8")
}

function expect(condition, message) {
  if (!condition) {
    failures.push(message)
  }
}

function expectPattern(content, pattern, message) {
  expect(pattern.test(content), message)
}

const config = read(".codex/config.toml")
expectPattern(
  config,
  /^max_concurrent_threads_per_session = 4$/m,
  "Project config must set max_concurrent_threads_per_session = 4",
)
expect(!/\bmax_threads\b/.test(config), "Project config must not use max_threads")
expect(!/\bmax_depth\b/.test(config), "Project config must not use max_depth")

const agents = [
  ["planning-reviewer.toml", "planning_reviewer", "medium"],
  ["logic-reviewer.toml", "logic_reviewer", "high"],
  ["security-reviewer.toml", "security_reviewer", "high"],
  ["test-reviewer.toml", "test_reviewer", "high"],
  ["ui-reviewer.toml", "ui_reviewer", "high"],
]

for (const [fileName, name, effort] of agents) {
  const content = read(`.codex/agents/${fileName}`)
  expectPattern(content, new RegExp(`^name = "${name}"$`, "m"), `${name} must keep its contract name`)
  expectPattern(
    content,
    new RegExp(`^model_reasoning_effort = "${effort}"$`, "m"),
    `${name} must use ${effort} reasoning`,
  )
  expectPattern(content, /^sandbox_mode = "read-only"$/m, `${name} must use read-only sandbox mode`)

  for (const requiredTerm of [
    "severity 1-10",
    "confidence",
    "evidence",
    "impact",
    "reproduction or logical proof",
    "minimal recommendation",
    "style-only",
    "metric-only",
  ]) {
    expect(
      content.includes(requiredTerm),
      `${name} instructions must include the ${requiredTerm} output rule`,
    )
  }
}

const securityReviewer = read(".codex/agents/security-reviewer.toml")
for (const requiredTerm of [
  "conventional SaaS clinic dashboard",
  "realistic attacker or failure source",
  "repository checkout",
  "Do not require cryptographic attestation",
]) {
  expect(
    securityReviewer.includes(requiredTerm),
    `security_reviewer must retain its product-calibrated threat model: ${requiredTerm}`,
  )
}

const packageJson = JSON.parse(read("package.json") || "{}")
expect(
  packageJson.scripts?.["review:route"] ===
    "node .codex/skills/review-gate/scripts/collect-review-context.mjs",
  "package.json must expose review:route",
)
expect(
  packageJson.scripts?.["review:verify"] ===
    "node .codex/skills/review-gate/scripts/verify-review-system.mjs",
  "package.json must expose review:verify",
)
expect(
  packageJson.scripts?.check?.includes("pnpm review:verify"),
  "pnpm check must include pnpm review:verify",
)

const skill = read(".codex/skills/review-gate/SKILL.md")
expectPattern(skill, /^name: review-gate$/m, "Review Gate skill metadata must declare its name")
expect(!skill.includes("TODO"), "Review Gate skill must not contain initializer placeholders")
const rootInstructions = read("AGENTS.md")
const reviewerPlan = read("docs/plans/clinic-dashboard-reviewer-system.md")
for (const [name, content] of [
  ["Review Gate skill", skill],
  ["Reviewer system plan", reviewerPlan],
]) {
  expect(content.includes("parent task"), `${name} must define the parent task permission contract`)
  expect(
    !content.includes("switch the task checkpoint to read-only"),
    `${name} must not require changing the parent task permission`,
  )
  expect(
    !content.includes("read-only parent task checkpoint"),
    `${name} must not require a read-only parent task checkpoint`,
  )
}
expect(
  rootInstructions.includes("$review-gate") && rootInstructions.includes("authoritative source"),
  "AGENTS.md must delegate reviewer workflow details to the Review Gate skill",
)
expect(
  rootInstructions.includes("explicit user approval"),
  "AGENTS.md must retain the user-approval boundary for AI reviewers",
)
expect(
  !rootInstructions.includes('sandbox_mode = "read-only"') &&
    !rootInstructions.includes("Severity 7-10") &&
    !rootInstructions.includes("planning_reviewer"),
  "AGENTS.md must not duplicate Review Gate execution details",
)
expect(
  skill.includes('sandbox_mode = "read-only"'),
  "Review Gate skill must use reviewer sandbox_mode as the write boundary",
)
expect(
  reviewerPlan.includes("parent task permission does not need to change"),
  "Reviewer system plan must state that the parent task permission does not need to change",
)
const openAiYaml = read(".codex/skills/review-gate/agents/openai.yaml")
expect(openAiYaml.includes("$review-gate"), "Review Gate default prompt must mention $review-gate")
read(".codex/skills/review-gate/references/routing.md")

const safetyRules = read(".codex/rules/safety.rules")
for (const destructivePrefix of [
  '["rtk", "git", "reset", "--hard"]',
  '["rtk", "proxy", "git", "reset", "--hard"]',
  '["rtk", "git", "clean", ["-f", "-fd", "-df", "-fx", "-xf", "-fdx", "-dfx"]]',
  '["rtk", "proxy", "git", "clean", ["-f", "-fd", "-df", "-fx", "-xf", "-fdx", "-dfx"]]',
]) {
  expect(
    safetyRules.includes(destructivePrefix),
    `Safety rules must retain the destructive command prefix: ${destructivePrefix}`,
  )
}

const workflowRules = read(".codex/rules/workflow.rules")
for (const externalWritePrefix of [
  '["rtk", "git", "push"]',
  '["rtk", "proxy", "git", "push"]',
  'pattern = github_prefix + ["pr", github_pull_request_write_actions]',
  'pattern = github_prefix + ["issue", github_issue_write_actions]',
]) {
  expect(
    workflowRules.includes(externalWritePrefix),
    `Workflow rules must retain the external write prefix: ${externalWritePrefix}`,
  )
}

if (failures.length > 0) {
  process.stderr.write(`Review system verification failed:\n- ${failures.join("\n- ")}\n`)
  process.exitCode = 1
} else {
  process.stdout.write("Review system contracts verified.\n")
}
