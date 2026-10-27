import { execFileSync } from "node:child_process"
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it, vi } from "vitest"
// @ts-expect-error Executable repository tooling has no declaration package.
import * as changeScope from "../../scripts/ci/change-scope.mjs"

const { classifyChanges, findRuntimeMarkdown, getPullRequestChanges, parseGitChanges, writeScope } =
  changeScope
// @ts-expect-error Executable repository tooling has no declaration package.
import { testCommand } from "../../scripts/ci/run-tests.mjs"
// @ts-expect-error Executable repository tooling has no declaration package.
import { secretScanFiles } from "../../scripts/ci/scan-secrets.mjs"
// @ts-expect-error Executable repository tooling has no declaration package.
import { summarizeRuns } from "../../scripts/ci/run-timings.mjs"

const directories: string[] = []
const modified = (filename: string) => ({ filename, status: "modified" })
const temporaryDirectory = () => {
  const directory = mkdtempSync(path.join(tmpdir(), "dashboard-ci-"))
  directories.push(directory)
  return directory
}

afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("CI change classification", () => {
  it.each([
    "README.md",
    "docs/nested/plan.md",
    "src/features/AGENTS.md",
    "src/lib/README.md",
    "tests/AGENTS.md",
    ".github/PULL_REQUEST_TEMPLATE.md",
    ".codex/skills/review-gate/SKILL.md",
    "docs/plans/assets/screen.png",
  ])("keeps documentation %s out of application and deployment work", (file) => {
    const scope = classifyChanges([modified(file)])
    expect(scope).toMatchObject({
      docs: true,
      check: false,
      unit: false,
      integration: false,
      storybook: false,
      storybook_build: false,
      build: false,
      e2e: false,
      preview: false,
      dependency: false,
      workflow_security: false,
      codeql_js: false,
      codeql_actions: false,
      full_secret_scan: false,
    })
  })

  it.each(["added", "removed", "modified"])("keeps %s Markdown lightweight", (status) => {
    expect(classifyChanges([{ filename: "src/migrations/AGENTS.md", status }])).toMatchObject({
      docs: true,
      check: false,
      preview: false,
    })
  })

  it.each([
    ["tests/unit/auth-actions.test.ts", "unit"],
    ["tests/integration/support-route.test.ts", "integration"],
    ["src/components/ui/button.stories.tsx", "storybook"],
    ["tests/e2e/clinic-dashboard.spec.ts", "e2e"],
  ])("selects existing case %s", (filename, project) => {
    const scope = classifyChanges([modified(filename)])
    expect(scope).toMatchObject({ check: true, full: false, build: false, preview: false, [project]: true })
    expect(scope.tests[project]).toEqual([filename])
    expect(scope.storybook_build).toBe(project === "storybook")
  })

  it.each(["added", "removed", "renamed", "copied"])(
    "requires full validation for %s test cases",
    (status) => {
      const scope = classifyChanges([
        { filename: "tests/unit/auth.test.ts", status, previous_filename: "tests/unit/old.test.ts" },
      ])
      expect(scope).toMatchObject({
        full: true,
        check: true,
        unit: true,
        integration: true,
        storybook: true,
        build: true,
        e2e: true,
        preview: false,
      })
      expect(scope.tests.unit).toEqual([])
    },
  )

  it.each([
    "tests/setup/vitest.ts",
    "tests/fixtures/data.json",
    "tests/unit/helper.test.ts",
    "src/features/clinic-dashboard/reviews/testing/reviews.fixtures.ts",
    ".storybook/preview.ts",
    "vitest.config.ts",
    "playwright.config.ts",
    "tests/e2e/inquiry-cross-app.spec.ts",
  ])("uses conservative normal validation for support or configuration %s", (filename) => {
    expect(classifyChanges([modified(filename)])).toMatchObject({ full: true, build: true, preview: false })
  })

  it.each([
    "src/app/page.tsx",
    "src/lib/security/csrf.ts",
    "public/brand/logo.svg",
    "next.config.ts",
    "vercel.json",
    "public/help.md",
  ])("builds and deploys runtime input %s", (filename) => {
    expect(classifyChanges([modified(filename)])).toMatchObject({
      check: true,
      full: true,
      build: true,
      preview: true,
    })
  })

  it.each([
    "package.json",
    "pnpm-lock.yaml",
    "pnpm-workspace.yaml",
    "nested/package-lock.json",
    "nested/bun.lockb",
    "Dockerfile",
    "Dockerfile.md",
    "nested/Dockerfile.preview",
    "nested/worker.dockerfile",
  ])("reviews dependency input %s including deletions", (filename) => {
    expect(classifyChanges([{ filename, status: "removed" }])).toMatchObject({
      dependency: true,
      full: true,
      preview: true,
    })
  })

  it("combines selected test projects with documentation without adding builds", () => {
    const scope = classifyChanges([
      modified("docs/notes.md"),
      modified("tests/unit/auth.test.ts"),
      modified("tests/integration/auth.test.ts"),
    ])
    expect(scope).toMatchObject({ docs: true, unit: true, integration: true, build: false, preview: false })
    expect(scope.tests.unit).toEqual(["tests/unit/auth.test.ts"])
  })

  it("does not let one changed case narrow validation required by a runtime change", () => {
    const scope = classifyChanges([modified("tests/unit/auth.test.ts"), modified("src/app/page.tsx")])
    expect(scope).toMatchObject({ full: true, build: true, preview: true })
    expect(scope.tests.unit).toEqual([])
  })

  it.each([
    ["src/app/page.tsx", "docs/page.md"],
    ["docs/page.md", "src/app/page.tsx"],
    ["Dockerfile", "docs/container.md"],
    ["docs/container.md", "Dockerfile"],
  ])("evaluates both sides of rename %s to %s", (previous_filename, filename) => {
    const scope = classifyChanges([{ filename, previous_filename, status: "renamed" }])
    expect(scope).toMatchObject({ full: true, preview: true })
    if ([filename, previous_filename].includes("Dockerfile")) expect(scope.dependency).toBe(true)
  })

  it("only audits workflows for ordinary workflow-only changes", () => {
    const scope = classifyChanges([modified(".github/workflows/deep-quality.yml")])
    expect(scope).toMatchObject({
      check: true,
      unit: true,
      workflow_security: true,
      codeql_actions: true,
      codeql_js: false,
      build: false,
      preview: false,
    })
    expect(scope.tests.unit).toContain("tests/unit/deployment-workflow.test.ts")
  })

  it.each([
    "scripts/ci/change-scope.mjs",
    ".github/actions/change-scope/action.yml",
    ".github/workflows/ci.yml",
    ".github/workflows/deploy-preview.yml",
    ".github/scripts/deploy/vercel-build.sh",
  ])("validates and deploys changes to routing or deployment %s", (filename) => {
    expect(classifyChanges([modified(filename)])).toMatchObject({
      full: true,
      preview: true,
      workflow_security: true,
    })
  })

  it.each([
    ".secrets.baseline",
    ".github/requirements-secret-scan.txt",
    "scripts/ci/scan-secrets.mjs",
    ".github/workflows/workflow-security.yml",
  ])("scans all tracked files when scanner input %s changes", (filename) => {
    expect(classifyChanges([modified(filename)]).full_secret_scan).toBe(true)
  })

  it.each([
    { changes: [] },
    { changes: [modified("README.md"), modified("README.md")] },
    { changes: [{ filename: "README.md", status: "unknown" }] },
    { changes: [{ filename: "docs/new.md", status: "renamed" }] },
    { changes: [modified("../README.md")] },
  ])("fails closed for incomplete or invalid records %#", ({ changes }) => {
    expect(classifyChanges(changes)).toMatchObject({
      full: true,
      preview: true,
      dependency: true,
      codeql_actions: true,
      full_secret_scan: true,
    })
  })

  it("treats unknown files and incomplete pagination as full work", () => {
    expect(classifyChanges([modified("unknown.txt")])).toMatchObject({
      full: true,
      preview: true,
      workflow_security: true,
      codeql_actions: true,
    })
    expect(classifyChanges([modified("README.md")], { complete: false })).toMatchObject({
      full: true,
      preview: true,
    })
  })

  it("detects a Markdown runtime import without application dependencies", () => {
    const root = temporaryDirectory()
    mkdirSync(path.join(root, "src"))
    writeFileSync(path.join(root, "src/page.ts"), 'import help from "../docs/help.md"')
    const runtimeMarkdown = findRuntimeMarkdown(root)
    expect(runtimeMarkdown.has("docs/help.md")).toBe(true)
    expect(classifyChanges([modified("docs/help.md")], { runtimeMarkdown })).toMatchObject({
      docs: false,
      full: true,
      preview: true,
    })
  })
})

