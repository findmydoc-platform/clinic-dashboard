import { execFileSync } from "node:child_process"
import { appendFileSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

const checks = [
  "check",
  "docs",
  "unit",
  "integration",
  "storybook",
  "storybook_build",
  "build",
  "e2e",
  "preview",
  "dependency",
  "workflow_security",
  "codeql_js",
  "codeql_actions",
  "full_secret_scan",
]
const projects = ["unit", "integration", "storybook", "e2e"]
const statuses = new Set(["added", "modified", "removed", "renamed", "copied"])
const shaPattern = /^[a-f0-9]{40}$/
const toolingTests = [
  "tests/unit/ci-change-scope.test.ts",
  "tests/unit/ci-workflows.test.ts",
  "tests/unit/ci-docs.test.ts",
  "tests/unit/deployment-workflow.test.ts",
  "tests/unit/deployment-command.test.ts",
  "tests/unit/platform-release-dispatcher.test.ts",
]

function emptyScope() {
  return {
    ...Object.fromEntries(checks.map((name) => [name, false])),
    full: false,
    reasons: [],
    changes: [],
    tests: Object.fromEntries(projects.map((name) => [name, []])),
  }
}

function requireValidation(scope, reason) {
  scope.full = true
  for (const name of ["check", "unit", "integration", "storybook", "storybook_build", "build", "e2e"]) {
    scope[name] = true
  }
  scope.reasons.push(reason)
}

export function fullScope(reason) {
  return {
    ...emptyScope(),
    ...Object.fromEntries(checks.map((name) => [name, true])),
    full: true,
    reasons: [reason],
  }
}

function validPath(value) {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    !value.startsWith("/") &&
    !value.includes("\0") &&
    !value.split("/").some((part) => part === ".." || part === "." || part === "")
  )
}

function isDependency(file) {
  return /(?:^|\/)(?:package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|pnpm-workspace\.yaml|yarn\.lock|bun\.lockb?|Dockerfile(?:\.[^/]+)?|[^/]+\.dockerfile)$/.test(
    file,
  )
}

function testProject(file) {
  if (/^tests\/unit\/.+\.test\.tsx?$/.test(file)) return "unit"
  if (/^tests\/integration\/.+\.test\.tsx?$/.test(file)) return "integration"
  if (/^tests\/e2e\/.+\.spec\.tsx?$/.test(file)) return "e2e"
  if (/^src\/.+\.stories\.tsx?$/.test(file)) return "storybook"
}

function isSharedTest(file) {
  return (
    /(?:^|\/)(?:setup|fixtures?|helpers?|support|testing|__fixtures__|__helpers__|__mocks__|mocks)(?:\/|\.)/i.test(
      file,
    ) ||
    /(?:^|[/.-])(?:setup|fixture|helper|support)\.(?:test|spec)\.tsx?$/i.test(file) ||
    file.startsWith(".storybook/") ||
    /^playwright(?:\.[^/]+)?\.config\./.test(file) ||
    file.startsWith("vitest.config.") ||
    /-cross-app\.spec\.tsx?$/.test(file)
  )
}

function isRouting(file) {
  return (
    file.startsWith("scripts/ci/") ||
    file.startsWith(".github/actions/change-scope/") ||
    file === ".github/workflows/ci.yml"
  )
}

function isDeployment(file) {
  return (
    file.startsWith(".github/scripts/deploy/") ||
    file === ".github/scripts/validate-preview-deployment-metadata.sh" ||
    /^\.github\/workflows\/deploy-(?:main-)?preview\.ya?ml$/.test(file)
  )
}

