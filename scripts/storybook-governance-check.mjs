#!/usr/bin/env node

import fs from "node:fs"
import path from "node:path"
import ts from "typescript"
import {
  collectSourceFiles,
  createBindingMutationDetector,
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
  ["src/components/ui/dropdown-menu.tsx", "molecule"],
  ["src/components/ui/field.tsx", "molecule"],
  ["src/components/ui/input.tsx", "atom"],
  ["src/components/ui/modal.tsx", "molecule"],
  ["src/components/ui/page-heading.tsx", "atom"],
  ["src/components/ui/rating-stars.tsx", "atom"],
  ["src/components/ui/select.tsx", "atom"],
  ["src/components/ui/textarea.tsx", "atom"],
  ["src/components/ui/theme-toggle.tsx", "atom"],
])
const featureRootComponentLayers = new Map([
  ["src/features/clinic-dashboard/clinic-profile/ClinicProfile.tsx", "organism"],
  ["src/features/clinic-dashboard/reviews/Reviews.tsx", "organism"],
  ["src/features/clinic-dashboard/workspace/ClinicDashboardShell.tsx", "template"],
  ["src/features/clinic-dashboard/workspace/ClinicDashboardWorkspace.tsx", "page"],
])
const nonAtomicFeatureRootComponents = new Set([
  "src/features/clinic-dashboard/workspace/ClinicDashboardWorkspaceComposition.tsx",
])
const requiredStoryGlob = "../src/**/*.stories.@(ts|tsx)"

function isStoryFile(file) {
  return /\.stories\.[cm]?[jt]sx?$/u.test(file)
}

function isApprovedJourneyStory(file) {
  return /^src\/features\/clinic-dashboard\/journeys\/[^/]+\.stories\.tsx$/u.test(file)
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
    /^Clinic Dashboard\/(Workspace|Dashboard|Messages|Reviews|Clinic Profile|Support)\/(Atoms|Molecules|Organisms|Pages|Templates)\/[^/]+$/u,
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

  return sharedComponentLayers.get(componentPath) ?? featureRootComponentLayers.get(componentPath) ?? null
}

function isFeatureComponentSource(file) {
  return /^src\/features\/clinic-dashboard\/.+\.tsx$/u.test(file)
}

function isTestOnlyFeatureSource(file) {
  return (
    /\/(?:__tests__|fixtures|test|tests|testing)\//u.test(file) ||
    /\.(?:fixture|fixtures|spec|test)\.tsx$/u.test(file)
  )
}

function isNonVisualFeatureTsx(file) {
  return /\/(?:hooks|model)\/.+\.tsx$/u.test(file)
}

function hasApprovedFeatureComponentPlacement(file) {
  if (featureRootComponentLayers.has(file) || nonAtomicFeatureRootComponents.has(file)) return true

  const placement = featureAtomicPlacement(file)
  return placement !== null && placement.layer !== null && atomicPathLayers.has(placement.layer)
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

function unwrapStaticExpression(expression) {
  let current = expression

  while (
    ts.isParenthesizedExpression(current) ||
    ts.isAsExpression(current) ||
    ts.isSatisfiesExpression(current) ||
    ts.isTypeAssertionExpression(current)
  ) {
    current = current.expression
  }

  return current
}

function staticPropertyName(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }

  if (ts.isComputedPropertyName(name)) {
    const expression = unwrapStaticExpression(name.expression)
    if (ts.isStringLiteral(expression) || ts.isNoSubstitutionTemplateLiteral(expression)) {
      return expression.text
    }
  }

  return null
}

function getDefaultExportBindingName(sourceFile) {
  const exportAssignment = sourceFile.statements.find(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
  )
  if (!exportAssignment || !ts.isExportAssignment(exportAssignment)) return null

  const expression = unwrapStaticExpression(exportAssignment.expression)
  return ts.isIdentifier(expression) ? expression.text : null
}

function hasAmbiguousConfigShape(objectLiteral) {
  const propertyNames = new Set()

  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) return true

    const propertyName = staticPropertyName(property.name)
    if (propertyName === null || propertyNames.has(propertyName)) return true
    propertyNames.add(propertyName)

    const initializer = unwrapStaticExpression(property.initializer)
    if (ts.isObjectLiteralExpression(initializer) && hasAmbiguousConfigShape(initializer)) return true
    if (ts.isArrayLiteralExpression(initializer) && hasAmbiguousConfigArray(initializer)) return true
  }

  return false
}

