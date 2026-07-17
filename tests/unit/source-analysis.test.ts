import path from "node:path"
import ts from "typescript"
import { describe, expect, it } from "vitest"

// @ts-expect-error -- Governance scripts expose tested JavaScript helpers without declaration files.
import * as sourceAnalysis from "../../scripts/governance/source-analysis.mjs"

const fixtureRoot = path.join(path.sep, "tmp", "source-analysis-fixture")
const { containsReferencedIdentifier, getCsfStoryExportNames, getImportBindings, getModuleReferences } =
  sourceAnalysis

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

  it.each([
    'Object.assign(metaAlias, { excludeStories: ["Default"] })',
    'Reflect.set(metaAlias, "excludeStories", ["Default"])',
    'Reflect["set"](metaAlias, "excludeStories", ["Default"])',
    'Object.defineProperty(metaAlias, "excludeStories", { value: ["Default"] })',
    'Object["defineProperty"](metaAlias, "excludeStories", { value: ["Default"] })',
    'Object.defineProperties(metaAlias, { excludeStories: { value: ["Default"] } })',
    'Reflect.deleteProperty(metaAlias, "includeStories")',
    "mutate(metaAlias)",
    "new MetaMutator(metaAlias)",
    "metaAlias.hideStories()",
    'metaAlias["hideStories"]()',
  ])("fails closed when an API mutates a meta object alias: %s", (mutation) => {
    const sourceFile = parseSource(`
      const meta = { title: "Shared/Atoms/Button" }
      const metaAlias = meta
      ${mutation}
      export default meta
      export const Default = {}
    `)

    expect(getCsfStoryExportNames(sourceFile)).toEqual([])
  })

  it.each([
    ["property alias", 'const hidden = meta.excludeStories; hidden.push("Default")'],
    ["element alias", 'const hidden = meta["excludeStories"]; hidden.push("Default")'],
    ["renamed binding", 'const { excludeStories: hidden } = meta; hidden.push("Default")'],
    ["nested binding", 'const { nested: { filters: hidden } } = meta; hidden.push("Default")'],
    ["nested rest binding", "const { nested: { ...hidden } } = meta; mutate(hidden)"],
    ["root rest binding", "const { ...hidden } = meta; new MetaMutator(hidden)"],
  ])("fails closed for a meta-derived %s", (_kind, mutation) => {
    const sourceFile = parseSource(`
      const meta = {
        excludeStories: [],
        nested: { filters: [] },
        title: "Shared/Atoms/Button",
      }
      ${mutation}
      export default meta
      export const Default = {}
    `)

    expect(getCsfStoryExportNames(sourceFile)).toEqual([])
  })

  it("ignores mutations of unrelated aliases and shadowed meta bindings", () => {
    const sourceFile = parseSource(`
      const meta = { title: "Shared/Atoms/Button" }
      const unrelated = { excludeStories: [] }
      const unrelatedAlias = unrelated
      const unrelatedProperty = unrelated.excludeStories
      const { excludeStories: unrelatedBinding } = unrelated
      Object.assign(unrelatedAlias, { excludeStories: ["Default"] })
      unrelatedProperty.push("Default")
      unrelatedBinding.push("Default")
      unrelatedAlias.hideStories?.()
      function mutate(meta: Record<string, unknown>) {
        const property = meta.excludeStories as string[]
        property.push("Default")
        Reflect.set(meta, "excludeStories", ["Default"])
      }
      export default meta
      export const Default = {}
      void mutate
    `)

    expect(getCsfStoryExportNames(sourceFile)).toEqual(["Default"])
  })
})