export function classifyChanges(changes, { complete = true, runtimeMarkdown = new Set() } = {}) {
  if (!complete || !Array.isArray(changes) || changes.length === 0) return fullScope("incomplete-change-list")
  const scope = emptyScope()
  const seen = new Set()
  for (const change of changes) {
    if (
      !change ||
      !statuses.has(change.status) ||
      !validPath(change.filename) ||
      seen.has(change.filename) ||
      ((change.status === "renamed" || change.status === "copied") && !validPath(change.previous_filename))
    ) {
      return fullScope("invalid-change-list")
    }
    seen.add(change.filename)
    scope.changes.push(change)
    for (const file of new Set([change.filename, change.previous_filename].filter(Boolean))) {
      if (
        (/\.md$/i.test(file) || /^docs\/.+\.(?:png|jpe?g|gif|svg|webp|pdf|json)$/i.test(file)) &&
        !file.startsWith("public/") &&
        !isDependency(file) &&
        !runtimeMarkdown.has(file) &&
        !runtimeMarkdown.has("*")
      ) {
        scope.docs = true
        continue
      }
      if (isDependency(file)) {
        requireValidation(scope, "dependency")
        scope.dependency = scope.preview = scope.codeql_js = true
        continue
      }
      if (file === ".secrets.baseline" || file === ".github/requirements-secret-scan.txt") {
        scope.full_secret_scan = true
        continue
      }
      if (isRouting(file)) {
        requireValidation(scope, "routing")
        scope.preview = scope.workflow_security = scope.codeql_js = scope.codeql_actions = true
        if (file === "scripts/ci/scan-secrets.mjs") scope.full_secret_scan = true
        continue
      }
      if (isDeployment(file)) {
        requireValidation(scope, "deployment")
        scope.preview = scope.workflow_security = scope.codeql_actions = true
        continue
      }
      if (/^\.github\/(?:workflows|actions)\//.test(file)) {
        scope.check = scope.unit = scope.workflow_security = scope.codeql_actions = true
        scope.tests.unit.push(...toolingTests)
        if (file === ".github/workflows/workflow-security.yml") scope.full_secret_scan = true
        continue
      }
      if (file.startsWith(".github/scripts/")) {
        scope.check = scope.unit = scope.workflow_security = true
        scope.tests.unit.push(...toolingTests)
        if (/\.[cm]?[jt]s$/.test(file)) scope.codeql_js = true
        continue
      }
      if (/^\.github\/ISSUE_TEMPLATE\/[^/]+\.ya?ml$/.test(file)) {
        scope.check = true
        continue
      }
      if (/^tests\//.test(file) || isSharedTest(file) || testProject(file) === "storybook") {
        const project = testProject(file)
        if (project && change.status === "modified" && !isSharedTest(file)) {
          scope.check = scope[project] = true
          scope.tests[project].push(file)
          if (project === "storybook") scope.storybook_build = true
        } else {
          requireValidation(scope, "shared-or-structural-test-change")
        }
        if (/\.[cm]?[jt]sx?$/.test(file)) scope.codeql_js = true
        continue
      }
      requireValidation(scope, "runtime-or-unknown")
      scope.preview = scope.codeql_js = true
      if (
        !/^(?:src\/|public\/|(?:next|postcss|tailwind|eslint|prettier)\.config\.|tsconfig\.json$|vercel\.json$|\.env\.example$)/.test(
          file,
        )
      ) {
        scope.workflow_security = scope.codeql_actions = scope.dependency = scope.full_secret_scan = true
      }
    }
  }
  scope.reasons = [...new Set(scope.reasons)]
  if (scope.reasons.length === 0)
    scope.reasons.push(scope.check ? "selected-validation" : "documentation-or-security-metadata")
  for (const project of projects) scope.tests[project] = scope.full ? [] : [...new Set(scope.tests[project])]
  return scope
}

export function parseGitChanges(output) {
  const fields = output.split("\0")
  if (fields.at(-1) === "") fields.pop()
  const changes = []
  while (fields.length > 0) {
    const code = fields.shift()
    const status = { A: "added", M: "modified", D: "removed", R: "renamed", C: "copied" }[code?.[0]]
    if (!status) throw new Error("Unsupported Git file status.")
    const previous_filename = status === "renamed" || status === "copied" ? fields.shift() : undefined
    const filename = fields.shift()
    if (!validPath(filename) || (previous_filename !== undefined && !validPath(previous_filename))) {
      throw new Error("Invalid Git file list.")
    }
    changes.push({ filename, status, ...(previous_filename ? { previous_filename } : {}) })
  }
  return changes
}

export async function getPullRequestChanges(event, request) {
  const number = event.pull_request?.number ?? event.number
  if (!Number.isSafeInteger(number) || number < 1) throw new Error("Invalid pull request number.")
  const pr = await request(`/pulls/${number}`)
  if (
    !Number.isSafeInteger(pr.changed_files) ||
    pr.changed_files < 1 ||
    pr.changed_files > 3000 ||
    pr.head?.sha !== event.pull_request?.head?.sha ||
    pr.base?.sha !== event.pull_request?.base?.sha
  ) {
    throw new Error("Pull request comparison is incomplete or changed during classification.")
  }
  const changes = []
  for (let page = 1; changes.length < pr.changed_files; page += 1) {
    const batch = await request(`/pulls/${number}/files?per_page=100&page=${page}`)
    if (!Array.isArray(batch) || batch.length === 0 || batch.length > 100)
      throw new Error("Incomplete pull request pagination.")
    changes.push(
      ...batch.map(({ filename, status, previous_filename }) => ({
        filename,
        status,
        ...(previous_filename ? { previous_filename } : {}),
      })),
    )
  }
  if (changes.length !== pr.changed_files) throw new Error("Pull request file count does not match.")
  const latest = await request(`/pulls/${number}`)
  if (
    latest.head?.sha !== pr.head.sha ||
    latest.base?.sha !== pr.base.sha ||
    latest.changed_files !== pr.changed_files
  ) {
    throw new Error("Pull request changed during pagination.")
  }
  return changes
}

