import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const checkerPath = path.join(repositoryRoot, "scripts/ai-slop-policy-check.mjs")
const fixtureDirectories: string[] = []

function rootInstructions(additionalRules = "") {
  return `
# Fixture Instructions

${additionalRules}

## AI Anti-Slop Policy v2

## Priorities

- Require direct and factual output.

## Required Output Quality

- State concrete evidence.

## Uncertainty & Evidence

- Assumption: fixture inputs are synthetic.
- Confidence: report incomplete evidence.

## Forbidden Patterns

- Avoid unsupported claims.

## Scope & Brevity

- Keep the response concise.
`
}

function createFixture(files: Readonly<Record<string, string>>) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "ai-slop-policy-"))
  fixtureDirectories.push(fixtureRoot)

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(fixtureRoot, relativePath)
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, content.trimStart())
  }

  return fixtureRoot
}

function runChecker(fixtureRoot: string, args: readonly string[] = []) {
  return spawnSync(process.execPath, [checkerPath, ...args], {
    cwd: fixtureRoot,
    encoding: "utf8",
  })
}

function combinedOutput(result: ReturnType<typeof runChecker>) {
  return `${result.stdout}${result.stderr}`
}

afterEach(() => {
  for (const fixtureDirectory of fixtureDirectories.splice(0)) {
    rmSync(fixtureDirectory, { force: true, recursive: true })
  }
})

describe("AI slop policy checker active AGENTS resolution", () => {
  it.each([{ args: [] }, { args: ["--changed-files", "AGENTS.md"] }])(
    "requires the policy in a non-empty root override ($args)",
    ({ args }) => {
      const fixtureRoot = createFixture({
        "AGENTS.md": rootInstructions(),
        "AGENTS.override.md": "- Keep this temporary override concise.",
      })

      const result = runChecker(fixtureRoot, args)
      const output = combinedOutput(result)

      expect(result.status).toBe(1)
      expect(output).toContain("AGENTS.override.md")
      expect(output).toContain('missing required heading: "## AI Anti-Slop Policy v2"')
    },
  )

  it("uses the active root override without mixing in the shadowed standard file", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions("- Antworte dem Nutzer immer auf Deutsch."),
      "AGENTS.override.md": rootInstructions("- Always answer the user in English."),
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("1 files scanned")
  })

  it("falls back to the standard root file when the override is empty", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions(),
      "AGENTS.override.md": "   \n",
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
  })

  it("checks the standard fallback when a changed override was deleted", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions(),
    })

    const result = runChecker(fixtureRoot, ["--changed-files", "AGENTS.override.md"])

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("1 files scanned")
  })

  it.each([{ args: [] }, { args: ["--changed-files", "src/features/AGENTS.md"] }])(
    "keeps a shadowed nested file out of the effective conflict chain ($args)",
    ({ args }) => {
      const fixtureRoot = createFixture({
        "AGENTS.md": rootInstructions("- Antworte dem Nutzer immer auf Deutsch."),
        "src/features/AGENTS.md": "- Always answer the user in English.",
        "src/features/AGENTS.override.md": "- Antworte dem Nutzer immer auf Deutsch.",
      })

      const result = runChecker(fixtureRoot, args)

      expect(result.status).toBe(0)
      expect(result.stderr).toBe("")
    },
  )

  it("detects a conflict introduced by an active nested override", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions("- Antworte dem Nutzer immer auf Deutsch."),
      "src/features/AGENTS.md": "- Antworte dem Nutzer immer auf Deutsch.",
      "src/features/AGENTS.override.md": "- Always answer the user in English.",
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("Conflicting chat language policies")
    expect(output).toContain("src/features/AGENTS.override.md")
    expect(output).not.toContain("src/features/AGENTS.md")
  })
})

