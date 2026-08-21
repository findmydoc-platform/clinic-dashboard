import { describe, expect, it } from "vitest"

const {
  classifyReviewSurface,
  mergeFileEntries,
  parseCliArguments,
  parseNameStatus,
  parseNameStatusBuffer,
  // @ts-expect-error The router is an executable JavaScript project tool without a public type package.
} = await import("../../.codex/skills/review-gate/scripts/collect-review-context.mjs")

type ReviewFile = Readonly<{
  status: string
  path: string
  previousPath?: string
}>

type ReviewerRoute = Readonly<{ name: string }>

function changed(...paths: string[]): ReviewFile[] {
  return paths.map((path) => ({ status: "M", path }))
}

function recommended(files: ReviewFile[]) {
  return classifyReviewSurface(files).recommendedReviewers.map((reviewer: ReviewerRoute) => reviewer.name)
}

describe("review routing", () => {
  it("omits every reviewer for an empty diff", () => {
    const result = classifyReviewSurface([])

    expect(result.recommendedReviewers).toEqual([])
    expect(result.omittedReviewers).toHaveLength(6)
  })

  it("does not route ordinary documentation-only changes", () => {
    expect(recommended(changed("docs/engineering/local-setup.md"))).toEqual([])
  })

  it("routes plans to the planning reviewer", () => {
    expect(recommended(changed("docs/plans/new-access-boundary.md"))).toEqual(["planning_reviewer"])
  })

  it("routes UI-only changes to UI and test review", () => {
    expect(recommended(changed("src/components/ui/ClinicCard.tsx"))).toEqual([
      "architecture_reviewer",
      "test_reviewer",
      "ui_reviewer",
    ])
  })

  it("routes domain logic changes to logic and test review", () => {
    expect(recommended(changed("src/features/inquiries/model/inquiry-status.ts"))).toEqual([
      "logic_reviewer",
      "architecture_reviewer",
      "test_reviewer",
    ])
  })

  it("routes auth and API changes to logic, security, and test review", () => {
    expect(recommended(changed("src/app/api/auth/session/route.ts"))).toEqual([
      "logic_reviewer",
      "architecture_reviewer",
      "security_reviewer",
      "test_reviewer",
    ])
  })

  it("routes workflow and dependency changes to security and test review", () => {
    expect(recommended(changed(".github/workflows/check.yml", "package.json"))).toEqual([
      "security_reviewer",
      "test_reviewer",
    ])
  })

  it.each([
    ["session gateway", "src/proxy.ts", ["logic_reviewer", "security_reviewer", "test_reviewer"]],
    ["Next.js platform config", "next.config.ts", ["security_reviewer"]],
    ["Vercel platform config", "vercel.json", ["security_reviewer"]],
    ["root environment contract", ".env.example", ["security_reviewer"]],
    ["nested environment contract", "config/.env.preview", ["security_reviewer"]],
    ["Codex command policy", ".codex/rules/safety.rules", ["security_reviewer", "test_reviewer"]],
  ])("routes %s through security review", (_label, file, expected) => {
    expect(recommended(changed(file))).toEqual(expected)
  })

  it("routes a cross-cutting change to all six reviewers", () => {
    expect(
      recommended(
        changed(
          ".codex/project-profile.toml",
          "src/app/api/inquiries/route.ts",
          "src/components/ui/InquiryCard.tsx",
        ),
      ),
    ).toEqual([
      "planning_reviewer",
      "logic_reviewer",
      "architecture_reviewer",
      "security_reviewer",
      "test_reviewer",
      "ui_reviewer",
    ])
  })

  it("preserves renames and deletions from git name-status output", () => {
    expect(parseNameStatus("R100\tsrc/old.ts\tsrc/new.ts\nD\tsrc/removed.ts\n")).toEqual([
      {
        status: "R100",
        previousPath: "src/old.ts",
        path: "src/new.ts",
      },
      { status: "D", path: "src/removed.ts" },
    ])
  })

  it("preserves unusual paths from NUL-delimited git output", () => {
    expect(
      parseNameStatusBuffer(Buffer.from("R100\0src/old name.ts\0src/new\tname.ts\0M\0src/line\nbreak.ts\0")),
    ).toEqual([
      {
        status: "R100",
        previousPath: "src/old name.ts",
        path: "src/new\tname.ts",
      },
      { status: "M", path: "src/line\nbreak.ts" },
    ])
  })

  it("adds untracked non-ignored files without replacing tracked status", () => {
    expect(
      mergeFileEntries([{ status: "M", path: "src/existing.ts" }], ["src/existing.ts", "src/untracked.ts"]),
    ).toEqual([
      { status: "M", path: "src/existing.ts" },
      { status: "??", path: "src/untracked.ts" },
    ])
  })

  it.each([
    ["without forwarded separator", ["--base", "main", "--format", "json"]],
    ["with forwarded separator", ["--", "--base", "main", "--format", "json"]],
  ])("accepts pnpm arguments %s", (_label, args) => {
    expect(parseCliArguments(args)).toMatchObject({
      base: "main",
      format: "json",
    })
  })

  it("preserves inline base values containing an equals sign", () => {
    expect(parseCliArguments(["--base=refs/heads/release=preview"]).base).toBe("refs/heads/release=preview")
  })
})
