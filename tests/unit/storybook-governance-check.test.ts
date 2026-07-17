import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const checkerPath = path.join(repositoryRoot, "scripts/storybook-governance-check.mjs")
const fixtureDirectories: string[] = []

const storybookMainSource = `
const config = {
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  stories: ["../src/**/*.stories.@(ts|tsx)"],
}

export default config
`

const storybookPreviewSource = `
const preview = {
  tags: ["autodocs"],
  parameters: {
    a11y: {
      test: "error",
    },
  },
}

export default preview
`

const storybookMainSpreadSource = `
const unsafeOverrides = {
  addons: [],
}

const config = {
  addons: ["@storybook/addon-a11y", "@storybook/addon-docs"],
  stories: ["../src/**/*.stories.@(ts|tsx)"],
  ...unsafeOverrides,
}

export default config
`

const storybookPreviewSpreadSource = `
const unsafeOverrides = {
  parameters: { a11y: { test: "off" } },
  tags: [],
}

const preview = {
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
  ...unsafeOverrides,
}

export default preview
`

function mutatedStorybookPreviewSource(mutation: string) {
  return `
let preview = {
  tags: ["autodocs"],
  parameters: { a11y: { test: "error" } },
}

${mutation}

export default preview
`
}

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

const workspaceHarnessSource = `
export function ClinicDashboardWorkspaceHarness() {
  return <main>Clinic dashboard fixture</main>
}
`

const workspaceCompositionSource = `
export function ClinicDashboardWorkspaceComposition() {
  return <main>Clinic dashboard composition</main>
}
`

const workspacePageSource = `
export function ClinicDashboardWorkspace() {
  return <main>Clinic dashboard workspace</main>
}
`

const workspacePageStorySource = `
import type { Meta } from "@storybook/react"
import { ClinicDashboardWorkspace } from "./ClinicDashboardWorkspace"

const meta = {
  component: ClinicDashboardWorkspace,
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta

export const Default = {}
`