describe("getModuleReferences", () => {
  it("collects static ESM, CommonJS, import-type, and dynamic-import references", () => {
    const sourceFile = parseSource(`
      import { value } from "./esm"
      export { value as exportedValue } from "./barrel"
      const commonJs = require("./commonjs")
      const resolved = require.resolve("./resolved")
      import imported = require("./imported")
      type Imported = import("./types").Imported
      const lazy = import("./lazy")
      void [value, commonJs, resolved, imported, lazy]
    `)

    expect(getModuleReferences(fixtureRoot, sourceFile) as ModuleReference[]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "import", moduleSpecifier: "./esm" }),
        expect.objectContaining({ kind: "export", moduleSpecifier: "./barrel" }),
        expect.objectContaining({ kind: "require", moduleSpecifier: "./commonjs" }),
        expect.objectContaining({ kind: "require-resolve", moduleSpecifier: "./resolved" }),
        expect.objectContaining({ kind: "import-equals", moduleSpecifier: "./imported" }),
        expect.objectContaining({ kind: "import-type", moduleSpecifier: "./types" }),
        expect.objectContaining({ kind: "dynamic-import", moduleSpecifier: "./lazy" }),
      ]),
    )
  })

  it("collects transitive require aliases and computed require.resolve calls", () => {
    const sourceFile = parseSource(`
      const load = require
      const nestedLoad = load
      const resolve = require["resolve"]
      const { resolve: destructuredResolve } = nestedLoad
      const loaded = nestedLoad("./aliased")
      const resolved = resolve("./computed-resolve")
      const destructured = destructuredResolve("./destructured-resolve")
      const directResolved = require["resolve"]("./direct-computed-resolve")
      void [loaded, resolved, destructured, directResolved]
    `)

    expect(getModuleReferences(fixtureRoot, sourceFile) as ModuleReference[]).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: "require", moduleSpecifier: "./aliased" }),
        expect.objectContaining({ kind: "require-resolve", moduleSpecifier: "./computed-resolve" }),
        expect.objectContaining({
          kind: "require-resolve",
          moduleSpecifier: "./destructured-resolve",
        }),
        expect.objectContaining({
          kind: "require-resolve",
          moduleSpecifier: "./direct-computed-resolve",
        }),
      ]),
    )
  })

  it("ignores locally bound require callables", () => {
    const sourceFile = parseSource(`
      function loadLocal(require: (modulePath: string) => unknown) {
        const load = require
        const { resolve: localResolve } = require
        return [
          require("./local"),
          load("./local-alias"),
          require.resolve?.("./local-resolve"),
          localResolve("./local-destructured-resolve"),
        ]
      }
      void loadLocal
    `)

    expect(getModuleReferences(fixtureRoot, sourceFile)).toEqual([])
  })

  it("fails closed for non-literal require aliases and import-equals declarations", () => {
    const sourceFile = parseSource(`
      const modulePath = "./runtime"
      const load = require
      const resolve = require["resolve"]
      load(modulePath)
      resolve(modulePath)
      import imported = require(ModulePath)
      void imported
    `)

    const unresolved = (getModuleReferences(fixtureRoot, sourceFile) as ModuleReference[]).filter(
      (reference) => reference.kind === "unresolved-dynamic-import",
    )

    expect(unresolved.map((reference) => reference.moduleSpecifier)).toEqual([
      "<require call at line 5>",
      "<require.resolve call at line 6>",
      "<import equals declaration at line 7>",
    ])
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

describe("getImportBindings", () => {
  it("collects namespace imports with their resolved module path", () => {
    const sourceFile = parseSource(`
      import * as Screens from "./screens"
      void Screens
    `)

    expect(getImportBindings(fixtureRoot, sourceFile).get("Screens")).toEqual({
      importedName: "*",
      moduleSpecifier: "./screens",
      resolvedPath: "src/screens",
    })
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

  it("resolves computed browser-global keys through const alias chains", () => {
    const sourceFile = parseSource(`
      const storageKey = "localStorage" as const
      const storageAlias = storageKey
      const windowKey = "window"
      const windowAlias = windowKey
      const browser = globalThis
      export const stored = browser[storageAlias].getItem("key")
      export const width = globalThis[windowAlias].innerWidth
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)].sort()).toEqual([
      "localStorage",
      "window",
    ])
  })

  it("fails closed for an unknown computed key on globalThis", () => {
    const sourceFile = parseSource(`
      export function readBrowserGlobal(key: string) {
        return globalThis[key]
      }
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)].sort()).toEqual([
      "crypto",
      "document",
      "localStorage",
      "sessionStorage",
      "window",
    ])
  })

  it("allows statically non-browser keys and computed access on shadowed globalThis", () => {
    const sourceFile = parseSource(`
      const localStorage = "navigator" as const
      const navigatorAlias = localStorage
      export const navigatorValue = globalThis[navigatorAlias]
      function readLocal(
        globalThis: Record<string, unknown>,
        key: "localStorage",
      ) {
        return globalThis[key]
      }
      void readLocal
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)]).toEqual([])
  })

  it("reports original browser-global names through destructuring and transitive local aliases", () => {
    const sourceFile = parseSource(`
      const browser = globalThis
      const nestedBrowser = browser
      const {
        window: { location: browserLocation },
        localStorage: { getItem: readStorage },
      } = nestedBrowser
      const location = browserLocation
      const read = readStorage
      export const href = location.href
      export const stored = read("key")
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)].sort()).toEqual([
      "localStorage",
      "window",
    ])
  })

  it("treats a globalThis rest binding and its aliases conservatively as globalThis", () => {
    const sourceFile = parseSource(`
      const { crypto: ignoredCrypto, ...browserRest } = globalThis
      const nestedRest = browserRest
      export const width = nestedRest.window.innerWidth
      void ignoredCrypto
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)].sort()).toEqual(["crypto", "window"])
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

  it("allows destructuring from a shadowed globalThis parameter", () => {
    const sourceFile = parseSource(`
      function readWidth(globalThis: {
        window: { viewport: { innerWidth: number } }
        localStorage: { length: number }
      }) {
        const {
          window: { viewport: { innerWidth } },
          localStorage: storage,
          ...browserRest
        } = globalThis
        return innerWidth + storage.length + browserRest.window.viewport.innerWidth
      }
      void readWidth
    `)

    expect([...containsReferencedIdentifier(sourceFile, browserGlobals)]).toEqual([])
  })
})
