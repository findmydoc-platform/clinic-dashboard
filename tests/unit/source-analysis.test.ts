import path from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

// @ts-expect-error -- Governance scripts expose tested JavaScript helpers without declaration files.
import * as sourceAnalysis from "../../scripts/governance/source-analysis.mjs"

const fixtureRoot = path.join(path.sep, "tmp", "source-analysis-fixture")
const { containsReferencedIdentifier, getCsfStoryExportNames, getModuleReferences } = sourceAnalysis

type ModuleReference = Readonly<{
  kind: string
  moduleSpecifier: string
  resolvedPath: string | null
}>

function parseSource(source: string, relativePath = "src/example.ts") {
  const filePath = path.join(fixtureRoot, relativePath)
  const scriptKind = relativePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(filePath, source, ts.ScriptTarget.Latest, true, scriptKind)
}

describe("getCsfStoryExportNames", () => {
  it("returns statically declared CSF story exports", () => {
    const sourceFile = parseSource(`
      const meta = { title: "Shared/Atoms/Button" }
      export default meta
      export const Default = {}
    `)

    expect(getCsfStoryExportNames(sourceFile)).toEqual(["Default"])
  })

  it("fails closed when Object.assign mutates the exported meta", () => {
    const sourceFile = parseSource(`
      const meta = { title: "Shared/Atoms/Button" }
      Object.assign(meta, { excludeStories: ["Default"] })
      export default meta
      export const Default = {}
    `)

    expect(getCsfStoryExportNames(sourceFile)).toEqual([])
  })

  it.each(['meta.excludeStories = ["Default"]', 'meta["excludeStories"] = ["Default"]'])(
    "fails closed when a property assignment mutates the exported meta: %s",
    (mutation) => {
      const sourceFile = parseSource(`
      const meta = { title: "Shared/Atoms/Button" }
      ${mutation}
      export default meta
      export const Default = {}
    `)

      expect(getCsfStoryExportNames(sourceFile)).toEqual([])
    },
  )
})

describe("getModuleReferences", () => {
  it("collects static ESM, CommonJS, import-type, and dynamic-import references", () => {
    const sourceFile = parseSource(`
      import { value } from "./esm"
      export { value as exportedValue } from "./barrel"
      const commonJs = require("./commonjs")
      const resolved = require.resolve("./resolved")
      type Imported = import("./types").Imported
      const lazy = import("./lazy")
      void [value, commonJs, resolved, lazy]
    `)

    expect(getModuleReferences(fixtureRoot, sourceFile) as ModuleReference[]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "import", moduleSpecifier: "./esm" }),
        expect.objectContaining({ kind: "export", moduleSpecifier: "./barrel" }),
        expect.objectContaining({ kind: "require", moduleSpecifier: "./commonjs" }),
        expect.objectContaining({ kind: "require-resolve", moduleSpecifier: "./resolved" }),
        expect.objectContaining({ kind: "import-type", moduleSpecifier: "./types" }),
        expect.objectContaining({ kind: "dynamic-import", moduleSpecifier: "./lazy" }),
      ]),
    )
  })

  it("emits fail-closed markers for non-literal module references", () => {
    const sourceFile = parseSource(`
      const modulePath = "./runtime"
      require(modulePath)
      require.resolve(modulePath)
      import(modulePath)
      type Imported = import(ModulePath).Imported
    `)

    const unresolved = (getModuleReferences(fixtureRoot, sourceFile) as ModuleReference[]).filter(
      (reference) => reference.kind === "unresolved-dynamic-import",
    )

    expect(unresolved).toHaveLength(4)
    expect(unresolved.map((reference) => reference.moduleSpecifier)).toEqual([
      "<require call at line 3>",
      "<require.resolve call at line 4>",
      "<dynamic import at line 5>",
      "<import type at line 6>",
    ])
    expect(unresolved.every((reference) => reference.resolvedPath === null)).toBe(true)
  })
})

describe("containsReferencedIdentifier", () => {
  const browserGlobals = new Set(["crypto", "document", "localStorage", "sessionStorage", "window"])

  it("ignores locally bound identifiers and parameters", () => {
    const sourceFile = parseSource(`
      const window = { innerWidth: 1280 }
      function readStorage(sessionStorage: { getItem(key: string): string | null }) {
        return [window.innerWidth, sessionStorage.getItem("key")]
      }
      void readStorage
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)]).toEqual([])
  })

  it("still detects an unbound browser global outside a shadowing scope", () => {
    const sourceFile = parseSource(`
      function readWidth(window: { innerWidth: number }) {
        return window.innerWidth
      }
      export const globalWidth = window.innerWidth
      void readWidth
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)]).toEqual(["window"])
  })

  it("detects browser globals accessed through direct and transitive globalThis aliases", () => {
    const sourceFile = parseSource(`
      const browser = globalThis
      const nestedBrowser = browser
      export const width = browser.window.innerWidth
      export const stored = nestedBrowser["sessionStorage"].getItem("key")
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)].sort()).toEqual([
      "sessionStorage",
      "window",
    ])
  })

  it("does not treat shadowed globalThis or alias names as browser globals", () => {
    const sourceFile = parseSource(`
      const browser = globalThis
      function readWidth(
        browser: { window: { innerWidth: number } },
        globalThis: { localStorage: { length: number } },
      ) {
        return browser.window.innerWidth + globalThis.localStorage.length
      }
      void readWidth
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)]).toEqual([])
  })
})
