#!/usr/bin/env node

import path from "node:path"
import ts from "typescript"
import {
  collectSourceFiles,
  createFinding,
  getCsfStoryExportNames,
  getDefaultMetaObject,
  getExportedComponentNames,
  getImportBindings,
  getModuleReferences,
  getObjectProperty,
  getStringArrayValue,
  getStringLiteralValue,
  parseSourceFile,
  toRelative,
  uniqueSortedFindings,
} from "./governance/source-analysis.mjs"

const rootDir = process.cwd()
const allowedDomains = new Set([
  "clinic-profile",
  "dashboard",
  "messages",
  "reviews",
  "shared",
  "support",
  "workspace",
])
const allowedLayers = new Set(["atom", "molecule", "organism", "page", "template"])
const allowedStatuses = new Set(["prototype", "stable"])
const atomicPathLayers = new Set(["atoms", "molecules", "organisms"])
const sharedComponentLayers = new Map([
  ["src/components/brand/BrandMark.tsx", "atom"],
  ["src/components/ui/avatar.tsx", "atom"],
  ["src/components/ui/button.tsx", "atom"],
  ["src/components/ui/card.tsx", "molecule"],
  ["src/components/ui/field.tsx", "molecule"],
  ["src/components/ui/input.tsx", "atom"],
  ["src/components/ui/modal.tsx", "molecule"],
  ["src/components/ui/page-heading.tsx", "atom"],
  ["src/components/ui/rating-stars.tsx", "atom"],
  ["src/components/ui/select.tsx", "atom"],
  ["src/components/ui/textarea.tsx", "atom"],
  ["src/components/ui/theme-toggle.tsx", "atom"],
])

function isStoryFile(file) {
  return /\.stories\.[cm]?[jt]sx?$/u.test(file)
}

function extractSingleTag(tags, prefix, allowedValues) {
  const matches = tags.filter((tag) => tag.startsWith(prefix))
  const value = matches.length === 1 ? matches[0].slice(prefix.length) : null
  return {
    matches,
    valid: value !== null && allowedValues.has(value),
    value,
  }
}

function pluralLayer(layer) {
  return {
    atom: "Atoms",
    molecule: "Molecules",
    organism: "Organisms",
    page: "Pages",
    template: "Templates",
  }[layer]
}

function parseTitleTaxonomy(title) {
  let match = title.match(/^Shared\/(Atoms|Molecules)\/[^/]+$/u)
  if (match) {
    return { domain: "shared", layer: match[1].slice(0, -1).toLowerCase(), titleArea: "Shared" }
  }

  match = title.match(
    /^Clinic Dashboard\/(Workspace|Dashboard|Messages|Reviews|Clinic Profile|Support)\/(Atoms|Molecules|Organisms|Templates)\/[^/]+$/u,
  )
  if (match) {
    const domain = {
      "Clinic Profile": "clinic-profile",
      Dashboard: "dashboard",
      Messages: "messages",
      Reviews: "reviews",
      Support: "support",
      Workspace: "workspace",
    }[match[1]]
    return {
      domain,
      layer: match[2].slice(0, -1).toLowerCase(),
      titleArea: `Clinic Dashboard/${match[1]}`,
    }
  }

  if (/^Clinic Dashboard\/Journeys\/Pages\/[^/]+$/u.test(title)) {
    return { domain: "workspace", layer: "page", titleArea: "Clinic Dashboard/Journeys" }
  }

  return null
}