const testingPublicContractSource = `
export { ClinicDashboardWorkspaceHarness } from "./ClinicDashboardWorkspaceHarness"
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

const metaOnlyStorySource = `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const meta = {
  component: ClinicProfile,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

export const helper = {}
`

const excludedStorySource = `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const meta = {
  component: ClinicProfile,
  excludeStories: ["Default"],
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

export const Default = {}
`

const shorthandExcludedStorySource = `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const excludeStories = ["Default"]
const meta = {
  component: ClinicProfile,
  excludeStories,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

export const Default = {}
`

const spreadExcludedStorySource = `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const storyFilters = { excludeStories: ["Default"] }
const meta = {
  component: ClinicProfile,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
  ...storyFilters,
} satisfies Meta<typeof ClinicProfile>

export default meta

export const Default = {}
`

function mutatedMetaStorySource(mutation: string) {
  return `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const meta = {
  component: ClinicProfile,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

${mutation}

export default meta

export const Default = {}
`
}

const moleculeComponentSource = `
export function ConversationSummary() {
  return <section>Conversation</section>
}
`

const memoMoleculeComponentSource = `
import { memo } from "react"

function ConversationSummaryView() {
  return <section>Conversation</section>
}

export const ConversationSummary = memo(ConversationSummaryView)
`

const moleculePublicContractSource = `
export { ConversationSummary } from "./components/molecules/ConversationSummary"
`

const misplacedMoleculePublicContractSource = `
export { ConversationSummary } from "./widgets/ConversationSummary"
`

const importThenExportPublicContractSource = `
import { ConversationSummary } from "./components/molecules/ConversationSummary"

export { ConversationSummary }
`

const aliasChainPublicContractSource = `
import { ConversationSummary as ImportedConversationSummary } from "./components/molecules/ConversationSummary"

const ConversationSummaryAlias = ImportedConversationSummary
const PublicConversationSummary = ConversationSummaryAlias

export { PublicConversationSummary }
`

const exportedAliasPublicContractSource = `
import { ConversationSummary as ImportedConversationSummary } from "./components/molecules/ConversationSummary"

export const PublicConversationSummary = ImportedConversationSummary
`

const namespacePropertyPublicContractSource = `
import * as MessageComponents from "./components/molecules/ConversationSummary"

const MessageComponentsAlias = MessageComponents

export const PublicConversationSummary = MessageComponentsAlias.ConversationSummary
`

const namespaceDestructuringPublicContractSource = `
import * as MessageComponents from "./components/molecules/ConversationSummary"

const MessageComponentsAlias = MessageComponents
const { ["ConversationSummary"]: PublicConversationSummary } = MessageComponentsAlias

export { PublicConversationSummary }
`

const exportedNamespaceDestructuringPublicContractSource = `
import * as MessageComponents from "./components/molecules/ConversationSummary"

export const { ConversationSummary: PublicConversationSummary } = MessageComponents
`

const conversationLabelSource = `
export function createConversationLabel(value: string) {
  return value.trim()
}
`

const importedNonComponentAliasPublicContractSource = `
import { createConversationLabel as ImportedConversationLabel } from "./conversation-label"

const PublicConversationLabel = ImportedConversationLabel

export { PublicConversationLabel }
`

const localNonComponentAliasPublicContractSource = `
const localSettings = { compact: true }
const PublicConversationSettings = localSettings

export { PublicConversationSettings }
`

const cyclicLocalAliasPublicContractSource = `
const FirstAlias = SecondAlias
const SecondAlias = FirstAlias

export { FirstAlias as PublicConversationCycle }
`

function moleculeStorySource(layer: "molecule" | "organism", componentImport = "./ConversationSummary") {
  const titleLayer = layer === "molecule" ? "Molecules" : "Organisms"

  return `
import type { Meta } from "@storybook/react"
import { ConversationSummary } from "${componentImport}"

const meta = {
  component: ConversationSummary,
  tags: ["domain:messages", "layer:${layer}", "status:prototype"],
  title: "Clinic Dashboard/Messages/${titleLayer}/Conversation Summary",
} satisfies Meta<typeof ConversationSummary>

export default meta

export const Default = {}
`
}

function publicAliasMoleculeStorySource(publicExportName: string) {
  return `
import type { Meta } from "@storybook/react"
import { ${publicExportName} } from "../../public"

const meta = {
  component: ${publicExportName},
  tags: ["domain:messages", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Messages/Molecules/Public Conversation Summary",
} satisfies Meta<typeof ${publicExportName}>

export default meta

export const Default = {}
`
}

const journeyStorySource = `
import type { Meta } from "@storybook/react"
import { ConversationSummary } from "../messages/public"

const meta = {
  component: ConversationSummary,
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Journeys/Pages/Conversation Summary",
} satisfies Meta<typeof ConversationSummary>

export default meta

export const Default = {}
`

const journeyAutodocsOptOutStorySource = `
import type { Meta } from "@storybook/react"
import { ConversationSummary } from "../messages/components/molecules/ConversationSummary"

const meta = {
  component: ConversationSummary,
  tags: ["domain:workspace", "layer:page", "status:prototype", "!autodocs"],
  title: "Clinic Dashboard/Journeys/Pages/Conversation Summary",
} satisfies Meta<typeof ConversationSummary>

export default meta

export const Default = {}
`

function storyPolicySource(options: {
  metaParameters?: string
  metaTags?: string
  storyBody?: string
  trailingSource?: string
}) {
  const {
    metaParameters = "",
    metaTags = '["domain:clinic-profile", "layer:organism", "status:prototype"]',
    storyBody = "{}",
    trailingSource = "",
  } = options

  return `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const meta = {
  component: ClinicProfile,
  ${metaParameters}
  tags: ${metaTags},
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

export const Default = ${storyBody}
${trailingSource}
`
}

const spreadStoryPolicySource = `
import type { Meta } from "@storybook/react"
import { ClinicProfile } from "./public"

const meta = {
  component: ClinicProfile,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

const UnsafeAccessibility = {
  parameters: { a11y: { test: "off" } },
}

export const Default = {
  ...UnsafeAccessibility,
}
`

const sharedButtonSource = `
export function Button() {
  return <button type="button">Save</button>
}
`

const locallyExportedSharedButtonSource = `
function Button() {
  return <button type="button">Save</button>
}

export { Button }
`

const sharedButtonStorySource = `
import type { Meta } from "@storybook/react"
import { Button } from "./button"

const meta = {
  component: Button,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Button",
} satisfies Meta<typeof Button>

export default meta

export const Default = {}
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

const sharedDropdownMenuSource = `
export function DropdownMenu() {
  return <div role="menu">Account actions</div>
}
`

const mislabeledSharedDropdownMenuStorySource = `
import type { Meta } from "@storybook/react"
import { DropdownMenu } from "./dropdown-menu"

const meta = {
  component: DropdownMenu,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Dropdown Menu",
} satisfies Meta<typeof DropdownMenu>

export default meta

export const Default = {}
`

const defaultComponentSource = `
export default function ClinicProfile() {
  return <section>Clinic profile</section>
}
`

const defaultPublicContractSource = `
export { default } from "./ClinicProfile"
`

const importedDefaultPublicContractSource = `
import ClinicProfile from "./ClinicProfile"

export default ClinicProfile
`

const defaultComponentStorySource = `
import type { Meta } from "@storybook/react"
import ClinicProfile from "./public"

const meta = {
  component: ClinicProfile,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta

export const Default = {}
`

function createFixture(files: Readonly<Record<string, string>>) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "storybook-governance-"))
  fixtureDirectories.push(fixtureRoot)

  const fixtureFiles = {
    ".storybook/main.ts": storybookMainSource,
    ".storybook/preview.ts": storybookPreviewSource,
    ...files,
  }

  for (const [relativePath, content] of Object.entries(fixtureFiles)) {
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
  it("accepts the concrete workspace composition as a Page outside the journeys area", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.stories.tsx":
        workspacePageStorySource,
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx": workspacePageSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("accepts the explicitly named non-Atomic workspace composition root", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspaceComposition.tsx":
        workspaceCompositionSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("accepts an explicitly classified root-level controller facade", () => {
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

  it("rejects the shared dropdown menu when its title and tag present the molecule as an atom", () => {
    const fixtureRoot = createFixture({
      "src/components/ui/dropdown-menu.stories.tsx": mislabeledSharedDropdownMenuStorySource,
      "src/components/ui/dropdown-menu.tsx": sharedDropdownMenuSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-title-path-layer-agreement src/components/ui/dropdown-menu.stories.tsx :: The component path requires the Molecules title layer.",
    )
    expect(output).toContain(
      "ERROR story-tag-path-layer-agreement src/components/ui/dropdown-menu.stories.tsx :: The component path requires the layer:molecule tag.",
    )
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

  it.each([
    ["default re-export", defaultPublicContractSource],
    ["import then default export", importedDefaultPublicContractSource],
  ])("requires a direct story for a feature public.ts %s", (_kind, publicContract) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": defaultComponentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContract,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: Default export from src/features/clinic-dashboard/clinic-profile/public.ts requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it("resolves a feature default re-export to its direct component story", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": defaultComponentStorySource,
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": defaultComponentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": defaultPublicContractSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("ignores test-only public contracts while still enforcing production public contracts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
      "src/features/clinic-dashboard/workspace/testing/ClinicDashboardWorkspaceHarness.tsx":
        workspaceHarnessSource,
      "src/features/clinic-dashboard/workspace/testing/public.ts": testingPublicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: ClinicProfile requires a direct component story.",
    )
    expect(output).not.toContain("ClinicDashboardWorkspaceHarness requires a direct component story.")
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it("rejects valid meta with only a lowercase object helper export", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": metaOnlyStorySource,
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-export src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story files require at least one statically analyzable CSF story object export.",
    )
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: ClinicProfile requires a direct component story.",
    )
    expect(output.match(/ERROR (?:missing-direct-story|story-export)/gu)).toHaveLength(2)
  })

  it("rejects an object export excluded from Storybook discovery", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": excludedStorySource,
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-export src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story files require at least one statically analyzable CSF story object export.",
    )
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: ClinicProfile requires a direct component story.",
    )
    expect(output.match(/ERROR (?:missing-direct-story|story-export)/gu)).toHaveLength(2)
  })

  it.each([
    ["shorthand", shorthandExcludedStorySource],
    ["spread", spreadExcludedStorySource],
  ])("rejects a %s meta filter that removes the only story export", (_kind, storySource) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": storySource,
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-export src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story files require at least one statically analyzable CSF story object export.",
    )
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: ClinicProfile requires a direct component story.",
    )
    expect(output.match(/ERROR (?:missing-direct-story|story-export)/gu)).toHaveLength(2)
  })

  it.each([
    ["Object.assign", 'Object.assign(meta, { excludeStories: ["Default"] })'],
    ["property assignment", 'meta.excludeStories = ["Default"]'],
    ["element assignment", 'meta["excludeStories"] = ["Default"]'],
  ])("fails closed when %s mutates CSF meta after declaration", (_kind, mutation) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx":
        mutatedMetaStorySource(mutation),
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-export src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story files require at least one statically analyzable CSF story object export.",
    )
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx :: ClinicProfile requires a direct component story.",
    )
    expect(output.match(/ERROR (?:missing-direct-story|story-export)/gu)).toHaveLength(2)
  })

  it("does not treat a journey story as direct component coverage", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/journeys/ConversationSummary.stories.tsx": journeyStorySource,
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": moleculePublicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx :: ConversationSummary requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it("accepts a journey story alongside its required direct component story", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/journeys/ConversationSummary.stories.tsx": journeyStorySource,
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule"),
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": moleculePublicContractSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("allows a feature-private exported molecule to rely on its owner story", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("requires a direct story once the same molecule is exported from public.ts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": moleculePublicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx :: ConversationSummary requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it("recognizes a local export list for shared public component coverage", () => {
    const fixtureRoot = createFixture({
      "src/components/ui/button.tsx": locallyExportedSharedButtonSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/components/ui/button.tsx :: Button requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it("resolves a local export list to its colocated direct story", () => {
    const fixtureRoot = createFixture({
      "src/components/ui/button.stories.tsx": sharedButtonStorySource,
      "src/components/ui/button.tsx": locallyExportedSharedButtonSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("requires a direct story through an import-then-export public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": importThenExportPublicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx :: ConversationSummary requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it("resolves an import-then-export public contract to its direct story", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule", "../../public"),
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": importThenExportPublicContractSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it.each([
    ["local import alias chain", aliasChainPublicContractSource],
    ["exported const alias", exportedAliasPublicContractSource],
    ["namespace property alias", namespacePropertyPublicContractSource],
    ["namespace destructuring alias", namespaceDestructuringPublicContractSource],
    ["exported namespace destructuring alias", exportedNamespaceDestructuringPublicContractSource],
  ])("requires a direct story through a %s", (_kind, publicContract) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": publicContract,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-direct-story src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx :: PublicConversationSummary requires a direct component story.",
    )
    expect(output.match(/ERROR missing-direct-story/gu)).toHaveLength(1)
  })

  it.each([
    ["local import alias chain", aliasChainPublicContractSource],
    ["exported const alias", exportedAliasPublicContractSource],
    ["namespace property alias", namespacePropertyPublicContractSource],
    ["namespace destructuring alias", namespaceDestructuringPublicContractSource],
    ["exported namespace destructuring alias", exportedNamespaceDestructuringPublicContractSource],
  ])("resolves a %s to its direct component story", (_kind, publicContract) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.stories.tsx":
        publicAliasMoleculeStorySource("PublicConversationSummary"),
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
      "src/features/clinic-dashboard/messages/public.ts": publicContract,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it.each([
    ["local value alias", localNonComponentAliasPublicContractSource],
    ["imported non-component alias", importedNonComponentAliasPublicContractSource],
    ["cyclic local aliases", cyclicLocalAliasPublicContractSource],
  ])("does not infer component coverage from a %s", (_kind, publicContract) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/conversation-label.ts": conversationLabelSource,
      "src/features/clinic-dashboard/messages/public.ts": publicContract,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("rejects stories for components placed in an unknown Atomic layer", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/widgets/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule"),
      "src/features/clinic-dashboard/messages/components/widgets/ConversationSummary.tsx":
        moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-component-atomic-layer src/features/clinic-dashboard/messages/components/widgets/ConversationSummary.stories.tsx",
    )
    expect(output.match(/ERROR story-component-atomic-layer/gu)).toHaveLength(1)
  })

  it("rejects stories for components placed directly under components without an Atomic layer", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule"),
      "src/features/clinic-dashboard/messages/components/ConversationSummary.tsx": moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-component-missing-atomic-layer src/features/clinic-dashboard/messages/components/ConversationSummary.stories.tsx",
    )
    expect(output.match(/ERROR story-component-missing-atomic-layer/gu)).toHaveLength(1)
  })

  it("rejects an unclassified visual component at a feature root", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule"),
      "src/features/clinic-dashboard/messages/ConversationSummary.tsx": moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-component-placement src/features/clinic-dashboard/messages/ConversationSummary.tsx",
    )
    expect(output.match(/ERROR feature-component-placement/gu)).toHaveLength(1)
  })

  it("rejects a publicly exported visual component hidden in an arbitrary feature subdirectory", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/public.ts": misplacedMoleculePublicContractSource,
      "src/features/clinic-dashboard/messages/widgets/ConversationSummary.stories.tsx":
        moleculeStorySource("molecule"),
      "src/features/clinic-dashboard/messages/widgets/ConversationSummary.tsx": memoMoleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-component-placement src/features/clinic-dashboard/messages/widgets/ConversationSummary.tsx",
    )
    expect(output.match(/ERROR feature-component-placement/gu)).toHaveLength(1)
  })

  it("rejects production TSX under model in a newly introduced feature area", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/billing/model/HiddenWidget.tsx": `
export function HiddenWidget() {
  return <section>Hidden</section>
}
`,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-component-placement src/features/clinic-dashboard/billing/model/HiddenWidget.tsx",
    )
    expect(output.match(/ERROR feature-component-placement/gu)).toHaveLength(1)
  })

  it.each(["model", "hooks"])(
    "rejects production TSX under the non-visual %s boundary",
    (nonVisualDirectory) => {
      const fixtureRoot = createFixture({
        [`src/features/clinic-dashboard/messages/${nonVisualDirectory}/HiddenWidget.tsx`]: `
export const HiddenWidget = { label: "Conversation" }
`,
      })

      const result = runChecker(fixtureRoot)
      const output = combinedOutput(result)

      expect(result.status).toBe(1)
      expect(output).toContain(
        `ERROR feature-component-placement src/features/clinic-dashboard/messages/${nonVisualDirectory}/HiddenWidget.tsx`,
      )
      expect(output.match(/ERROR feature-component-placement/gu)).toHaveLength(1)
    },
  )

  it.each(["__tests__", "fixtures", "test", "tests", "testing"])(
    "allows a test-only TSX harness under %s",
    (testDirectory) => {
      const fixtureRoot = createFixture({
        [`src/features/clinic-dashboard/messages/${testDirectory}/HiddenWidget.tsx`]: `
export function HiddenWidget() {
  return <section>Fixture</section>
}
`,
      })

      const result = runChecker(fixtureRoot)

      expect(result.status).toBe(0)
      expect(result.stderr).toBe("")
      expect(result.stdout).toContain("storybook governance: 0 findings")
    },
  )

  it("allows a feature-root TSX fixture module", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/HiddenWidget.fixtures.tsx": `
export function HiddenWidget() {
  return <section>Fixture</section>
}
`,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })

  it("allows an exported model constant in a TypeScript source", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/model/ConversationSummary.ts": `
export const ConversationSummary = { label: "Conversation" }
`,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })
})

describe("storybook accessibility and Autodocs policy", () => {
  it("rejects a meta-level accessibility disable override", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": storyPolicySource({
        metaParameters: "parameters: { a11y: { disable: true } },",
      }),
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-a11y-policy src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Stories must not disable the globally enforced accessibility test.",
    )
  })

  it("rejects a story-level accessibility test downgrade", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": storyPolicySource({
        storyBody: '{ parameters: { a11y: { test: "off" } } }',
      }),
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      'ERROR story-a11y-policy src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story accessibility overrides must keep test: "error".',
    )
  })

  it("rejects an accessibility downgrade inherited through a local story spread", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": spreadStoryPolicySource,
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      'ERROR story-a11y-policy src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story accessibility overrides must keep test: "error".',
    )
  })

  it("fails closed when an alias mutates a public story export", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": storyPolicySource({
        trailingSource: `
const storyAlias = Default
storyAlias.parameters = { a11y: { test: "off" } }
`,
      }),
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-policy-static src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Story export Default must remain statically analyzable and immutable so accessibility and Autodocs cannot be overridden indirectly.",
    )
  })

  it("rejects an Autodocs opt-out for a component story", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx": storyPolicySource({
        metaTags: '["domain:clinic-profile", "layer:organism", "status:prototype", "!autodocs"]',
      }),
      "src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx": componentSource,
      "src/features/clinic-dashboard/clinic-profile/public.ts": publicContractSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-autodocs-policy src/features/clinic-dashboard/clinic-profile/ClinicProfile.stories.tsx :: Only explicitly located journey stories may opt out of global Autodocs.",
    )
  })

  it("allows the narrow Autodocs opt-out for an explicitly located journey", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/journeys/ConversationSummary.stories.tsx":
        journeyAutodocsOptOutStorySource,
      "src/features/clinic-dashboard/messages/components/molecules/ConversationSummary.tsx":
        moleculeComponentSource,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("storybook governance: 0 findings")
  })
})

describe("storybook global configuration contract", () => {
  it.each([
    ["main", ".storybook/main.ts", storybookMainSpreadSource, "storybook-main-config-static"],
    ["preview", ".storybook/preview.ts", storybookPreviewSpreadSource, "storybook-preview-config-static"],
  ])("fails closed when the %s config contains a spread override", (_kind, file, source, ruleId) => {
    const fixtureRoot = createFixture({ [file]: source })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(`ERROR ${ruleId} ${file}`)
  })

  it.each([
    ["property assignment", 'preview.parameters.a11y.test = "off"'],
    ["alias mutation", 'const accessibility = preview.parameters.a11y\naccessibility.test = "off"'],
    [
      "property mutation helper",
      'const accessibility = preview.parameters.a11y\nObject.assign(accessibility, { test: "off" })',
    ],
    ["binding reassignment", 'preview = { tags: [], parameters: { a11y: { test: "off" } } }'],
    [
      "array assignment alias mutation",
      'let escaped\n;[escaped] = [preview]\nescaped.parameters.a11y.test = "off"',
    ],
    [
      "object assignment alias mutation",
      'let escaped\n;({ escaped } = { escaped: preview })\nescaped.parameters.a11y.test = "off"',
    ],
    [
      "property container alias mutation",
      'const holder = { current: null }\nholder.current = preview\nholder.current.parameters.a11y.test = "off"',
    ],
  ])("fails closed after a preview %s", (_kind, mutation) => {
    const fixtureRoot = createFixture({
      ".storybook/preview.ts": mutatedStorybookPreviewSource(mutation),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR storybook-preview-config-static .storybook/preview.ts")
  })

  it("rejects disabling the fail-closed global accessibility test", () => {
    const fixtureRoot = createFixture({
      ".storybook/preview.ts": storybookPreviewSource.replace('test: "error"', 'test: "off"'),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      'ERROR storybook-a11y-test .storybook/preview.ts :: Keep global Storybook accessibility enforcement set to test: "error".',
    )
    expect(output.match(/ERROR storybook-a11y-test/gu)).toHaveLength(1)
  })

  it("rejects removing the accessibility addon from Storybook main", () => {
    const fixtureRoot = createFixture({
      ".storybook/main.ts": storybookMainSource.replace('"@storybook/addon-a11y", ', ""),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR storybook-a11y-addon .storybook/main.ts :: Keep @storybook/addon-a11y enabled in the global Storybook configuration.",
    )
    expect(output.match(/ERROR storybook-a11y-addon/gu)).toHaveLength(1)
  })

  it("rejects removing the colocated source story glob from Storybook main", () => {
    const fixtureRoot = createFixture({
      ".storybook/main.ts": storybookMainSource.replace(
        '"../src/**/*.stories.@(ts|tsx)"',
        '"../stories/**/*.stories.tsx"',
      ),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR storybook-story-glob .storybook/main.ts :: Keep ../src/**/*.stories.@(ts|tsx) in the global Storybook story discovery contract.",
    )
    expect(output.match(/ERROR storybook-story-glob/gu)).toHaveLength(1)
  })

  it("rejects disabling global Autodocs", () => {
    const fixtureRoot = createFixture({
      ".storybook/preview.ts": storybookPreviewSource.replace('["autodocs"]', "[]"),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR storybook-autodocs .storybook/preview.ts :: Keep Autodocs enabled in the global Storybook preview contract.",
    )
    expect(output.match(/ERROR storybook-autodocs/gu)).toHaveLength(1)
  })
})
