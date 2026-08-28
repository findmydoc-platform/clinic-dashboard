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
  ["architecture-reviewer.toml", "architecture_reviewer", "high"],
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

for (const [fileName, requiredTerms] of [
  ["test-reviewer.toml", ["Freeman and Pryce's Outside-In TDD", "Kent Beck's Test Desiderata"]],
  [
    "architecture-reviewer.toml",
    ["Parnas's Information-Hiding Criterion", "Robert C. Martin's Dependency Rule"],
  ],
  [
    "ui-reviewer.toml",
    [
      "Luke Wroblewski's Mobile First",
      "Ethan Marcotte's Responsive Web Design",
      "WCAG 2.2 AA",
      "WAI-ARIA Modal Dialog Pattern",
    ],
  ],
]) {
  const content = read(`.codex/agents/${fileName}`)
  for (const requiredTerm of requiredTerms) {
    expect(content.includes(requiredTerm), `${fileName} must retain the method anchor: ${requiredTerm}`)
  }
  expect(content.includes("Repository audit"), `${fileName} must retain its explicit repository-audit mode`)
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
const sourceInstructions = read("src/AGENTS.md")
const featureInstructions = read("src/features/AGENTS.md")
const semanticAnchorsRule =
  "- Semantic Anchors: Use [https://llm-coding.github.io/Semantic-Anchors/llms.txt](https://llm-coding.github.io/Semantic-Anchors/llms.txt) to identify established methods; name them without redefining them locally."
const rootAnchors = [
  "- Use Freeman and Pryce's Outside-In TDD.",
  "- Use Kent Beck's Test Desiderata.",
  "- Use Parnas's Information-Hiding Criterion.",
  "- Use Robert C. Martin's Dependency Rule.",
  "- Use Luke Wroblewski's Mobile First.",
  "- Use Ethan Marcotte's Responsive Web Design.",
  "- Use WCAG 2.2 AA.",
  "- Use the WAI-ARIA Modal Dialog Pattern.",
]

expect(
  rootInstructions.includes(semanticAnchorsRule),
  "AGENTS.md must retain the exact Semantic Anchors catalog rule",
)
for (const anchor of rootAnchors) {
  expect(rootInstructions.includes(anchor), `AGENTS.md must retain the root method anchor: ${anchor}`)
  expect(
    rootInstructions.indexOf(semanticAnchorsRule) < rootInstructions.indexOf(anchor),
    `AGENTS.md must place the Semantic Anchors catalog rule before: ${anchor}`,
  )
}
expect(!rootInstructions.includes("Atomic Design"), "AGENTS.md must not apply Atomic Design repository-wide")

for (const anchor of [
  "- Use Component-Driven Development (CDD) through Storybook.",
  "- Use Component Story Format (CSF).",
  "- Use Hexagonal Architecture (Ports & Adapters).",
]) {
  expect(sourceInstructions.includes(anchor), `src/AGENTS.md must retain the source anchor: ${anchor}`)
  expect(
    sourceInstructions.indexOf(anchor) < sourceInstructions.indexOf("## UI Design"),
    `src/AGENTS.md must place the source anchor before local UI rules: ${anchor}`,
  )
}

const atomicDesignAnchor = "- Use Atomic Design."
expect(
  featureInstructions.includes(atomicDesignAnchor),
  "src/features/AGENTS.md must retain the Atomic Design anchor",
)
expect(
  featureInstructions.indexOf(atomicDesignAnchor) <
    featureInstructions.indexOf("- Read `docs/engineering/frontend-architecture.md` before feature work."),
  "src/features/AGENTS.md must place Atomic Design before local feature rules",
)

for (const [fileName, removedExplanations] of [
  [
    "test-reviewer.toml",
    [
      "Assess whether tests express behavior at an outer boundary",
      "Assess resulting tests against Kent Beck's Test Desiderata.",
      "Do not apply the outside-in TDD requirement",
    ],
  ],
  [
    "architecture-reviewer.toml",
    [
      "to assess whether each module hides the design decisions",
      "to assess whether source dependencies point toward",
    ],
  ],
  [
    "ui-reviewer.toml",
    [
      "to assess content and interaction priority at the narrowest supported viewport",
      "by checking fluid grids, flexible images, and media-query behavior",
    ],
  ],
]) {
  const content = read(`.codex/agents/${fileName}`)
  for (const removedExplanation of removedExplanations) {
    expect(
      !content.includes(removedExplanation),
      `${fileName} must not redefine its method anchor: ${removedExplanation}`,
    )
  }
}

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
