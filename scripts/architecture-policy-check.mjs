#!/usr/bin/env node

import path from "node:path"
import {
  collectSourceFiles,
  containsReferencedIdentifier,
  createFinding,
  getModuleReferences,
  hasWildcardExport,
  parseSourceFile,
  toRelative,
  uniqueSortedFindings,
} from "./governance/source-analysis.mjs"

const rootDir = process.cwd()
const browserGlobals = new Set(["crypto", "document", "localStorage", "sessionStorage", "window"])

function importTarget(reference) {
  return reference.resolvedPath ?? reference.moduleSpecifier
}

function isFixtureImport(reference) {
  const target = importTarget(reference)
  return /(?:^|\/)(?:fixtures|testing)(?:\/|$)|\.fixtures(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isPrototypeDataImport(reference) {
  const target = importTarget(reference)
  return /(?:^|\/)(?:[^/]+\.prototype-data|prototype-data-source)(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isRuntimePrototypeCommandImport(reference) {
  const target = importTarget(reference)
  return /(?:^|\/)(?:[^/]+\.)?prototype-commands(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isTestOnlyImport(reference) {
  const target = importTarget(reference)
  return /(?:^|\/)(?:fixtures|testing)(?:\/|$)|\.fixtures(?:\.|$)|\.stories(?:\.|$)|^(?:@storybook|storybook\/)/u.test(
    target,
  )
}

function isFrameworkOrUiImport(reference) {
  const target = importTarget(reference)
  return /^(?:react|next)(?:\/|$)|(?:^|\/)components(?:\/|$)|(?:^|\/)providers(?:\/|$)|(?:^|\/)hooks(?:\/|$)/u.test(
    target,
  )
}

function getFeatureArea(file) {
  const match = file.match(/^src\/features\/clinic-dashboard\/([^/]+)\//u)
  return match?.[1] ?? null
}

function atomicLayer(file) {
  const match = file.match(/\/components\/(atoms|molecules|organisms)\//u)
  return match?.[1] ?? null
}

function isPublicContract(reference) {
  return /(?:^|\/)public(?:\.[cm]?[jt]sx?)?$/u.test(importTarget(reference))
}

function isClinicDashboardRootPublic(reference) {
  return importTarget(reference) === "src/features/clinic-dashboard/public.ts"
}

function isStoryOrTestingSource(file) {
  return (
    /^tests\//u.test(file) ||
    /\.(?:stories|test|spec)\.[cm]?[jt]sx?$/u.test(file) ||
    /(?:^|\/)(?:testing|fixtures)(?:\/|$)/u.test(file)
  )
}

function isProductionSource(file) {
  return !isStoryOrTestingSource(file)
}

function isFeatureUiSource(file) {
  return isProductionSource(file) && /^src\/features\/.+\/components\//u.test(file)
}

function isRenderBoundarySource(file) {
  return isProductionSource(file) && /(?:Shell|Screen|View)\.[cm]?[jt]sx?$/u.test(file)
}

function isFeaturePublicContractFile(file) {
  return /^src\/features\/.+\/public\.[cm]?[jt]sx?$/u.test(file)
}

function isWorkspaceCompositionSource(file) {
  return /^src\/features\/clinic-dashboard\/workspace\/ClinicDashboardWorkspace\.[cm]?[jt]sx?$/u.test(file)
}

function isPrototypeDataMapperSource(file) {
  return /\.prototype-data\.mapper\.[cm]?[jt]s$/u.test(file)
}

function isPrototypeDataMapperImport(reference) {
  return /\.prototype-data\.mapper(?:\.[cm]?[jt]s)?$/u.test(importTarget(reference))
}

function isPrototypeModeSwitch(reference) {
  return /(?:^|\/)prototype\/components\/molecules\/PrototypeModeSwitch(?:\.[cm]?[jt]sx?)?$/u.test(
    importTarget(reference),
  )
}

function isSameAreaPrototypeDataMapperImport(file, reference) {
  return (
    isPrototypeDataMapperSource(file) &&
    isPrototypeDataImport(reference) &&
    getFeatureArea(file) === getFeatureArea(importTarget(reference))
  )
}

function isAllowedPrivateCompositionImport(file, reference) {
  if (isSameAreaPrototypeDataMapperImport(file, reference)) return true

  return (
    isWorkspaceCompositionSource(file) &&
    (isPrototypeDataImport(reference) ||
      isPrototypeDataMapperImport(reference) ||
      isRuntimePrototypeCommandImport(reference) ||
      isPrototypeModeSwitch(reference))
  )
}

function collectFindings() {
  const findings = []

  for (const filePath of collectSourceFiles(rootDir, ["src", "tests"])) {
    const file = toRelative(rootDir, filePath)
    const sourceFile = parseSourceFile(filePath)
    const references = getModuleReferences(rootDir, sourceFile)

    if (/^src\/components\/(?:atoms|molecules|organisms|templates)\//u.test(file)) {
      findings.push(
        createFinding(
          "legacy-component-location",
          file,
          file,
          "Move this component to feature ownership or domain-neutral shared UI; do not add peers here.",
        ),
      )
    }

    if (
      /^src\/features\//u.test(file) &&
      /(?:^|\/)(?:Helpers|Utils|Primitives|Common|Misc)\.[cm]?[jt]sx?$/iu.test(file)
    ) {
      findings.push(
        createFinding(
          "forbidden-catchall-name",
          file,
          path.basename(file),
          "Name the concrete business or UI responsibility instead of a catch-all file.",
        ),
      )
    }

    if (/\/public\.[cm]?[jt]sx?$/u.test(file) && hasWildcardExport(sourceFile)) {
      findings.push(
        createFinding(
          "wildcard-public-export",
          file,
          "export-star",
          "Feature public contracts must use explicit named exports.",
        ),
      )
    }

    if (/^src\/features\/.+\/model\//u.test(file)) {
      for (const globalName of containsReferencedIdentifier(sourceFile, browserGlobals)) {
        findings.push(
          createFinding(
            "model-browser-global",
            file,
            globalName,
            `Pure model code must not reference ${globalName}.`,
          ),
        )
      }
    }

    for (const reference of references) {
      const target = importTarget(reference)
      const prototypeDataImport = isPrototypeDataImport(reference)
      const runtimePrototypeCommandImport = isRuntimePrototypeCommandImport(reference)
      const sourceArea = getFeatureArea(file)
      const targetArea = getFeatureArea(target)
      const sourceLayer = atomicLayer(file)
      const targetLayer = atomicLayer(target)

      if (isProductionSource(file) && sourceArea && isClinicDashboardRootPublic(reference)) {
        findings.push(
          createFinding(
            "feature-root-public-back-import",
            file,
            reference.moduleSpecifier,
            "Feature production internals must import local or sibling contracts directly, not back-import the Clinic Dashboard root public contract.",
          ),
        )
      }

      if (
        isProductionSource(file) &&
        sourceArea &&
        !isFeaturePublicContractFile(file) &&
        targetArea === sourceArea &&
        isPublicContract(reference)
      ) {
        findings.push(
          createFinding(
            "feature-same-area-public-import",
            file,
            reference.moduleSpecifier,
            "Feature production internals must import same-area dependencies directly, not through their area's public.ts contract.",
          ),
        )
      }

      if (isStoryOrTestingSource(file) && (prototypeDataImport || runtimePrototypeCommandImport)) {
        findings.push(
          createFinding(
            "story-testing-runtime-prototype-import",
            file,
            reference.moduleSpecifier,
            "Stories and tests must use independent fixtures and command fakes, not runtime prototype sources.",
          ),
        )
      } else if (isFeaturePublicContractFile(file) && reference.kind === "export" && prototypeDataImport) {
        findings.push(
          createFinding(
            "public-prototype-data-export",
            file,
            reference.moduleSpecifier,
            "Feature public contracts must not expose composition-only runtime prototype data.",
          ),
        )
      } else if (prototypeDataImport && isFeatureUiSource(file)) {
        findings.push(
          createFinding(
            "feature-ui-runtime-data-import",
            file,
            reference.moduleSpecifier,
            "Feature UI must receive render-ready inputs instead of runtime prototype data.",
          ),
        )
      } else if (prototypeDataImport && isRenderBoundarySource(file)) {
        findings.push(
          createFinding(
            "render-boundary-runtime-data-import",
            file,
            reference.moduleSpecifier,
            "Shells, screens, and views must receive mapped props rather than runtime prototype data.",
          ),
        )
      } else if (
        prototypeDataImport &&
        !isWorkspaceCompositionSource(file) &&
        !isSameAreaPrototypeDataMapperImport(file, reference)
      ) {
        findings.push(
          createFinding(
            "runtime-prototype-data-boundary",
            file,
            reference.moduleSpecifier,
            "Runtime prototype data may be imported only by the workspace composition root or its same-feature prototype-data mapper.",
          ),
        )
      }

      if (
        !isStoryOrTestingSource(file) &&
        runtimePrototypeCommandImport &&
        (isFeatureUiSource(file) || isRenderBoundarySource(file))
      ) {
        findings.push(
          createFinding(
            "render-boundary-runtime-command-import",
            file,
            reference.moduleSpecifier,
            "Feature UI, shells, screens, and views must receive command contracts rather than runtime command implementations.",
          ),
        )
      } else if (
        !isStoryOrTestingSource(file) &&
        runtimePrototypeCommandImport &&
        !isWorkspaceCompositionSource(file)
      ) {
        findings.push(
          createFinding(
            "runtime-prototype-command-boundary",
            file,
            reference.moduleSpecifier,
            "Runtime prototype commands may be imported only by the workspace composition root.",
          ),
        )
      }

      if (isProductionSource(file) && isTestOnlyImport(reference)) {
        findings.push(
          createFinding(
            "production-test-import",
            file,
            reference.moduleSpecifier,
            `Production code must not import test or Storybook source (${reference.moduleSpecifier}).`,
          ),
        )
      }

      if (
        /^src\/components\/ui\//u.test(file) &&
        (/(?:^|\/)(?:features|app)(?:\/|$)/u.test(target) ||
          isFixtureImport(reference) ||
          prototypeDataImport ||
          runtimePrototypeCommandImport)
      ) {
        findings.push(
          createFinding(
            "shared-ui-domain-import",
            file,
            reference.moduleSpecifier,
            "Shared UI must remain domain-neutral.",
          ),
        )
      }

      if (/^src\/features\/.+\/model\//u.test(file) && isFrameworkOrUiImport(reference)) {
        findings.push(
          createFinding(
            "model-framework-import",
            file,
            reference.moduleSpecifier,
            "Pure model code must not import React, Next.js, UI, providers, or hooks.",
          ),
        )
      }

      if (/^src\/providers\//u.test(file) && /(?:^|\/)features(?:\/|$)/u.test(target)) {
        findings.push(
          createFinding(
            "provider-feature-import",
            file,
            reference.moduleSpecifier,
            "Domain-neutral providers must not depend on feature behavior.",
          ),
        )
      }

      if (
        /^src\/app\//u.test(file) &&
        /(?:^|\/)features(?:\/|$)/u.test(target) &&
        target !== "src/features/clinic-dashboard/public.ts"
      ) {
        findings.push(
          createFinding(
            "app-feature-internal-import",
            file,
            reference.moduleSpecifier,
            "App routes may import only the Clinic Dashboard public contract.",
          ),
        )
      }

      if (
        sourceArea &&
        targetArea &&
        sourceArea !== targetArea &&
        !isPublicContract(reference) &&
        !isAllowedPrivateCompositionImport(file, reference) &&
        !prototypeDataImport &&
        !runtimePrototypeCommandImport
      ) {
        findings.push(
          createFinding(
            "cross-area-private-import",
            file,
            reference.moduleSpecifier,
            `Cross-area import ${reference.moduleSpecifier} must use the sibling area's explicit public.ts contract.`,
          ),
        )
      }

      const rank = { atoms: 0, molecules: 1, organisms: 2 }
      if (sourceLayer && targetLayer && rank[targetLayer] > rank[sourceLayer]) {
        findings.push(
          createFinding(
            "atomic-upward-import",
            file,
            reference.moduleSpecifier,
            `${sourceLayer} must not import the higher ${targetLayer} layer.`,
          ),
        )
      }

      if (
        /(?:\/adapters\/|(?:browser-session|storage|adapter)\.[cm]?[jt]s$)/u.test(file) &&
        /^(?:react|next)(?:\/|$)|(?:^|\/)components(?:\/|$)|^(?:@storybook|storybook\/)/u.test(target)
      ) {
        findings.push(
          createFinding(
            "adapter-ui-import",
            file,
            reference.moduleSpecifier,
            "Adapters must not import React components, Next.js UI, or Storybook.",
          ),
        )
      }
    }
  }

  return findings
}

const findings = uniqueSortedFindings(collectFindings())

for (const finding of findings) {
  console.error(`ERROR ${finding.ruleId} ${finding.file} :: ${finding.message}`)
}

console.log(`architecture governance: ${findings.length} findings`)
if (findings.length > 0) process.exit(1)
