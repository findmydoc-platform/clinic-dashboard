import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const checkerPath = path.join(repositoryRoot, "scripts/storybook-governance-check.mjs")
const fixtureDirectories: string[] = []

const componentSource = `
export type ClinicProfileProps = Readonly<{ name: string }>

export function ClinicProfile({ name }: ClinicProfileProps) {
  return <section>{name}</section>
}
`

const helperSource = `
export function createClinicProfileLabel(name: string) {
  return name.trim()
}
`

const publicContractSource = `
export { ClinicProfile, type ClinicProfileProps } from "./ClinicProfile"
export { createClinicProfileLabel } from "./clinic-profile-label"
`

const directStorySource = `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const meta = {
  component: ClinicProfile,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

export const Default = {
  args: { name: "Clinic" },
}
`

const moleculeComponentSource = `
export function ConversationSummary() {
  return <section>Conversation</section>
}
`

function moleculeStorySource(layer: "molecule" | "organism") {
  const titleLayer = layer === "molecule" ? "Molecules" : "Organisms"

  return `
import type { Meta } from "@storybook/react"
import { ConversationSummary } from "./ConversationSummary"

const meta = {
  component: ConversationSummary,
  tags: ["domain:messages", "layer:${layer}", "status:prototype"],
  title: "Clinic Dashboard/Messages/${titleLayer}/Conversation Summary",
} satisfies Meta<typeof ConversationSummary>

export default meta

export const Default = {}
`
}

const sharedButtonSource = `
export function Button() {
  return <button type="button">Save</button>
}
`

const mislabeledSharedButtonStorySource = `
import type { Meta } from "@storybook/react"
import { Button } from "./button"

const meta = {
  component: Button,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Button",
} satisfies Meta<typeof Button>

export default meta

export const Default = {}
`

function createFixture(files: Readonly<Record<string, string>>) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "storybook-governance-"))
  fixtureDirectories.push(fixtureRoot)

  for (const [relativePath, content] of Object.entries(files)) {
    const filePath = path.join(fixtureRoot, relativePath)
    mkdirSync(path.dirname(filePath), { recursive: true })
    writeFileSync(filePath, content.trimStart())
  }

  return fixtureRoot
}

function runChecker(fixtureRoot: string) {
  return spawnSync(process.execPath, [checkerPath], {
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

describe("storybook governance public component coverage", () => {
  it("accepts a root-level feature facade without inferring an Atomic path layer", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": directStorySource,
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/clinic-profile-label.ts": helperSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("accepts a molecule whose title and layer tag match its component path", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule"),
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("rejects a molecule presented as an organism in both title and layer tag", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx":
        moleculeStorySource("organism"),
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-title-path-layer-agreement src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx :: The component path requires the Molecules title layer.",
    )
    expect(output).toContain(
      "ERROR story-tag-path-layer-agreement src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx :: The component path requires the layer:molecule tag.",
    )
    expect(output.match(/ERROR story-(?:title|tag)-path-layer-agreement/gu)).toHaveLength(2)
  })

  it("rejects an explicitly classified shared atom presented as a molecule", () => {
    const fixtureRoot = createFixture({
      "src/components/ui/button.stories.tsx": mislabeledSharedButtonStorySource,
      "src/components/ui/button.tsx": sharedButtonSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR story-title-path-layer-agreement")
    expect(output).toContain("ERROR story-tag-path-layer-agreement")
    expect(output.match(/ERROR story-(?:title|tag)-path-layer-agreement/gu)).toHaveLength(2)
  })

  it("rejects a negative fixture when a public.ts component export has no direct story", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/clinic-profile-label.ts": helperSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: ClinicProfile requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })
})