function expectedTitleArea(componentPath) {
  if (/^src\/components\/(?:ui|brand)\//u.test(componentPath)) return "Shared"

  const match = componentPath.match(
    /^src\/features\/clinic-dashboard\/(workspace|prototype|dashboard|messages|reviews|clinic-profile|support)\//u,
  )
  if (!match) return null

  return {
    "clinic-profile": "Clinic Dashboard/Clinic Profile",
    dashboard: "Clinic Dashboard/Dashboard",
    messages: "Clinic Dashboard/Messages",
    prototype: "Clinic Dashboard/Workspace",
    reviews: "Clinic Dashboard/Reviews",
    support: "Clinic Dashboard/Support",
    workspace: "Clinic Dashboard/Workspace",
  }[match[1]]
}

function expectedPathLayer(componentPath) {
  const match = componentPath.match(/\/components\/(atoms|molecules|organisms)\//u)
  if (match) return match[1].slice(0, -1)

  return sharedComponentLayers.get(componentPath) ?? null
}

function featureAtomicPlacement(componentPath) {
  const match = componentPath.match(/^src\/features\/.+?\/components\/(.+)$/u)
  if (!match) return null

  const pathSegments = match[1].split("/")
  return {
    layer: pathSegments.length > 1 ? pathSegments[0] : null,
  }
}

function expectedColocatedStory(componentPath) {
  const extension = path.posix.extname(componentPath)
  return `${componentPath.slice(0, -extension.length)}.stories.tsx`
}

function requiresDirectStory(file) {
  if (/^src\/components\/(?:ui|brand)\//u.test(file)) return true
  return /^src\/features\/.+\/(?:[^/]+Screen|[^/]+Shell)\.tsx$/u.test(file)
}

function isFeaturePublicContract(file) {
  return /^src\/features\/.+\/public\.ts$/u.test(file) && !/\/testing\/public\.ts$/u.test(file)
}

function collectNamedReExports(rootDir, sourcePaths) {
  const reExports = new Map()

  for (const sourcePath of sourcePaths) {
    const file = toRelative(rootDir, sourcePath)
    const sourceFile = parseSourceFile(sourcePath)
    const importBindings = getImportBindings(rootDir, sourceFile)
    const exportReferences = new Map(
      getModuleReferences(rootDir, sourceFile)
        .filter((reference) => reference.kind === "export")
        .map((reference) => [reference.moduleSpecifier, reference.resolvedPath]),
    )

    for (const statement of sourceFile.statements) {
      if (
        !ts.isExportDeclaration(statement) ||
        statement.isTypeOnly ||
        !statement.exportClause ||
        !ts.isNamedExports(statement.exportClause)
      ) {
        continue
      }

      for (const element of statement.exportClause.elements) {
        if (element.isTypeOnly) continue

        if (statement.moduleSpecifier && ts.isStringLiteral(statement.moduleSpecifier)) {
          const resolvedPath = exportReferences.get(statement.moduleSpecifier.text)
          if (!resolvedPath) continue

          reExports.set(`${file}|${element.name.text}`, {
            importedName: element.propertyName?.text ?? element.name.text,
            resolvedPath,
          })
          continue
        }

        if (!statement.moduleSpecifier) {
          const localName = element.propertyName?.text ?? element.name.text
          const importedBinding = importBindings.get(localName)
          if (importedBinding?.resolvedPath) {
            reExports.set(`${file}|${element.name.text}`, importedBinding)
          }
        }
      }
    }
  }

  return reExports
}

function resolveReExportBinding(binding, reExports) {
  let current = binding
  const visited = new Set()

  while (current?.resolvedPath) {
    const key = `${current.resolvedPath}|${current.importedName}`
    if (visited.has(key)) break
    visited.add(key)

    const next = reExports.get(key)
    if (!next) break
    current = next
  }

  return current
}

function addDirectStoryRequirement(requirements, file, importedName, subject = importedName) {
  requirements.set(`${file}|${importedName}`, { file, importedName, subject })
}

function collectFindings() {
  const findings = []
  const sourcePaths = collectSourceFiles(rootDir)
  const storyPaths = sourcePaths.filter((filePath) => isStoryFile(toRelative(rootDir, filePath)))
  const coveredComponents = new Set()
  const directStoryRequirements = new Map()
  const reExports = collectNamedReExports(rootDir, sourcePaths)

  for (const storyPath of storyPaths) {
    const file = toRelative(rootDir, storyPath)
    const sourceFile = parseSourceFile(storyPath)
    const isJourney = file.startsWith("src/features/clinic-dashboard/journeys/")

    if (file.startsWith("src/stories/")) {
      findings.push(
        createFinding(
          "legacy-story-location",
          file,
          file,
          "Move component stories beside their component; keep only approved journeys outside components.",
        ),
      )
    }

    const meta = getDefaultMetaObject(sourceFile)
    if (!meta) {
      findings.push(
        createFinding(
          "story-meta-object",
          file,
          "default-export",
          "Use a statically analyzable typed CSF meta object as the default export.",
        ),
      )
      continue
    }

    const storyExportNames = getCsfStoryExportNames(sourceFile)
    const hasStoryExports = storyExportNames.length > 0
    if (!hasStoryExports) {
      findings.push(
        createFinding(
          "story-export",
          file,
          "named-story",
          "Story files require at least one statically analyzable CSF story object export.",
        ),
      )
    }

    const componentExpression = getObjectProperty(meta, "component")
    let componentBinding = null
    let componentName = null
    if (componentExpression && ts.isIdentifier(componentExpression)) {
      componentName = componentExpression.text
      componentBinding = getImportBindings(rootDir, sourceFile).get(componentName) ?? null
    }

    if (!componentName || !componentBinding?.resolvedPath) {
      findings.push(
        createFinding(
          "story-meta-component",
          file,
          componentName ?? "missing",
          "meta.component must reference an imported production component.",
        ),
      )
    } else {
      const resolvedComponentBinding = resolveReExportBinding(componentBinding, reExports)
      const atomicPlacement = featureAtomicPlacement(resolvedComponentBinding.resolvedPath)
      if (atomicPlacement && atomicPlacement.layer === null) {
        findings.push(
          createFinding(
            "story-component-missing-atomic-layer",
            file,
            resolvedComponentBinding.resolvedPath,
            "Story components must be placed under an atoms, molecules, or organisms directory.",
          ),
        )
      } else if (atomicPlacement && !atomicPathLayers.has(atomicPlacement.layer)) {
        findings.push(
          createFinding(
            "story-component-atomic-layer",
            file,
            atomicPlacement.layer,
            `Story components must use atoms, molecules, or organisms; ${atomicPlacement.layer} is not an allowed Atomic layer.`,
          ),
        )
      }
      if (hasStoryExports && !isJourney) {
        coveredComponents.add(
          `${resolvedComponentBinding.resolvedPath}|${resolvedComponentBinding.importedName}`,
        )
      }

      const expectedStory = expectedColocatedStory(resolvedComponentBinding.resolvedPath)
      if (!isJourney && file !== expectedStory) {
        findings.push(
          createFinding("story-colocation", file, expectedStory, `Place this story at ${expectedStory}.`),
        )
      }
    }

    const title = getStringLiteralValue(getObjectProperty(meta, "title"))
    const titleTaxonomy = title ? parseTitleTaxonomy(title) : null
    if (!title) {
      findings.push(createFinding("story-title", file, "missing", "Story meta requires a literal title."))
    } else if (!titleTaxonomy) {
      findings.push(
        createFinding(
          "story-title-taxonomy",
          file,
          title,
          "Use the approved business-area-first Storybook title hierarchy.",
        ),
      )
    }

    const tagsNode = getObjectProperty(meta, "tags")
    const tags = getStringArrayValue(tagsNode)
    if (!tags) {
      findings.push(
        createFinding(
          "story-tags-literal",
          file,
          "tags",
          "Story tags must be a literal string array for deterministic governance.",
        ),
      )
      continue
    }

    const domainTag = extractSingleTag(tags, "domain:", allowedDomains)
    const layerTag = extractSingleTag(tags, "layer:", allowedLayers)
    const statusTag = extractSingleTag(tags, "status:", allowedStatuses)
    for (const [ruleId, label, result] of [
      ["story-domain-tag", "domain", domainTag],
      ["story-layer-tag", "layer", layerTag],
      ["story-status-tag", "status", statusTag],
    ]) {
      if (!result.valid) {
        findings.push(
          createFinding(
            ruleId,
            file,
            result.matches.join(",") || "missing",
            `Story meta requires exactly one allowed ${label}:* tag.`,
          ),
        )
      }
    }

    const unknownTags = tags.filter(
      (tag) =>
        tag.includes(":") &&
        !tag.startsWith("domain:") &&
        !tag.startsWith("layer:") &&
        !tag.startsWith("status:") &&
        !tag.startsWith("used-in:"),
    )
    for (const unknownTag of unknownTags) {
      findings.push(
        createFinding("story-unknown-tag", file, unknownTag, `Unknown governed Storybook tag ${unknownTag}.`),
      )
    }

    if (titleTaxonomy && domainTag.valid && titleTaxonomy.domain !== domainTag.value) {
      findings.push(
        createFinding(
          "story-title-domain-agreement",
          file,
          `${titleTaxonomy.domain}|${domainTag.value}`,
          "The title area and domain tag disagree.",
        ),
      )
    }
    if (titleTaxonomy && layerTag.valid && titleTaxonomy.layer !== layerTag.value) {
      findings.push(
        createFinding(
          "story-title-layer-agreement",
          file,
          `${titleTaxonomy.layer}|${layerTag.value}`,
          "The title layer and layer tag disagree.",
        ),
      )
    }

    if (componentBinding?.resolvedPath) {
      const resolvedComponentBinding = resolveReExportBinding(componentBinding, reExports)
      const expectedArea = expectedTitleArea(resolvedComponentBinding.resolvedPath)
      const expectedLayer = expectedPathLayer(resolvedComponentBinding.resolvedPath)
      if (!isJourney && titleTaxonomy && expectedArea && expectedArea !== titleTaxonomy.titleArea) {
        findings.push(
          createFinding(
            "story-title-path-agreement",
            file,
            `${expectedArea}|${titleTaxonomy.titleArea}`,
            "The component owner and Storybook title area disagree.",
          ),
        )
      }
      if (isJourney && titleTaxonomy && titleTaxonomy.titleArea !== "Clinic Dashboard/Journeys") {
        findings.push(
          createFinding(
            "journey-title",
            file,
            title ?? "missing",
            "Approved journey files must use Clinic Dashboard/Journeys/Pages titles.",
          ),
        )
      }
      if (!isJourney && expectedLayer && titleTaxonomy && titleTaxonomy.layer !== expectedLayer) {
        findings.push(
          createFinding(
            "story-title-path-layer-agreement",
            file,
            `${resolvedComponentBinding.resolvedPath}|${expectedLayer}|${titleTaxonomy.layer}`,
            `The component path requires the ${pluralLayer(expectedLayer)} title layer.`,
          ),
        )
      }
      if (!isJourney && expectedLayer && layerTag.valid && layerTag.value !== expectedLayer) {
        findings.push(
          createFinding(
            "story-tag-path-layer-agreement",
            file,
            `${resolvedComponentBinding.resolvedPath}|${expectedLayer}|${layerTag.value}`,
            `The component path requires the layer:${expectedLayer} tag.`,
          ),
        )
      }
    }
  }

  for (const componentPath of sourcePaths) {
    const file = toRelative(rootDir, componentPath)
    if (isStoryFile(file)) continue

    const sourceFile = parseSourceFile(componentPath)

    if (requiresDirectStory(file)) {
      for (const componentName of getExportedComponentNames(sourceFile)) {
        addDirectStoryRequirement(directStoryRequirements, file, componentName)
      }
    }

    if (isFeaturePublicContract(file)) {
      for (const [key, binding] of reExports) {
        if (!key.startsWith(`${file}|`)) continue

        const exportedName = key.slice(file.length + 1)
        if (!/^[A-Z]/u.test(exportedName)) continue

        const resolvedBinding = resolveReExportBinding(binding, reExports)
        addDirectStoryRequirement(
          directStoryRequirements,
          resolvedBinding.resolvedPath,
          resolvedBinding.importedName,
          exportedName,
        )
      }
    }
  }

  for (const requirement of directStoryRequirements.values()) {
    if (coveredComponents.has(`${requirement.file}|${requirement.importedName}`)) continue
    findings.push(
      createFinding(
        "missing-direct-story",
        requirement.file,
        requirement.subject,
        `${requirement.subject} requires a direct component story.`,
      ),
    )
  }

  return findings
}

const findings = uniqueSortedFindings(collectFindings())

for (const finding of findings) {
  console.error(`ERROR ${finding.ruleId} ${finding.file} :: ${finding.message}`)
}

console.log(`storybook governance: ${findings.length} findings`)
if (findings.length > 0) process.exit(1)