describe("AI slop policy checker language conflicts", () => {
  it.each([
    [
      "answer",
      "Plans and answers to my questions are always in German.",
      "Always answer the user in English.",
    ],
    [
      "respond",
      "Plans and answers to my questions are always in German.",
      "Respond to the user in Englisch.",
    ],
    ["write", "Plans and answers to my questions are always in German.", "Write to the user in English."],
    [
      "chat",
      "Plans and answers to my questions are always in German.",
      "Chat with the user only in Englisch.",
    ],
    [
      "explanations",
      "Plans and answers to my questions are always in German.",
      "Explanations must be in English.",
    ],
    ["Deutsch alias", "Antworte dem Nutzer immer auf Deutsch.", "Always respond to the user in English."],
    ["reverse direction", "Always answer the user in English.", "Antworte dem Nutzer immer auf Deutsch."],
  ])("rejects a parent-child %s language conflict", (_label, parentRule, childRule) => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions(`- ${parentRule}`),
      "src/features/AGENTS.md": `- ${childRule}`,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("Conflicting chat language policies (German and English) detected.")
    expect(output).toContain("AGENTS.md")
    expect(output).toContain("src/features/AGENTS.md")
  })

  it("accepts English technical rules and non-effective examples alongside German user communication", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions(
        "- Plans and answers to my questions are always in German unless the user asks otherwise.",
      ),
      "src/features/AGENTS.md": `
- Code, code comments, and documentation are always in English.
- User-facing UI copy and button labels are always in English.
- API responses are always in English.
- Chat UI labels are always in English.
- Write user-facing product content in English.
- Use English for code and German for answers.
- When the user requests English, answer in English.
- Answer in English when explicitly requested.
- The quoted example "Always answer the user in English." is not an effective instruction.
- The quoted example ‘Respond to the user in Englisch.’ is also inert.
> Always write to the user in English.

~~~text
Always chat with the user in English.
~~~
`,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("AI slop policy check passed")
  })

  it.each(["AGENTS.md", "src/features/AGENTS.md"])(
    "checks the complete parent-child conflict graph when only %s changed",
    (changedFile) => {
      const fixtureRoot = createFixture({
        "AGENTS.md": rootInstructions(
          "- Plans and answers to my questions are always in German unless the user asks otherwise.",
        ),
        "src/features/AGENTS.md": "- Always answer the user in English.",
      })

      const result = runChecker(fixtureRoot, ["--changed-files", changedFile])

      expect(result.status).toBe(1)
      expect(combinedOutput(result)).toContain(
        "Conflicting chat language policies (German and English) detected.",
      )
    },
  )

  it.each([{ args: [] }, { args: ["--changed-files", "src/features/AGENTS.md"] }])(
    "rejects a user-language directive even when the clause also requests code evidence ($args)",
    ({ args }) => {
      const fixtureRoot = createFixture({
        "AGENTS.md": rootInstructions("- Plans and answers to my questions are always in German."),
        "src/features/AGENTS.md": "- Always answer the user in English and include code evidence.",
      })

      const result = runChecker(fixtureRoot, args)

      expect(result.status).toBe(1)
      expect(combinedOutput(result)).toContain(
        "Conflicting chat language policies (German and English) detected.",
      )
    },
  )

  it.each([{ args: [] }, { args: ["--changed-files", "src/a/AGENTS.md"] }])(
    "accepts incompatible language rules in disjoint sibling scopes ($args)",
    ({ args }) => {
      const fixtureRoot = createFixture({
        "AGENTS.md": rootInstructions(),
        "src/a/AGENTS.md": "- Always answer the user in English.",
        "src/b/AGENTS.md": "- Antworte dem Nutzer immer auf Deutsch.",
      })

      const result = runChecker(fixtureRoot, args)

      expect(result.status).toBe(0)
      expect(result.stderr).toBe("")
    },
  )

  it("keeps technical response targets separate from user communication", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions("- Plans and answers to my questions are always in German."),
      "src/features/AGENTS.md": `
- API responses are always in English.
- Storybook explanations must be in English.
- Chat UI labels are always in English.
`,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
  })

  it("keeps non-language conflict checks scoped to effective instruction chains", () => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions(),
      "src/a/AGENTS.md": "- Always run pnpm build.",
      "src/b/AGENTS.md": "- Do not run pnpm build.",
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
  })

  it.each([
    [
      "tone",
      "- No filler.",
      "- You may use filler in responses.",
      "Conflicting tone policies (forbid filler vs allow filler) detected.",
    ],
    [
      "build",
      "- Always run pnpm build.",
      "- Do not run pnpm build.",
      "Conflicting execution policies (always build vs skip build) detected.",
    ],
  ])("preserves the existing %s conflict rule", (_label, parentRule, childRule, expected) => {
    const fixtureRoot = createFixture({
      "AGENTS.md": rootInstructions(parentRule),
      "src/features/AGENTS.md": childRule,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(1)
    expect(combinedOutput(result)).toContain(expected)
  })
})