describe("change acquisition", () => {
  const snapshot = { changed_files: 101, head: { sha: "a".repeat(40) }, base: { sha: "b".repeat(40) } }
  const event = { number: 42, pull_request: snapshot }

  it("paginates the complete pull request and retains rename metadata", async () => {
    const first = Array.from({ length: 100 }, (_, index) => modified(`docs/${index}.md`))
    const rename = { filename: "docs/new.md", previous_filename: "src/old.ts", status: "renamed" }
    const request = vi.fn(async (endpoint: string) =>
      endpoint.endsWith("page=1") ? first : endpoint.endsWith("page=2") ? [rename] : snapshot,
    )
    const changes = await getPullRequestChanges(event, request)
    expect(request).toHaveBeenCalledTimes(4)
    expect(changes).toHaveLength(101)
    expect(classifyChanges(changes)).toMatchObject({ full: true, preview: true })
  })

  it("rejects truncated file lists", async () => {
    const request = vi.fn(async (endpoint: string) => (endpoint.includes("files?") ? [] : snapshot))
    await expect(getPullRequestChanges(event, request)).rejects.toThrow("pagination")
  })

  it("rejects a revision that changes while files are paginated", async () => {
    let snapshots = 0
    const request = vi.fn(async (endpoint: string) => {
      if (endpoint.includes("files?")) return [modified("README.md")]
      snapshots += 1
      return {
        ...snapshot,
        changed_files: 1,
        head: { sha: snapshots === 1 ? snapshot.head.sha : "c".repeat(40) },
      }
    })
    await expect(getPullRequestChanges(event, request)).rejects.toThrow("during pagination")
  })

  it("parses actual Git renames and deletions across a multi-commit push", () => {
    const root = temporaryDirectory()
    const git = (...args: string[]) => execFileSync("git", args, { cwd: root, encoding: "utf8" })
    git("init", "--quiet")
    writeFileSync(path.join(root, "old name.ts"), "runtime\n")
    writeFileSync(path.join(root, "removed.md"), "notes\n")
    git("add", ".")
    git(
      "-c",
      "user.name=CI Fixture",
      "-c",
      "user.email=ci@example.invalid",
      "commit",
      "--quiet",
      "--message",
      "base",
    )
    const before = git("rev-parse", "HEAD").trim()
    git("mv", "old name.ts", "new name.md")
    git(
      "-c",
      "user.name=CI Fixture",
      "-c",
      "user.email=ci@example.invalid",
      "commit",
      "--quiet",
      "--message",
      "rename",
    )
    git("rm", "--quiet", "removed.md")
    git(
      "-c",
      "user.name=CI Fixture",
      "-c",
      "user.email=ci@example.invalid",
      "commit",
      "--quiet",
      "--message",
      "remove",
    )
    const changes = parseGitChanges(
      git("diff", "--name-status", "-z", "--find-renames", before, "HEAD", "--"),
    )
    expect(changes).toEqual(
      expect.arrayContaining([
        { filename: "new name.md", previous_filename: "old name.ts", status: "renamed" },
        { filename: "removed.md", status: "removed" },
      ]),
    )
    expect(classifyChanges(changes)).toMatchObject({ full: true, preview: true })
  })

  it.each(["workflow_dispatch", "schedule"])("forces full scope for %s", async (GITHUB_EVENT_NAME) => {
    const root = temporaryDirectory()
    expect(await writeScope({ GITHUB_EVENT_NAME, RUNNER_TEMP: root }, root)).toMatchObject({
      full: true,
      preview: true,
      full_secret_scan: true,
    })
  })

  it("emits conservative outputs when event data cannot be read", async () => {
    const root = temporaryDirectory()
    const output = path.join(root, "output")
    vi.spyOn(process.stdout, "write").mockReturnValue(true)
    await writeScope(
      {
        GITHUB_EVENT_NAME: "push",
        GITHUB_EVENT_PATH: path.join(root, "missing.json"),
        GITHUB_OUTPUT: output,
        RUNNER_TEMP: root,
      },
      root,
    )
    expect(readFileSync(output, "utf8")).toContain("dependency=true\n")
    expect(readFileSync(output, "utf8")).toContain("preview=true\n")
  })
})

