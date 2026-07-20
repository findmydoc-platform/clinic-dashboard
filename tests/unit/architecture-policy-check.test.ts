import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { afterEach, describe, expect, it } from "vitest"

const repositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..")
const checkerPath = path.join(repositoryRoot, "scripts/architecture-policy-check.mjs")
const fixtureDirectories: string[] = []

function createFixture(files: Readonly<Record<string, string>>) {
  const fixtureRoot = mkdtempSync(path.join(tmpdir(), "architecture-policy-"))
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

describe("architecture policy checker process fixtures", () => {
  it("rejects a shared UI domain import hidden behind an inherited secondary path alias", () => {
    const fixtureRoot = createFixture({
      "config/tsconfig.base.json": JSON.stringify({
        compilerOptions: {
          baseUrl: "..",
          paths: {
            "#profile/*": ["src/generated/*", "src/features/clinic-dashboard/clinic-profile/*"],
          },
        },
      }),
      "src/components/ui/ProfileControl.ts": `
        import type { ClinicProfile } from "#profile/model/clinic-profile"
        export type ProfileControlProps = Readonly<{ profile: ClinicProfile }>
      `,
      "src/features/clinic-dashboard/clinic-profile/model/clinic-profile.ts": `
        export type ClinicProfile = Readonly<{ id: string }>
      `,
      "tsconfig.json": JSON.stringify({ extends: "./config/tsconfig.base.json" }),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR shared-ui-domain-import src/components/ui/ProfileControl.ts")
    expect(output.match(/ERROR shared-ui-domain-import/gu)).toHaveLength(1)
  })

  it.each([
    ["array", "let load\n;[load] = [require]"],
    ["object", "let load\n;({ load } = { load: require })"],
  ])("rejects a shared UI domain require hidden by %s assignment destructuring", (_kind, aliasSource) => {
    const fixtureRoot = createFixture({
      "src/components/ui/ProfileControl.ts": `
        ${aliasSource}
        load("@/features/clinic-dashboard/clinic-profile/model/clinic-profile")
        export const profileControl = true
      `,
      "src/features/clinic-dashboard/clinic-profile/model/clinic-profile.ts": `
        export type ClinicProfile = Readonly<{ id: string }>
      `,
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          module: "esnext",
          moduleResolution: "bundler",
          paths: { "@/*": ["src/*"] },
        },
      }),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR shared-ui-domain-import src/components/ui/ProfileControl.ts")
    expect(output.match(/ERROR shared-ui-domain-import/gu)).toHaveLength(1)
  })

  it("rejects a shared UI domain import re-exported transitively through a local aliased package", () => {
    const fixtureRoot = createFixture({
      "packages/profile-contract/index.ts": `
        export type { ClinicProfile } from "#profile-contract/public"
      `,
      "packages/profile-contract/public.ts": `
        export type { ClinicProfile } from "@/features/clinic-dashboard/clinic-profile/model/clinic-profile"
      `,
      "src/components/ui/ProfileControl.ts": `
        import type { ClinicProfile } from "#profile"
        export type ProfileControlProps = Readonly<{ profile: ClinicProfile }>
      `,
      "src/features/clinic-dashboard/clinic-profile/model/clinic-profile.ts": `
        export type ClinicProfile = Readonly<{ id: string }>
      `,
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          module: "esnext",
          moduleResolution: "bundler",
          paths: {
            "#profile": ["packages/profile-contract/index.ts"],
            "#profile-contract/*": ["packages/profile-contract/*"],
            "@/*": ["src/*"],
          },
        },
      }),
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR shared-ui-domain-import src/components/ui/ProfileControl.ts")
    expect(output).toContain(
      "#profile reaches domain source src/features/clinic-dashboard/clinic-profile/model/clinic-profile.ts",
    )
    expect(output.match(/ERROR shared-ui-domain-import/gu)).toHaveLength(1)
  })

  it("accepts neutral local package barrels and excludes external packages from traversal", () => {
    const fixtureRoot = createFixture({
      "node_modules/@vendor/app/index.d.ts": `
        export type VendorAppProfile = Readonly<{ id: string }>
      `,
      "node_modules/@vendor/app/package.json": JSON.stringify({
        name: "@vendor/app",
        types: "index.d.ts",
      }),
      "packages/format-contract/format.ts": `
        export type LabelFormatter = (value: string) => string
      `,
      "packages/format-contract/index.ts": `
        export type { LabelFormatter } from "./format"
      `,
      "src/components/ui/ProfileLabel.ts": `
        import type { VendorAppProfile } from "@vendor/app"
        import type { LabelFormatter } from "#format"
        export type ProfileLabelProps = Readonly<{
          format: LabelFormatter
          profile: VendorAppProfile
        }>
      `,
      "tsconfig.json": JSON.stringify({
        compilerOptions: {
          baseUrl: ".",
          module: "esnext",
          moduleResolution: "bundler",
          paths: {
            "#format": ["packages/format-contract/index.ts"],
          },
        },
        exclude: ["node_modules"],
        include: ["src/**/*.ts", "packages/**/*.ts"],
      }),
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("accepts independent test fixtures and the explicit runtime composition boundaries", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/dashboard.prototype-data.mapper.ts": `
        import { dashboardPrototypeData } from "./dashboard.prototype-data"
        export const dashboardViewModel = { count: dashboardPrototypeData.length }
      `,
      "src/features/clinic-dashboard/dashboard/dashboard.prototype-data.ts": `
        export const dashboardPrototypeData = [{ id: "runtime-metric" }] as const
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/public.ts": `
        export { DashboardScreen } from "./components/organisms/DashboardScreen"
      `,
      "src/features/clinic-dashboard/journeys/FoundationPreview.stories.tsx": `
        import { ClinicDashboardWorkspace } from "../public"
        export const FoundationPreview = ClinicDashboardWorkspace
      `,
      "src/features/clinic-dashboard/messages/components/organisms/MessagesScreen.stories.tsx": `
        import { messagesFixture } from "../../testing/messages.fixtures"
        import { MessagesScreen } from "./MessagesScreen"
        export const Default = { args: { messages: messagesFixture } }
        void MessagesScreen
      `,
      "src/features/clinic-dashboard/messages/components/organisms/MessagesScreen.tsx": `
        import type { Message } from "../../model/messages"
        export function MessagesScreen({ messages }: { messages: readonly Message[] }) {
          return messages.length
        }
      `,
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = [{ id: "runtime-message" }] as const
      `,
      "src/features/clinic-dashboard/messages/model/messages.ts": `
        export type Message = Readonly<{ id: string }>
      `,
      "src/features/clinic-dashboard/messages/testing/messages.fixtures.ts": `
        export const messagesFixture = [{ id: "story-message" }] as const
      `,
      "src/features/clinic-dashboard/prototype/components/molecules/PrototypeModeSwitch.tsx": `
        export function PrototypeModeSwitch() { return null }
      `,
      "src/features/clinic-dashboard/prototype/prototype-commands.ts": `
        export const clinicDashboardPrototypeCommands = { save: async () => undefined }
      `,
      "src/features/clinic-dashboard/public.ts": `
        export { ClinicDashboardWorkspace } from "./workspace/ClinicDashboardWorkspace"
      `,
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx": `
        import { DashboardScreen } from "../dashboard/public"
        import { dashboardViewModel } from "../dashboard/dashboard.prototype-data.mapper"
        import { messagesPrototypeData } from "../messages/messages.prototype-data"
        import { PrototypeModeSwitch } from "../prototype/components/molecules/PrototypeModeSwitch"
        import { clinicDashboardPrototypeCommands } from "../prototype/prototype-commands"
        export const ClinicDashboardWorkspace = {
          commands: clinicDashboardPrototypeCommands,
          dashboard: dashboardViewModel,
          messages: messagesPrototypeData,
          screen: DashboardScreen,
          switch: PrototypeModeSwitch,
        }
      `,
      "tests/unit/messages-model.test.ts": `
        import type { Message } from "../../src/features/clinic-dashboard/messages/model/messages"
        export const message: Message = { id: "unit-message" }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("accepts a pure feature model without browser globals", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/model/messages.selectors.ts": `
        export function selectUnreadCount(messages: readonly { unread: boolean }[]) {
          return messages.filter((message) => message.unread).length
        }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects globalThis.window property access from a pure feature model", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/model/browser-width.ts": `
        export const browserWidth = globalThis.window.innerWidth
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR model-browser-global src/features/clinic-dashboard/messages/model/browser-width.ts :: Pure model code must not reference window.",
    )
    expect(output.match(/ERROR model-browser-global/gu)).toHaveLength(1)
  })

  it('rejects globalThis["localStorage"] element access from a pure feature model', () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/model/stored-filter.ts": `
        export const storedFilter = globalThis["localStorage"].getItem("messages-filter")
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR model-browser-global src/features/clinic-dashboard/messages/model/stored-filter.ts :: Pure model code must not reference localStorage.",
    )
    expect(output.match(/ERROR model-browser-global/gu)).toHaveLength(1)
  })

  it("rejects direct and globalThis Web Crypto access from pure feature models", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/clinic-profile/model/direct-entity-id.ts": `
        export const entityId = crypto.randomUUID()
      `,
      "src/features/clinic-dashboard/clinic-profile/model/global-entity-id.ts": `
        export const entityId = globalThis.crypto.randomUUID()
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR model-browser-global src/features/clinic-dashboard/clinic-profile/model/direct-entity-id.ts :: Pure model code must not reference crypto.",
    )
    expect(output).toContain(
      "ERROR model-browser-global src/features/clinic-dashboard/clinic-profile/model/global-entity-id.ts :: Pure model code must not reference crypto.",
    )
    expect(output.match(/ERROR model-browser-global/gu)).toHaveLength(2)
  })

  it("accepts Web Crypto in the runtime prototype command adapter", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/prototype/prototype-commands.ts": `
        export const createEntityId = () => globalThis.crypto.randomUUID()
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects a story that imports runtime prototype data", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = []
      `,
      "src/features/clinic-dashboard/messages/MessagesScreen.stories.tsx": `
        import { messagesPrototypeData } from "./messages.prototype-data"
        export const Default = { args: { messages: messagesPrototypeData } }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-testing-runtime-prototype-import src/features/clinic-dashboard/messages/MessagesScreen.stories.tsx",
    )
    expect(output.match(/ERROR story-testing-runtime-prototype-import/gu)).toHaveLength(1)
  })

  it("rejects a feature testing fixture that imports runtime command implementations", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/testing/messages.fixtures.ts": `
        import { clinicDashboardPrototypeCommands } from "../../prototype/prototype-commands"
        export const commands = clinicDashboardPrototypeCommands
      `,
      "src/features/clinic-dashboard/prototype/prototype-commands.ts": `
        export const clinicDashboardPrototypeCommands = { save: async () => undefined }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR story-testing-runtime-prototype-import src/features/clinic-dashboard/messages/testing/messages.fixtures.ts",
    )
    expect(output.match(/ERROR story-testing-runtime-prototype-import/gu)).toHaveLength(1)
  })

  it("scans tests outside src and rejects their runtime prototype imports", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/dashboard.prototype-data.ts": `
        export const dashboardPrototypeData = { views: 1 }
      `,
      "tests/unit/dashboard.test.ts": `
        import { dashboardPrototypeData } from "../../src/features/clinic-dashboard/dashboard/dashboard.prototype-data"
        export const views = dashboardPrototypeData.views
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR story-testing-runtime-prototype-import tests/unit/dashboard.test.ts")
    expect(output.match(/ERROR story-testing-runtime-prototype-import/gu)).toHaveLength(1)
  })

  it("rejects runtime prototype data from feature UI and non-UI production modules", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/organisms/MessagesScreen.tsx": `
        import { messagesPrototypeData } from "../../messages.prototype-data"
        export const MessagesScreen = () => messagesPrototypeData.length
      `,
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = []
      `,
      "src/features/clinic-dashboard/messages/useMessagesController.ts": `
        import { messagesPrototypeData } from "./messages.prototype-data"
        export const useMessagesController = () => messagesPrototypeData
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR feature-ui-runtime-data-import")
    expect(output).toContain("ERROR runtime-prototype-data-boundary")
    expect(
      output.match(/ERROR (?:feature-ui-runtime-data-import|runtime-prototype-data-boundary)/gu),
    ).toHaveLength(2)
  })

  it("rejects a prototype-data mapper that imports another feature's runtime source", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/dashboard.prototype-data.mapper.ts": `
        import { messagesPrototypeData } from "../messages/messages.prototype-data"
        export const dashboardViewModel = { count: messagesPrototypeData.length }
      `,
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = []
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR runtime-prototype-data-boundary src/features/clinic-dashboard/dashboard/dashboard.prototype-data.mapper.ts",
    )
    expect(output.match(/ERROR runtime-prototype-data-boundary/gu)).toHaveLength(1)
  })

  it("rejects runtime prototype commands from shells and non-UI production modules", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/MessagesShell.tsx": `
        import { clinicDashboardPrototypeCommands } from "../prototype/prototype-commands"
        export const MessagesShell = () => clinicDashboardPrototypeCommands
      `,
      "src/features/clinic-dashboard/messages/useMessagesCommands.ts": `
        import { clinicDashboardPrototypeCommands } from "../prototype/prototype-commands"
        export const useMessagesCommands = () => clinicDashboardPrototypeCommands
      `,
      "src/features/clinic-dashboard/prototype/prototype-commands.ts": `
        export const clinicDashboardPrototypeCommands = { save: async () => undefined }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR render-boundary-runtime-command-import")
    expect(output).toContain("ERROR runtime-prototype-command-boundary")
    expect(
      output.match(/ERROR (?:render-boundary-runtime-command-import|runtime-prototype-command-boundary)/gu),
    ).toHaveLength(2)
  })

  it("rejects a feature production module that back-imports the Clinic Dashboard root public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/useDashboardController.ts": `
        import { ClinicDashboardWorkspace } from "@/features/clinic-dashboard/public"
        export const workspace = ClinicDashboardWorkspace
      `,
      "src/features/clinic-dashboard/public.ts": `
        export { ClinicDashboardWorkspace } from "./workspace/ClinicDashboardWorkspace"
      `,
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx": `
        export function ClinicDashboardWorkspace() { return null }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-root-public-back-import src/features/clinic-dashboard/dashboard/useDashboardController.ts",
    )
    expect(output.match(/ERROR feature-root-public-back-import/gu)).toHaveLength(1)
  })

  it("rejects an Atomic upward import hidden by its own public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/molecules/MetricCard.tsx": `
        import { DashboardScreen } from "@/features/clinic-dashboard/dashboard/public"
        export const MetricCard = DashboardScreen
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/public.ts": `
        export { DashboardScreen } from "./components/organisms/DashboardScreen"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-same-area-public-import src/features/clinic-dashboard/dashboard/components/molecules/MetricCard.tsx",
    )
    expect(output.match(/ERROR feature-same-area-public-import/gu)).toHaveLength(1)
    expect(output).toContain(
      "ERROR atomic-upward-import src/features/clinic-dashboard/dashboard/components/molecules/MetricCard.tsx",
    )
    expect(output.match(/ERROR atomic-upward-import/gu)).toHaveLength(1)
  })

  it("rejects an Atomic upward import hidden by transitive re-export barrels", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx": `
        import { DashboardScreen } from "../../ui"
        export const StatusDot = DashboardScreen
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/ui-surface.ts": `
        export { DashboardScreen } from "./components/organisms/DashboardScreen"
      `,
      "src/features/clinic-dashboard/dashboard/ui.ts": `
        export { DashboardScreen } from "./ui-surface"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR atomic-upward-import src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx",
    )
    expect(output).toContain("atoms must not import a barrel that re-exports the higher organisms layer")
    expect(output.match(/ERROR atomic-upward-import/gu)).toHaveLength(1)
  })

  it("rejects an Atomic upward import hidden by multi-step local re-export barrels with a cycle", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx": `
        import { DashboardScreen } from "../../ui"
        export const StatusDot = DashboardScreen
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/ui-cycle.ts": `
        import { DashboardScreen as CycleMarker } from "./ui"
        export { CycleMarker }
      `,
      "src/features/clinic-dashboard/dashboard/ui-surface.ts": `
        import { DashboardScreen } from "./components/organisms/DashboardScreen"
        import { CycleMarker } from "./ui-cycle"
        export { CycleMarker, DashboardScreen }
      `,
      "src/features/clinic-dashboard/dashboard/ui.ts": `
        import { DashboardScreen } from "./ui-surface"
        export { DashboardScreen }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR atomic-upward-import src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx",
    )
    expect(output).toContain("atoms must not import a barrel that re-exports the higher organisms layer")
    expect(output.match(/ERROR atomic-upward-import/gu)).toHaveLength(1)
  })

  it("rejects an Atomic upward import hidden by a multi-step local alias export", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx": `
        import { Alias2 } from "../../ui"
        export const StatusDot = Alias2
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/ui.ts": `
        import { DashboardScreen as Screen } from "./components/organisms/DashboardScreen"
        const Alias = Screen
        const Alias2 = Alias
        export { Alias2 }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR atomic-upward-import src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx",
    )
    expect(output).toContain("atoms must not import a barrel that re-exports the higher organisms layer")
    expect(output.match(/ERROR atomic-upward-import/gu)).toHaveLength(1)
  })

  it("rejects an Atomic upward import hidden by a namespace re-export", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx": `
        import { Screens } from "../../ui"
        export const StatusDot = Screens
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/ui.ts": `
        import * as Screens from "./components/organisms/DashboardScreen"
        export { Screens }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR atomic-upward-import src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx",
    )
    expect(output).toContain("atoms must not import a barrel that re-exports the higher organisms layer")
    expect(output.match(/ERROR atomic-upward-import/gu)).toHaveLength(1)
  })

  it.each([
    [
      "an exported variable alias",
      `
        import { DashboardScreen as Screen } from "./components/organisms/DashboardScreen"
        export const Alias = Screen
      `,
    ],
    [
      "a namespace property",
      `
        import * as Screens from "./components/organisms/DashboardScreen"
        export const Alias = Screens.DashboardScreen
      `,
    ],
    [
      "a namespace element and local alias chain",
      `
        import * as Screens from "./components/organisms/DashboardScreen"
        const NamespaceAlias = Screens
        const ElementAlias = NamespaceAlias["DashboardScreen"]
        const Alias = ElementAlias
        export { Alias }
      `,
    ],
    [
      "namespace destructuring",
      `
        import * as Screens from "./components/organisms/DashboardScreen"
        const NamespaceAlias = Screens
        const { DashboardScreen: Alias } = NamespaceAlias
        export { Alias }
      `,
    ],
  ])("rejects an Atomic upward import hidden by %s", (_kind, barrelSource) => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx": `
        import { Alias } from "../../ui"
        export const StatusDot = Alias
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/ui.ts": barrelSource,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR atomic-upward-import src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx",
    )
    expect(output).toContain("atoms must not import a barrel that re-exports the higher organisms layer")
    expect(output.match(/ERROR atomic-upward-import/gu)).toHaveLength(1)
  })

  it("accepts pure local alias exports and same-layer alias re-exports through a barrel", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/atoms/StatusDot.tsx": `
        import { localCycleA, localThreshold, SameLayerAlias } from "../../ui"
        export const StatusDot = localThreshold > 0 ? SameLayerAlias : localCycleA
      `,
      "src/features/clinic-dashboard/dashboard/components/atoms/TrendIcon.tsx": `
        export function TrendIcon() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/ui.ts": `
        import * as TrendIcons from "./components/atoms/TrendIcon"
        const threshold = 1
        const LocalAlias = threshold
        const LocalAlias2 = LocalAlias
        const TrendNamespace = TrendIcons
        const { TrendIcon: TrendAlias } = TrendNamespace
        const localCycleA = localCycleB
        const localCycleB = localCycleA
        export const localThreshold = LocalAlias2
        export const SameLayerAlias = TrendAlias
        export { localCycleA }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects a model that hides a same-area organism import behind public.ts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        export function DashboardScreen() { return null }
      `,
      "src/features/clinic-dashboard/dashboard/model/dashboard-view-model.ts": `
        import { DashboardScreen } from "../public"
        export const dashboardScreen = DashboardScreen
      `,
      "src/features/clinic-dashboard/dashboard/public.ts": `
        export { DashboardScreen } from "./components/organisms/DashboardScreen"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-same-area-public-import src/features/clinic-dashboard/dashboard/model/dashboard-view-model.ts",
    )
    expect(output.match(/ERROR feature-same-area-public-import/gu)).toHaveLength(1)
  })

  it("rejects a hook that imports through its own public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/hooks/useDashboardController.ts": `
        import type { DashboardViewModel } from "../public"
        export const useDashboardController = (): DashboardViewModel => ({ views: 1 })
      `,
      "src/features/clinic-dashboard/dashboard/model/dashboard-view-model.ts": `
        export type DashboardViewModel = Readonly<{ views: number }>
      `,
      "src/features/clinic-dashboard/dashboard/public.ts": `
        export type { DashboardViewModel } from "./model/dashboard-view-model"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR feature-same-area-public-import src/features/clinic-dashboard/dashboard/hooks/useDashboardController.ts",
    )
    expect(output.match(/ERROR feature-same-area-public-import/gu)).toHaveLength(1)
  })

  it("accepts a production module that imports another area's public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/model/dashboard-view-model.ts": `
        export type DashboardViewModel = Readonly<{ views: number }>
      `,
      "src/features/clinic-dashboard/dashboard/public.ts": `
        export type { DashboardViewModel } from "./model/dashboard-view-model"
      `,
      "src/features/clinic-dashboard/messages/hooks/useMessagesController.ts": `
        import type { DashboardViewModel } from "@/features/clinic-dashboard/dashboard/public"
        export const dashboard: DashboardViewModel = { views: 1 }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects private imports into workspace and prototype areas", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/useMessagesController.ts": `
        import { capabilities } from "../prototype/model/capabilities"
        import type { ClinicDashboardSection } from "../workspace/model/workspace"
        export const state: ClinicDashboardSection = capabilities.section
      `,
      "src/features/clinic-dashboard/prototype/model/capabilities.ts": `
        export const capabilities = { section: "dashboard" as const }
      `,
      "src/features/clinic-dashboard/workspace/model/workspace.ts": `
        export type ClinicDashboardSection = "dashboard"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("../prototype/model/capabilities")
    expect(output).toContain("../workspace/model/workspace")
    expect(output.match(/ERROR cross-area-private-import/gu)).toHaveLength(2)
  })

  it("rejects runtime prototype data re-exported from a feature public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = []
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        export { messagesPrototypeData } from "./messages.prototype-data"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR public-prototype-data-export src/features/clinic-dashboard/messages/public.ts",
    )
    expect(output.match(/ERROR public-prototype-data-export/gu)).toHaveLength(1)
  })

  it("rejects runtime prototype data transitively re-exported through mapper aliases", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = [{ id: "message-1" }]
      `,
      "src/features/clinic-dashboard/messages/messages.prototype-data.mapper.ts": `
        import * as Runtime from "./messages.prototype-data"
        const RuntimeAlias = Runtime
        const { messagesPrototypeData: DataAlias } = RuntimeAlias
        export const PublicDataAlias = DataAlias
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        import { PublicDataAlias } from "./messages.prototype-data.mapper"
        const Alias = PublicDataAlias
        export { Alias }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR public-prototype-data-export src/features/clinic-dashboard/messages/public.ts",
    )
    expect(output).toContain("src/features/clinic-dashboard/messages/messages.prototype-data.ts")
    expect(output.match(/ERROR public-prototype-data-export/gu)).toHaveLength(1)
  })

  it("fails closed when a feature public contract re-exports a prototype-data mapper target", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/messages.prototype-data.mapper.ts": `
        export function mapMessagesPrototypeData() { return [] }
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        export { mapMessagesPrototypeData } from "./messages.prototype-data.mapper"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR public-prototype-data-export src/features/clinic-dashboard/messages/public.ts",
    )
    expect(output).toContain("src/features/clinic-dashboard/messages/messages.prototype-data.mapper.ts")
    expect(output.match(/ERROR public-prototype-data-export/gu)).toHaveLength(1)
  })

  it("accepts private workspace use of a same-area prototype-data mapper", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = [{ id: "message-1" }]
      `,
      "src/features/clinic-dashboard/messages/messages.prototype-data.mapper.ts": `
        import { messagesPrototypeData } from "./messages.prototype-data"
        export function mapMessagesPrototypeData() {
          return messagesPrototypeData.map(({ id }) => ({ id }))
        }
      `,
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx": `
        import { mapMessagesPrototypeData } from "../messages/messages.prototype-data.mapper"
        export function ClinicDashboardWorkspace() {
          void mapMessagesPrototypeData()
          return null
        }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects unknown Atomic layers and catch-all feature directories", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/widgets/MessageWidget.tsx": `
        export function MessageWidget() { return null }
      `,
      "src/features/clinic-dashboard/messages/model/common/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/helpers/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/misc/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/primitives/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/repositories/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/services/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/shared/format.ts": `
        export const format = (value: string) => value
      `,
      "src/features/clinic-dashboard/messages/model/utils/format.ts": `
        export const format = (value: string) => value
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR unknown-atomic-layer src/features/clinic-dashboard/messages/components/widgets/MessageWidget.tsx",
    )
    expect(output.match(/ERROR unknown-atomic-layer/gu)).toHaveLength(1)
    expect(output.match(/ERROR forbidden-catchall-directory/gu)).toHaveLength(8)
  })

  it("accepts concretely named feature directories", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/adapters/review-service.ts": `
        export const reviewService = { load: async () => [] }
      `,
      "src/features/clinic-dashboard/messages/model/formatting/message-date.ts": `
        export const messageDate = "2026-07-17"
      `,
      "src/features/clinic-dashboard/messages/model/persistence/message-repository.ts": `
        export const messageRepository = { save: async () => undefined }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects feature components placed directly under components without an Atomic layer", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/components/MessageCard.tsx": `
        export function MessageCard() { return null }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR missing-atomic-layer src/features/clinic-dashboard/messages/components/MessageCard.tsx :: Feature components must be placed under an atoms, molecules, or organisms directory.",
    )
    expect(output.match(/ERROR missing-atomic-layer/gu)).toHaveLength(1)
  })

  it("analyzes literal dynamic imports through template, parentheses, as, and satisfies syntax", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/organisms/AsScreen.tsx": `
        export async function AsScreen() {
          return import("../../../messages/messages.prototype-data" as string)
        }
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/ParenthesizedScreen.tsx": `
        export async function ParenthesizedScreen() {
          return import(("../../../messages/messages.prototype-data"))
        }
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/SatisfiesScreen.tsx": `
        export async function SatisfiesScreen() {
          return import("../../../messages/messages.prototype-data" satisfies string)
        }
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/TemplateScreen.tsx": `
        export async function TemplateScreen() {
          return import(\`../../../messages/messages.prototype-data\`)
        }
      `,
      "src/features/clinic-dashboard/messages/messages.prototype-data.ts": `
        export const messagesPrototypeData = []
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output.match(/ERROR feature-ui-runtime-data-import/gu)).toHaveLength(4)
  })

  it("rejects dynamic imports whose targets are not statically analyzable", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/model/lazy-message-module.ts": `
        const modulePath = "./messages"
        export const loadMessages = () => import(modulePath)
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR unresolved-dynamic-import src/features/clinic-dashboard/messages/model/lazy-message-module.ts :: Governed source must use a statically analyzable dynamic import target.",
    )
    expect(output.match(/ERROR unresolved-dynamic-import/gu)).toHaveLength(1)
  })

  it("rejects alias and relative Feature to App Router imports", () => {
    const fixtureRoot = createFixture({
      "src/app/actions.ts": `
        export const save = () => undefined
      `,
      "src/features/clinic-dashboard/messages/components/molecules/MessageCard.tsx": `
        import { save } from "../../../../../app/actions"
        export function MessageCard() { return save() }
      `,
      "src/features/clinic-dashboard/messages/model/message-action.ts": `
        import { save } from "@/app/actions"
        export const saveMessage = save
      `,
      "src/features/clinic-dashboard/messages/model/message-action-loader.ts": `
        export const loadMessageAction = () => import("../../../../app/actions")
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output.match(/ERROR feature-app-import/gu)).toHaveLength(3)
  })

  it("rejects neutral barrels that expose feature-private implementation", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/molecules/MetricCard.tsx": `
        export function MetricCard() { return null }
      `,
      "src/features/clinic-dashboard/messages/components/molecules/MessageCard.tsx": `
        import { MetricCard } from "@/lib/dashboard-internals"
        export const MessageCard = MetricCard
      `,
      "src/lib/dashboard-internals.ts": `
        export { MetricCard } from "@/features/clinic-dashboard/dashboard/components/molecules/MetricCard"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR neutral-feature-private-import src/lib/dashboard-internals.ts")
    expect(output.match(/ERROR neutral-feature-private-import/gu)).toHaveLength(1)
  })

  it("rejects executable JavaScript source under src", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/legacy.cjs": "module.exports = {}",
      "src/features/clinic-dashboard/messages/legacy.js": "export const legacy = true",
      "src/features/clinic-dashboard/messages/legacy.jsx": "export const Legacy = () => null",
      "src/features/clinic-dashboard/messages/legacy.mjs": "export const legacy = true",
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output.match(/ERROR javascript-source-forbidden/gu)).toHaveLength(4)
  })

  it("rejects namespace wildcard exports from feature public contracts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/model/internal.ts": `
        export const internal = true
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        export * as internals from "./model/internal"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR wildcard-public-export src/features/clinic-dashboard/messages/public.ts")
    expect(output.match(/ERROR wildcard-public-export/gu)).toHaveLength(1)
  })

  it("rejects default exports from feature public contracts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/public.ts": `
        const dashboard = { views: 1 }
        export default dashboard
      `,
      "src/features/clinic-dashboard/clinic-profile/public.ts": `
        export default function ClinicProfile() { return null }
      `,
      "src/features/clinic-dashboard/messages/MessagesScreen.tsx": `
        export default function MessagesScreen() { return null }
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        export { default } from "./MessagesScreen"
      `,
      "src/features/clinic-dashboard/reviews/Reviews.tsx": `
        export function Reviews() { return null }
      `,
      "src/features/clinic-dashboard/reviews/public.ts": `
        export { Reviews as default } from "./Reviews"
      `,
      "src/features/clinic-dashboard/support/public.ts": `
        const support = { enabled: true }
        export = support
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR default-public-export src/features/clinic-dashboard/dashboard/public.ts")
    expect(output).toContain(
      "ERROR default-public-export src/features/clinic-dashboard/clinic-profile/public.ts",
    )
    expect(output).toContain("ERROR default-public-export src/features/clinic-dashboard/messages/public.ts")
    expect(output).toContain("ERROR default-public-export src/features/clinic-dashboard/reviews/public.ts")
    expect(output).toContain("ERROR default-public-export src/features/clinic-dashboard/support/public.ts")
    expect(output.match(/ERROR default-public-export/gu)).toHaveLength(5)
  })

  it("accepts explicit named exports from feature public contracts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/MessagesScreen.tsx": `
        export function MessagesScreen() { return null }
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        export { MessagesScreen } from "./MessagesScreen"
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects CommonJS assignments from feature public contracts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/public.ts": `
        const dashboard = { views: 1 }
        module.exports = dashboard
      `,
      "src/features/clinic-dashboard/messages/public.ts": `
        const Messages = () => null
        module.exports.default = Messages
      `,
      "src/features/clinic-dashboard/reviews/public.ts": `
        const Reviews = () => null
        exports.default = Reviews
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR commonjs-public-export src/features/clinic-dashboard/dashboard/public.ts")
    expect(output).toContain("ERROR commonjs-public-export src/features/clinic-dashboard/messages/public.ts")
    expect(output).toContain("ERROR commonjs-public-export src/features/clinic-dashboard/reviews/public.ts")
    expect(output.match(/ERROR commonjs-public-export/gu)).toHaveLength(3)
  })

  it("rejects symbol-resolved CommonJS export aliases from feature public contracts", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/public.cts": `
        const dashboard = { views: 1 }
        const cjs = module
        cjs.exports = dashboard
      `,
      "src/features/clinic-dashboard/messages/public.cts": `
        const Messages = () => null
        const contract = module.exports
        const contractAlias = contract
        contractAlias.default = Messages
      `,
      "src/features/clinic-dashboard/reviews/public.cts": `
        const Reviews = () => null
        const contract = exports
        const contractAlias = contract
        contractAlias.Reviews = Reviews
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR commonjs-public-export src/features/clinic-dashboard/dashboard/public.cts",
    )
    expect(output).toContain("ERROR commonjs-public-export src/features/clinic-dashboard/messages/public.cts")
    expect(output).toContain("ERROR commonjs-public-export src/features/clinic-dashboard/reviews/public.cts")
    expect(output.match(/ERROR commonjs-public-export/gu)).toHaveLength(3)
  })

  it("accepts CommonJS-shaped mutations of locally scoped module and exports bindings", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/support/public.ts": `
        const module = { exports: { enabled: false } }
        const exports = { default: false }
        const cjs = module
        cjs.exports = { enabled: true }
        const contract = exports
        contract.default = true

        function configureLocalContracts(
          module: { exports: { enabled: boolean } },
          exports: { default: boolean },
        ) {
          const localModuleAlias = module
          localModuleAlias.exports = { enabled: true }
          const localExportsAlias = exports
          localExportsAlias.default = true
        }

        export { cjs, configureLocalContracts, contract }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("accepts ES named exports and ordinary nested exports properties", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/messages/public.ts": `
        const packageMetadata = { exports: { default: false } }
        packageMetadata.exports.default = true
        export { packageMetadata }
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("allows only the server provider and client adapter entries to consume the central demo source", () => {
    const fixtureRoot = createFixture({
      "src/app/page.tsx": `
        import { ClinicDashboardWorkspace } from "../features/clinic-dashboard/public"
        import { loadClinicDashboardWorkspaceInput } from "../features/clinic-dashboard/server"
        export default async function Page() {
          return ClinicDashboardWorkspace(await loadClinicDashboardWorkspaceInput())
        }
      `,
      "src/features/clinic-dashboard/demo/commands.ts": `
        export const demoClientAdapter = { save: async () => undefined }
      `,
      "src/features/clinic-dashboard/demo/dataset.ts": `
        import type { ClinicDashboardWorkspaceInput } from "../workspace/model/workspace-input"
        export const dataset = {} as ClinicDashboardWorkspaceInput
      `,
      "src/features/clinic-dashboard/demo/loader.ts": `
        import { dataset } from "./dataset"
        import type { ClinicDashboardWorkspaceProvider } from "../workspace-provider"
        export const demoProvider = {
          loadWorkspace: async () => dataset,
        } satisfies ClinicDashboardWorkspaceProvider
      `,
      "src/features/clinic-dashboard/public.ts": `
        export { ClinicDashboardWorkspace } from "./workspace/ClinicDashboardWorkspace"
      `,
      "src/features/clinic-dashboard/server.ts": `
        import "server-only"
        import { demoProvider } from "./demo/loader"
        import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"
        export function loadClinicDashboardWorkspaceInput(): Promise<ClinicDashboardWorkspaceInput> {
          return demoProvider.loadWorkspace()
        }
      `,
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx": `
        import { demoClientAdapter } from "../demo/commands"
        export function ClinicDashboardWorkspace(input: unknown) { return { demoClientAdapter, input } }
      `,
      "src/features/clinic-dashboard/workspace/model/workspace-input.ts": `
        export type ClinicDashboardWorkspaceInput = Readonly<{ organizationId: string }>
      `,
      "src/features/clinic-dashboard/workspace-provider.ts": `
        import type { ClinicDashboardWorkspaceInput } from "./workspace/model/workspace-input"
        export type ClinicDashboardWorkspaceProvider = Readonly<{
          loadWorkspace: () => Promise<ClinicDashboardWorkspaceInput>
        }>
      `,
    })

    const result = runChecker(fixtureRoot)

    expect(result.status, combinedOutput(result)).toBe(0)
    expect(result.stderr).toBe("")
    expect(result.stdout).toContain("architecture governance: 0 findings")
  })

  it("rejects private workspace provider imports outside the server entry and provider implementation", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/hooks/useDashboardController.ts": `
        import type { ClinicDashboardWorkspaceProvider } from "../../workspace-provider"
        export function useDashboardController(provider: ClinicDashboardWorkspaceProvider) { return provider }
      `,
      "src/features/clinic-dashboard/workspace-provider.ts": `
        export type ClinicDashboardWorkspaceProvider = Readonly<{ loadWorkspace: () => Promise<unknown> }>
      `,
      "tests/unit/workspace-provider.test.ts": `
        import type { ClinicDashboardWorkspaceProvider } from "../../src/features/clinic-dashboard/workspace-provider"
        export const provider = {} as ClinicDashboardWorkspaceProvider
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR clinic-dashboard-workspace-provider-boundary src/features/clinic-dashboard/dashboard/hooks/useDashboardController.ts",
    )
    expect(output).toContain(
      "ERROR clinic-dashboard-workspace-provider-boundary tests/unit/workspace-provider.test.ts",
    )
    expect(output.match(/ERROR clinic-dashboard-workspace-provider-boundary/gu)).toHaveLength(2)
  })

  it("rejects client, story, and unrelated test imports of the private server entry", () => {
    const fixtureRoot = createFixture({
      "src/app/page.tsx": `
        import { loadClinicDashboardWorkspaceInput } from "../features/clinic-dashboard/server"
        export default async function Page() { return loadClinicDashboardWorkspaceInput() }
      `,
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        "use client"
        import { loadClinicDashboardWorkspaceInput } from "../../../server"
        export function DashboardScreen() { return loadClinicDashboardWorkspaceInput() }
      `,
      "src/features/clinic-dashboard/server.ts": `
        import "server-only"
        export function loadClinicDashboardWorkspaceInput() { return { dataSource: "demo" } }
      `,
      "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.stories.tsx": `
        import { loadClinicDashboardWorkspaceInput } from "../server"
        export const Default = { loaders: [loadClinicDashboardWorkspaceInput] }
      `,
      "tests/unit/unrelated-server-import.test.ts": `
        import { loadClinicDashboardWorkspaceInput } from "../../src/features/clinic-dashboard/server"
        export const source = loadClinicDashboardWorkspaceInput
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR clinic-dashboard-server-boundary src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx",
    )
    expect(output).toContain(
      "ERROR clinic-dashboard-server-boundary src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.stories.tsx",
    )
    expect(output).toContain(
      "ERROR clinic-dashboard-server-boundary tests/unit/unrelated-server-import.test.ts",
    )
    expect(output.match(/ERROR clinic-dashboard-server-boundary/gu)).toHaveLength(3)
  })

  it("requires the private server entry to declare its server-only boundary", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/server.ts": `
        export function loadClinicDashboardWorkspaceInput() { return { dataSource: "demo" } }
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR clinic-dashboard-server-marker src/features/clinic-dashboard/server.ts")
  })

  it("rejects runtime demo imports from feature UI, controllers, stories, and tests", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx": `
        import { dataset } from "../../../demo/dataset"
        export function DashboardScreen() { return dataset }
      `,
      "src/features/clinic-dashboard/dashboard/hooks/useDashboardController.ts": `
        import { dataset } from "../../demo/dataset"
        export function useDashboardController() { return dataset }
      `,
      "src/features/clinic-dashboard/demo/dataset.ts": `
        export const dataset = { dataSource: "demo" }
      `,
      "src/features/clinic-dashboard/messages/Messages.stories.tsx": `
        import { dataset } from "../demo/dataset"
        export const Default = { args: { dataset } }
      `,
      "tests/unit/demo-data.test.ts": `
        import { dataset } from "../../src/features/clinic-dashboard/demo/dataset"
        export const source = dataset
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain(
      "ERROR runtime-demo-source-boundary src/features/clinic-dashboard/dashboard/components/organisms/DashboardScreen.tsx",
    )
    expect(output).toContain(
      "ERROR runtime-demo-source-boundary src/features/clinic-dashboard/dashboard/hooks/useDashboardController.ts",
    )
    expect(output).toContain(
      "ERROR story-testing-runtime-demo-import src/features/clinic-dashboard/messages/Messages.stories.tsx",
    )
    expect(output).toContain("ERROR story-testing-runtime-demo-import tests/unit/demo-data.test.ts")
  })

  it("rejects direct demo exports from a feature public contract", () => {
    const fixtureRoot = createFixture({
      "src/features/clinic-dashboard/demo/dataset.ts": `
        export const dataset = { dataSource: "demo" }
      `,
      "src/features/clinic-dashboard/public.ts": `
        export { dataset } from "./demo/dataset"
      `,
    })

    const result = runChecker(fixtureRoot)
    const output = combinedOutput(result)

    expect(result.status).toBe(1)
    expect(output).toContain("ERROR public-prototype-data-export src/features/clinic-dashboard/public.ts")
    expect(output).toContain("ERROR runtime-demo-source-boundary src/features/clinic-dashboard/public.ts")
  })
})