function hasAmbiguousConfigArray(arrayLiteral) {
  for (const element of arrayLiteral.elements) {
    if (ts.isSpreadElement(element)) return true

    const value = unwrapStaticExpression(element)
    if (ts.isObjectLiteralExpression(value) && hasAmbiguousConfigShape(value)) return true
    if (ts.isArrayLiteralExpression(value) && hasAmbiguousConfigArray(value)) return true
  }

  return false
}

function collectLocalObjectBindings(sourceFile) {
  const bindings = new Map()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue
      const initializer = unwrapStaticExpression(declaration.initializer)
      if (ts.isObjectLiteralExpression(initializer)) {
        bindings.set(declaration.name.text, initializer)
      }
    }
  }

  return bindings
}

function resolveEffectiveObjectProperties(expression, objectBindings, usedBindings, visited = new Set()) {
  const current = unwrapStaticExpression(expression)
  let objectLiteral = null
  let bindingName = null

  if (ts.isObjectLiteralExpression(current)) {
    objectLiteral = current
  } else if (ts.isIdentifier(current)) {
    bindingName = current.text
    objectLiteral = objectBindings.get(bindingName) ?? null
    if (!objectLiteral || visited.has(bindingName)) return null
    usedBindings.add(bindingName)
  }

  if (!objectLiteral) return null

  const nextVisited = new Set(visited)
  if (bindingName) nextVisited.add(bindingName)
  const properties = new Map()

  for (const property of objectLiteral.properties) {
    if (ts.isSpreadAssignment(property)) {
      const spreadProperties = resolveEffectiveObjectProperties(
        property.expression,
        objectBindings,
        usedBindings,
        nextVisited,
      )
      if (!spreadProperties) return null
      for (const [name, value] of spreadProperties) properties.set(name, value)
      continue
    }

    const propertyName = property.name ? staticPropertyName(property.name) : null
    if (propertyName === null) return null

    if (ts.isPropertyAssignment(property)) {
      properties.set(propertyName, unwrapStaticExpression(property.initializer))
      continue
    }

    if (ts.isShorthandPropertyAssignment(property)) {
      const shorthandValue = objectBindings.get(property.name.text)
      if (!shorthandValue) return null
      usedBindings.add(property.name.text)
      properties.set(propertyName, shorthandValue)
      continue
    }

    properties.set(propertyName, property)
  }

  return properties
}

function collectExportedStoryBindings(sourceFile, storyExportNames) {
  const localByExportedName = new Map()

  for (const statement of sourceFile.statements) {
    if (
      ts.isVariableStatement(statement) &&
      statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) {
          localByExportedName.set(declaration.name.text, declaration.name.text)
        }
      }
      continue
    }

    if (
      !ts.isExportDeclaration(statement) ||
      statement.isTypeOnly ||
      statement.moduleSpecifier ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      continue
    }

    for (const element of statement.exportClause.elements) {
      if (element.isTypeOnly) continue
      localByExportedName.set(element.name.text, element.propertyName?.text ?? element.name.text)
    }
  }

  return storyExportNames.flatMap((exportedName) => {
    const localName = localByExportedName.get(exportedName)
    return localName ? [{ exportedName, localName }] : []
  })
}