describe("selected execution and measurements", () => {
  it("passes filenames with spaces as individual arguments", () => {
    const file = "tests/unit/name with spaces.test.ts"
    expect(testCommand("unit", classifyChanges([modified(file)]))).toEqual([
      "exec",
      "vitest",
      "run",
      "--project",
      "unit",
      file,
    ])
  })

  it("rejects an empty selected list instead of silently running no tests", () => {
    expect(() => testCommand("unit", { unit: true, full: false, tests: { unit: [] } })).toThrow("empty")
  })

  it("escapes Playwright regular expression filters for exact changed filenames", () => {
    const file = "tests/e2e/flow (a).spec.ts"
    expect(testCommand("e2e", classifyChanges([modified(file)])).at(-1)).toBe(
      "tests/e2e/flow \\(a\\)\\.spec\\.ts$",
    )
  })

  it("scans changed existing files, skips deleted files, and supports a full scan", () => {
    const root = temporaryDirectory()
    writeFileSync(path.join(root, "changed.md"), "notes")
    writeFileSync(path.join(root, "unchanged.md"), "notes")
    const scope = classifyChanges([modified("changed.md"), { filename: "deleted.md", status: "removed" }])
    expect(secretScanFiles(scope, ["changed.md", "unchanged.md"], root)).toEqual(["changed.md"])
    expect(
      secretScanFiles({ ...scope, full_secret_scan: true }, ["changed.md", "unchanged.md"], root),
    ).toEqual(["changed.md", "unchanged.md"])
  })

  it("separates elapsed time from overlapping job durations", () => {
    const runs = [
      {
        id: 1,
        run_attempt: 1,
        status: "completed",
        conclusion: "success",
        created_at: "2026-10-26T10:00:00Z",
        jobs: [
          { started_at: "2026-10-26T10:00:10Z", completed_at: "2026-10-26T10:02:10Z" },
          { started_at: "2026-10-26T10:00:20Z", completed_at: "2026-10-26T10:01:20Z" },
        ],
      },
    ]
    expect(summarizeRuns(runs)).toMatchObject({ elapsed_seconds: 130, job_seconds: 180, jobs: 2 })
    expect(() => summarizeRuns([{ ...runs[0], status: "in_progress" }])).toThrow("completed")
  })

  it("counts skipped jobs without assigning runner time", () => {
    const result = summarizeRuns([
      {
        id: 1,
        run_attempt: 1,
        status: "completed",
        conclusion: "success",
        created_at: "2026-10-26T10:00:00Z",
        updated_at: "2026-10-26T10:00:05Z",
        jobs: [{ conclusion: "skipped", started_at: null, completed_at: null }],
      },
    ])
    expect(result).toMatchObject({ elapsed_seconds: 5, job_seconds: 0, jobs: 1 })
  })
})