export function findRuntimeMarkdown(root) {
  const result = new Set()
  function visit(directory) {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name)
      if (entry.isDirectory()) visit(file)
      if (!entry.isFile() || !/\.[cm]?[jt]sx?$/.test(file) || /\.stories\./.test(file)) continue
      for (const match of readFileSync(file, "utf8").matchAll(/["'`]([^"'`\n]*\.md)["'`]/g)) {
        const specifier = match[1]
        const resolved = specifier.startsWith("@/")
          ? path.join(root, "src", specifier.slice(2))
          : specifier.startsWith(".")
            ? path.resolve(directory, specifier)
            : path.resolve(root, specifier)
        result.add(path.relative(root, resolved).split(path.sep).join("/"))
        if (specifier.includes("${") || specifier === ".md") result.add("*")
      }
    }
  }
  visit(path.join(root, "src"))
  return result
}

async function collectScope(environment, root) {
  if (["workflow_dispatch", "schedule"].includes(environment.GITHUB_EVENT_NAME))
    return fullScope("manual-or-scheduled")
  const event = JSON.parse(readFileSync(environment.GITHUB_EVENT_PATH, "utf8"))
  let changes
  if (environment.GITHUB_EVENT_NAME === "pull_request") {
    if (!/^[\w.-]+\/[\w.-]+$/.test(environment.GITHUB_REPOSITORY ?? ""))
      throw new Error("Invalid repository.")
    changes = await getPullRequestChanges(event, async (endpoint) => {
      const response = await fetch(
        `https://api.github.com/repos/${environment.GITHUB_REPOSITORY}${endpoint}`,
        {
          headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${environment.GITHUB_TOKEN}`,
            "X-GitHub-Api-Version": "2022-11-28",
          },
          signal: AbortSignal.timeout(20_000),
        },
      )
      if (!response.ok) throw new Error("GitHub comparison request failed.")
      return response.json()
    })
  } else if (environment.GITHUB_EVENT_NAME === "push") {
    if (
      !shaPattern.test(event.before ?? "") ||
      !shaPattern.test(event.after ?? "") ||
      /^0+$/.test(event.before)
    ) {
      throw new Error("Push comparison is unavailable.")
    }
    changes = parseGitChanges(
      execFileSync(
        "git",
        ["diff", "--name-status", "-z", "--find-renames", event.before, event.after, "--"],
        { cwd: root, encoding: "utf8", maxBuffer: 20 * 1024 * 1024 },
      ),
    )
  } else {
    throw new Error("Unsupported classification event.")
  }
  return classifyChanges(changes, { runtimeMarkdown: findRuntimeMarkdown(root) })
}

export async function writeScope(environment = process.env, root = process.cwd()) {
  let scope
  try {
    scope = await collectScope(environment, root)
  } catch {
    scope = fullScope("classification-failed")
    process.stdout.write("Change classification failed; all checks and deployment remain required.\n")
  }
  const manifest = path.join(
    environment.RUNNER_TEMP ?? root,
    `dashboard-ci-scope-${environment.GITHUB_JOB ?? "local"}.json`,
  )
  writeFileSync(manifest, JSON.stringify(scope, null, 2))
  if (environment.GITHUB_OUTPUT)
    appendFileSync(
      environment.GITHUB_OUTPUT,
      [...checks, "full"].map((key) => `${key}=${scope[key]}\n`).join("") + `manifest=${manifest}\n`,
    )
  if (environment.GITHUB_STEP_SUMMARY)
    appendFileSync(
      environment.GITHUB_STEP_SUMMARY,
      `### Change scope\n\n- Files: ${scope.changes.length}\n- Decision: ${scope.reasons.join(", ")}\n- Required: ${checks.filter((key) => scope[key]).join(", ")}\n- Skipped: ${checks.filter((key) => !scope[key]).join(", ")}\n`,
    )
  return scope
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) await writeScope()