function collectStoryPolicyFindings(file, sourceFile, meta, storyExportNames, isJourney) {
  const findings = []
  const objectBindings = collectLocalObjectBindings(sourceFile)
  const hasBindingMutation = createBindingMutationDetector(sourceFile)

  const inspectObject = (subject, expression, rootBindingName = null) => {
    const usedBindings = new Set(rootBindingName ? [rootBindingName] : [])
    const properties = resolveEffectiveObjectProperties(expression, objectBindings, usedBindings)
    if (!properties || [...usedBindings].some((bindingName) => hasBindingMutation(bindingName))) {
      findings.push(
        createFinding(
          "story-policy-static",
          file,
          subject,
          `${subject} must remain statically analyzable and immutable so accessibility and Autodocs cannot be overridden indirectly.`,
        ),
      )
      return
    }

    const tagsExpression = properties.get("tags")
    if (tagsExpression) {
      const tags = getStringArrayValue(tagsExpression)
      if (!tags) {
        findings.push(
          createFinding(
            "story-policy-static",
            file,
            `${subject}:tags`,
            `${subject} tags must be a literal string array so Autodocs policy stays verifiable.`,
          ),
        )
      } else if (tags.includes("!autodocs") && !isJourney) {
        findings.push(
          createFinding(
            "story-autodocs-policy",
            file,
            subject,
            "Only explicitly located journey stories may opt out of global Autodocs.",
          ),
        )
      }
    }

    const parametersExpression = properties.get("parameters")
    if (!parametersExpression) return

    const parameterBindings = new Set()
    const parameters = resolveEffectiveObjectProperties(
      parametersExpression,
      objectBindings,
      parameterBindings,
    )
    if (!parameters || [...parameterBindings].some((bindingName) => hasBindingMutation(bindingName))) {
      findings.push(
        createFinding(
          "story-policy-static",
          file,
          `${subject}:parameters`,
          `${subject} parameters must be statically analyzable and immutable.`,
        ),
      )
      return
    }

    const a11yExpression = parameters.get("a11y")
    if (!a11yExpression) return

    const a11yBindings = new Set()
    const a11y = resolveEffectiveObjectProperties(a11yExpression, objectBindings, a11yBindings)
    if (!a11y || [...a11yBindings].some((bindingName) => hasBindingMutation(bindingName))) {
      findings.push(
        createFinding(
          "story-policy-static",
          file,
          `${subject}:a11y`,
          `${subject} accessibility parameters must be statically analyzable and immutable.`,
        ),
      )
      return
    }

    const disabled = a11y.get("disable")
    if (disabled && disabled.kind !== ts.SyntaxKind.FalseKeyword) {
      findings.push(
        createFinding(
          "story-a11y-policy",
          file,
          `${subject}:disable`,
          "Stories must not disable the globally enforced accessibility test.",
        ),
      )
    }

    const test = a11y.get("test")
    if (test && getStringLiteralValue(test) !== "error") {
      findings.push(
        createFinding(
          "story-a11y-policy",
          file,
          `${subject}:test`,
          'Story accessibility overrides must keep test: "error".',
        ),
      )
    }
  }

  inspectObject("Story meta", meta, getDefaultExportBindingName(sourceFile))

  for (const { exportedName, localName } of collectExportedStoryBindings(sourceFile, storyExportNames)) {
    const storyObject = objectBindings.get(localName)
    if (storyObject) inspectObject(`Story export ${exportedName}`, storyObject, localName)
  }

  return findings
}

function collectBindingIdentifierNames(name) {
  if (ts.isIdentifier(name)) return [name.text]

  return name.elements.flatMap((element) =>
    ts.isOmittedExpression(element) ? [] : collectBindingIdentifierNames(element.name),
  )
}

function resolveLocalBindingExpression(expression, localBindings) {
  const current = unwrapStaticExpression(expression)

  if (ts.isIdentifier(current)) return localBindings.get(current.text) ?? null

  let owner = null
  let importedName = null
  if (ts.isPropertyAccessExpression(current)) {
    owner = current.expression
    importedName = current.name.text
  } else if (ts.isElementAccessExpression(current) && current.argumentExpression) {
    owner = current.expression
    const argument = unwrapStaticExpression(current.argumentExpression)
    importedName =
      ts.isStringLiteral(argument) || ts.isNoSubstitutionTemplateLiteral(argument) ? argument.text : null
  }

  if (!owner || importedName === null) return null

  const namespaceBinding = resolveLocalBindingExpression(owner, localBindings)
  if (namespaceBinding?.importedName !== "*") return null

  return { ...namespaceBinding, importedName }
}

function collectLocalAliasBindings(sourceFile, importBindings) {
  const localBindings = new Map(importBindings)
  const identifierAliases = []
  const namespaceDestructuringAliases = []

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (!declaration.initializer) continue

      if (ts.isIdentifier(declaration.name)) {
        identifierAliases.push({ expression: declaration.initializer, localName: declaration.name.text })
      } else if (ts.isObjectBindingPattern(declaration.name)) {
        namespaceDestructuringAliases.push({
          expression: declaration.initializer,
          pattern: declaration.name,
        })
      }
    }
  }

  let discoveredAlias = true
  while (discoveredAlias) {
    discoveredAlias = false

    for (const alias of identifierAliases) {
      if (localBindings.has(alias.localName)) continue

      const binding = resolveLocalBindingExpression(alias.expression, localBindings)
      if (!binding) continue

      localBindings.set(alias.localName, binding)
      discoveredAlias = true
    }

    for (const alias of namespaceDestructuringAliases) {
      const namespaceBinding = resolveLocalBindingExpression(alias.expression, localBindings)
      if (namespaceBinding?.importedName !== "*") continue

      for (const element of alias.pattern.elements) {
        if (element.dotDotDotToken || !ts.isIdentifier(element.name)) continue

        const importedName = staticPropertyName(element.propertyName ?? element.name)
        if (importedName === null || localBindings.has(element.name.text)) continue

        localBindings.set(element.name.text, { ...namespaceBinding, importedName })
        discoveredAlias = true
      }
    }
  }

  return localBindings
}

function collectNamedReExports(rootDir, sourcePaths) {
  const reExports = new Map()

  for (const sourcePath of sourcePaths) {
    const file = toRelative(rootDir, sourcePath)
    const sourceFile = parseSourceFile(sourcePath)
    const importBindings = getImportBindings(rootDir, sourceFile)
    const localBindings = collectLocalAliasBindings(sourceFile, importBindings)
    const exportReferences = new Map(
      getModuleReferences(rootDir, sourceFile)
        .filter((reference) => reference.kind === "export")
        .map((reference) => [reference.moduleSpecifier, reference.resolvedPath]),
    )

    for (const statement of sourceFile.statements) {
      if (ts.isExportAssignment(statement) && !statement.isExportEquals) {
        const binding = resolveLocalBindingExpression(statement.expression, localBindings)
        if (binding?.resolvedPath) {
          reExports.set(`${file}|default`, binding)
        }
        continue
      }

      if (
        ts.isVariableStatement(statement) &&
        statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
      ) {
        for (const declaration of statement.declarationList.declarations) {
          for (const localName of collectBindingIdentifierNames(declaration.name)) {
            const binding = localBindings.get(localName)
            if (binding?.resolvedPath) {
              reExports.set(`${file}|${localName}`, binding)
            }
          }
        }
        continue
      }

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
          const binding = localBindings.get(localName)
          if (binding?.resolvedPath) {
            reExports.set(`${file}|${element.name.text}`, binding)
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

function collectStorybookConfigFindings() {
  const findings = []
  const mainFile = ".storybook/main.ts"
  const previewFile = ".storybook/preview.ts"
  const mainPath = path.join(rootDir, mainFile)
  const previewPath = path.join(rootDir, previewFile)

  if (!fs.existsSync(mainPath)) {
    findings.push(
      createFinding(
        "storybook-main-config",
        mainFile,
        "missing",
        "Storybook requires a statically analyzable .storybook/main.ts contract.",
      ),
    )
  } else {
    const mainSourceFile = parseSourceFile(mainPath)
    const mainConfig = getDefaultMetaObject(mainSourceFile)
    if (!mainConfig) {
      findings.push(
        createFinding(
          "storybook-main-config",
          mainFile,
          "default-export",
          "Export the Storybook main configuration as a statically analyzable object.",
        ),
      )
    } else {
      const bindingName = getDefaultExportBindingName(mainSourceFile)
      const hasMutation = bindingName ? createBindingMutationDetector(mainSourceFile)(bindingName) : false
      if (hasAmbiguousConfigShape(mainConfig) || hasMutation) {
        findings.push(
          createFinding(
            "storybook-main-config-static",
            mainFile,
            "immutable-object",
            "Keep the exported Storybook main configuration spread-free, statically analyzable, and immutable through every alias.",
          ),
        )
      }

      const addons = getStringArrayValue(getObjectProperty(mainConfig, "addons"))
      if (!addons?.includes("@storybook/addon-a11y")) {
        findings.push(
          createFinding(
            "storybook-a11y-addon",
            mainFile,
            "@storybook/addon-a11y",
            "Keep @storybook/addon-a11y enabled in the global Storybook configuration.",
          ),
        )
      }

      const stories = getStringArrayValue(getObjectProperty(mainConfig, "stories"))
      if (!stories?.includes(requiredStoryGlob)) {
        findings.push(
          createFinding(
            "storybook-story-glob",
            mainFile,
            requiredStoryGlob,
            `Keep ${requiredStoryGlob} in the global Storybook story discovery contract.`,
          ),
        )
      }
    }
  }

  if (!fs.existsSync(previewPath)) {
    findings.push(
      createFinding(
        "storybook-preview-config",
        previewFile,
        "missing",
        "Storybook requires a statically analyzable .storybook/preview.ts contract.",
      ),
    )
  } else {
    const previewSourceFile = parseSourceFile(previewPath)
    const previewConfig = getDefaultMetaObject(previewSourceFile)
    if (!previewConfig) {
      findings.push(
        createFinding(
          "storybook-preview-config",
          previewFile,
          "default-export",
          "Export the Storybook preview configuration as a statically analyzable object.",
        ),
      )
    } else {
      const bindingName = getDefaultExportBindingName(previewSourceFile)
      const hasMutation = bindingName ? createBindingMutationDetector(previewSourceFile)(bindingName) : false
      if (hasAmbiguousConfigShape(previewConfig) || hasMutation) {
        findings.push(
          createFinding(
            "storybook-preview-config-static",
            previewFile,
            "immutable-object",
            "Keep the exported Storybook preview configuration spread-free, statically analyzable, and immutable through every alias.",
          ),
        )
      }

      const parameters = getObjectProperty(previewConfig, "parameters")
      const a11y =
        parameters && ts.isObjectLiteralExpression(parameters) ? getObjectProperty(parameters, "a11y") : null
      const a11yTest = a11y && ts.isObjectLiteralExpression(a11y) ? getObjectProperty(a11y, "test") : null
      if (getStringLiteralValue(a11yTest) !== "error") {
        findings.push(
          createFinding(
            "storybook-a11y-test",
            previewFile,
            "parameters.a11y.test",
            'Keep global Storybook accessibility enforcement set to test: "error".',
          ),
        )
      }

      const tags = getStringArrayValue(getObjectProperty(previewConfig, "tags"))
      if (!tags?.includes("autodocs")) {
        findings.push(
          createFinding(
            "storybook-autodocs",
            previewFile,
            "autodocs",
            "Keep Autodocs enabled in the global Storybook preview contract.",
          ),
        )
      }
    }
  }

  return findings
}

function collectFindings() {
  const findings = collectStorybookConfigFindings()
  const sourcePaths = collectSourceFiles(rootDir)
  const storyPaths = sourcePaths.filter((filePath) => isStoryFile(toRelative(rootDir, filePath)))
  const coveredComponents = new Set()
  const directStoryRequirements = new Map()
  const reExports = collectNamedReExports(rootDir, sourcePaths)

  for (const storyPath of storyPaths) {
    const file = toRelative(rootDir, storyPath)
    const sourceFile = parseSourceFile(storyPath)
    const isJourney = isApprovedJourneyStory(file)

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

    findings.push(...collectStoryPolicyFindings(file, sourceFile, meta, storyExportNames, isJourney))

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
    const exportedComponentNames = getExportedComponentNames(sourceFile)

    const isProductionFeatureTsx = isFeatureComponentSource(file) && !isTestOnlyFeatureSource(file)
    const hasForbiddenNonVisualTsxPlacement = isProductionFeatureTsx && isNonVisualFeatureTsx(file)
    const hasMisplacedExportedComponent =
      isProductionFeatureTsx &&
      exportedComponentNames.length > 0 &&
      !hasApprovedFeatureComponentPlacement(file)

    if (hasForbiddenNonVisualTsxPlacement || hasMisplacedExportedComponent) {
      findings.push(
        createFinding(
          "feature-component-placement",
          file,
          exportedComponentNames.join(",") || "production-tsx",
          hasForbiddenNonVisualTsxPlacement
            ? "Keep production model and hook sources JSX-free with a .ts extension; place visual React components in an approved Atomic component directory."
            : "Place visual feature components under components/atoms, components/molecules, or components/organisms, or explicitly classify an approved Controller, Composition, Page, or Template role.",
        ),
      )
    }

    if (requiresDirectStory(file)) {
      for (const componentName of exportedComponentNames) {
        addDirectStoryRequirement(directStoryRequirements, file, componentName)
      }
    }

    if (isFeaturePublicContract(file)) {
      for (const [key, binding] of reExports) {
        if (!key.startsWith(`${file}|`)) continue

        const exportedName = key.slice(file.length + 1)
        if (exportedName !== "default" && !/^[A-Z]/u.test(exportedName)) continue

        const resolvedBinding = resolveReExportBinding(binding, reExports)
        if (resolvedBinding.importedName !== "default" && !/^[A-Z]/u.test(resolvedBinding.importedName)) {
          continue
        }
        addDirectStoryRequirement(
          directStoryRequirements,
          resolvedBinding.resolvedPath,
          resolvedBinding.importedName,
          exportedName === "default" ? `Default export from ${file}` : exportedName,
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
