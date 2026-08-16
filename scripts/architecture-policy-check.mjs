#!/usr/bin/env node

import path from "node:path"
import ts from "typescript"
import {
  collectExecutableJavaScriptFiles,
  collectProjectSourceFiles,
  containsReferencedIdentifier,
  createFinding,
  getImportBindings,
  getModuleReferences,
  hasWildcardExport,
  parseSourceFile,
  toRelative,
  uniqueSortedFindings,
} from "./governance/source-analysis.mjs"

const rootDir = process.cwd()
const browserGlobals = new Set(["crypto", "document", "localStorage", "sessionStorage", "window"])
const atomicLayers = new Set(["atoms", "molecules", "organisms"])
const controlledModeSelectorName = "isControlledAuthTestMode"
const catchAllDirectoryPattern =
  /^(?:catch-?all|common|helpers?|misc|primitives|repositor(?:y|ies)|services?|shared|utilities|utils?)$/iu

function importTarget(reference) {
  return reference.resolvedPath ?? reference.moduleSpecifier
}

function isFixtureImport(reference) {
  const target = importTarget(reference)
  return /(?:^|\/)(?:fixtures|testing)(?:\/|$)|\.fixtures(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isPrototypeDataTarget(target) {
  return /(?:^|\/)(?:[^/]+\.prototype-data|prototype-data-source)(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isPrototypeDataImport(reference) {
  return isPrototypeDataTarget(importTarget(reference))
}

function isRuntimePrototypeCommandImport(reference) {
  const target = importTarget(reference)
  return /(?:^|\/)(?:[^/]+\.)?prototype-commands(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isClinicDashboardDemoTarget(target) {
  return /^src\/features\/clinic-dashboard\/demo(?:\/|$)/u.test(target)
}

function isClinicDashboardDemoImport(reference) {
  return isClinicDashboardDemoTarget(importTarget(reference))
}

function isClinicDashboardDemoCommandTarget(target) {
  return /^src\/features\/clinic-dashboard\/demo\/commands(?:\.[cm]?[jt]sx?)?$/u.test(target)
}

function isClinicDashboardServerSource(file) {
  return /^src\/features\/clinic-dashboard\/server\.[cm]?[jt]s$/u.test(file)
}

function isClinicDashboardServerTarget(target) {
  return /^src\/features\/clinic-dashboard\/server(?:\.[cm]?[jt]s)?$/u.test(target)
}

function isClinicDashboardDataProviderCompositionSource(file) {
  return /^src\/features\/clinic-dashboard\/data-provider-composition\.[cm]?[jt]s$/u.test(file)
}

function isClinicDashboardDataProviderCompositionTarget(target) {
  return /^src\/features\/clinic-dashboard\/data-provider-composition(?:\.[cm]?[jt]s)?$/u.test(target)
}

function isPatientInquiryProviderContractTarget(target) {
  return /^src\/features\/clinic-dashboard\/messages\/server\/patient-inquiry-provider(?:\.[cm]?[jt]s)?$/u.test(
    target,
  )
}

function isPatientInquiryProviderAdapterSource(file) {
  return /^src\/features\/clinic-dashboard\/messages\/server\/(?:controlled|payload)-inquiries\.[cm]?[jt]s$/u.test(
    file,
  )
}

function isPatientInquiryProviderAdapterTarget(target) {
  return /^src\/features\/clinic-dashboard\/messages\/server\/(?:controlled|payload)-inquiries(?:\.[cm]?[jt]s)?$/u.test(
    target,
  )
}

function isPatientInquiryProviderContractSource(file) {
  return /^src\/features\/clinic-dashboard\/messages\/server\/patient-inquiry-provider\.[cm]?[jt]s$/u.test(
    file,
  )
}

function isPatientInquiryServerPublicSource(file) {
  return /^src\/features\/clinic-dashboard\/messages\/server\/public\.[cm]?[jt]s$/u.test(file)
}

function isClinicDashboardAuthServerTarget(target) {
  return /^src\/features\/clinic-dashboard\/auth\/server\/public(?:\.[cm]?[jt]s)?$/u.test(target)
}

function isClinicDashboardWorkspaceProviderTarget(target) {
  return /^src\/features\/clinic-dashboard\/workspace-provider(?:\.[cm]?[jt]s)?$/u.test(target)
}

function isClinicDashboardWorkspaceProviderSource(file) {
  return /^src\/features\/clinic-dashboard\/workspace-provider\.[cm]?[jt]s$/u.test(file)
}

function isAllowedClinicDashboardWorkspaceProviderImport(file) {
  return (
    file === "src/features/clinic-dashboard/server.ts" ||
    file === "src/features/clinic-dashboard/demo/loader.ts"
  )
}

function isAllowedClinicDashboardServerImport(file) {
  return (
    file === "src/app/page.tsx" ||
    file === "src/app/api/dashboard/inquiries/[inquiryId]/status/route.ts" ||
    file === "src/app/api/dashboard/clinic-treatments/route.ts" ||
    /^src\/app\/api\/dashboard\/gallery(?:\/(?:discard|image|media))?\/route\.ts$/u.test(file) ||
    /^src\/app\/api\/dashboard\/reviews(?:\/\[reviewId\]\/(?:appeal|history|response))?\/route\.ts$/u.test(
      file,
    ) ||
    /^src\/app\/api\/dashboard\/doctors(?:\/\[doctorId\](?:\/image|\/specialties(?:\/\[assignmentId\])?)?)?\/route\.ts$/u.test(
      file,
    ) ||
    /^src\/app\/api\/dashboard\/profile(?:\/draft(?:\/discard)?|\/publish)?\/route\.ts$/u.test(file) ||
    file === "tests/unit/clinic-dashboard-demo-data.test.ts" ||
    file === "tests/integration/patient-inquiry-queue-loading.test.ts" ||
    file === "tests/integration/patient-inquiry-status-route.test.ts" ||
    file === "tests/unit/clinic-treatment-controlled-lifecycle.test.ts" ||
    file === "tests/integration/clinic-profile-routes.test.ts" ||
    file === "tests/integration/review-routes.test.ts"
  )
}

function isAllowedClinicDashboardDataProviderCompositionImport(file) {
  return (
    file === "src/features/clinic-dashboard/server.ts" ||
    file === "tests/unit/data-provider-composition.test.ts"
  )
}

function isAllowedPatientInquiryProviderAdapterImport(file) {
  return (
    isClinicDashboardDataProviderCompositionSource(file) ||
    file === "tests/unit/patient-inquiry-provider-contract.test.ts" ||
    file === "tests/unit/patient-inquiry-payload.test.ts"
  )
}

function isAllowedPatientInquiryProviderContractImport(file) {
  return (
    isClinicDashboardDataProviderCompositionSource(file) ||
    isClinicDashboardServerSource(file) ||
    /^src\/features\/clinic-dashboard\/messages\/server\//u.test(file) ||
    file === "tests/unit/inquiry-status-actions.test.ts" ||
    file === "tests/unit/patient-inquiry-provider-contract.test.ts"
  )
}

function isAllowedControlledModeSelection(file) {
  return (
    file === "src/lib/env.ts" ||
    isClinicDashboardDataProviderCompositionSource(file) ||
    /^src\/features\/clinic-dashboard\/auth\/server\//u.test(file)
  )
}

function isControlledModeSelectorTarget(target) {
  return /^src\/lib\/env(?:\.[cm]?[jt]s)?$/u.test(target)
}

function isDemoPrivateWorkspaceContractTarget(target) {
  return /^src\/features\/clinic-dashboard\/workspace\/model\/(?:notifications|profile-save-projection|workspace-input)(?:\.[cm]?[jt]s)?$/u.test(
    target,
  )
}

function isSharedUiDomainTarget(target) {
  return (
    /(?:^|\/)(?:features|app)(?:\/|$)/u.test(target) ||
    /(?:^|\/)(?:fixtures|testing)(?:\/|$)|\.fixtures(?:\.[cm]?[jt]sx?)?$/u.test(target) ||
    isPrototypeDataTarget(target) ||
    /(?:^|\/)(?:[^/]+\.)?prototype-commands(?:\.[cm]?[jt]sx?)?$/u.test(target) ||
    isClinicDashboardDemoTarget(target)
  )
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

function featureAtomicPlacement(file) {
  const match = file.match(/^src\/features\/.+?\/components\/(.+)$/u)
  if (!match) return null

  const pathSegments = match[1].split("/")
  return {
    layer: pathSegments.length > 1 ? pathSegments[0] : null,
  }
}

function catchAllDirectory(file) {
  if (!file.startsWith("src/features/")) return null
  return file
    .split("/")
    .slice(0, -1)
    .find((segment) => catchAllDirectoryPattern.test(segment))
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
    /^(?:playwright|vitest)\.config\.[cm]?[jt]s$/u.test(file) ||
    /^\.storybook\//u.test(file) ||
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

function hasPublicDefaultExport(sourceFile) {
  return sourceFile.statements.some((statement) => {
    if (ts.isExportAssignment(statement)) return true
    if (statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.DefaultKeyword)) {
      return true
    }
    if (!ts.isExportDeclaration(statement) || !statement.exportClause) return false
    if (!ts.isNamedExports(statement.exportClause)) return false

    return statement.exportClause.elements.some((element) => element.name.text === "default")
  })
}

function unwrapExpression(expression) {
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

function getPropertyAccess(expression) {
  const current = unwrapExpression(expression)

  if (ts.isPropertyAccessExpression(current)) {
    return { owner: unwrapExpression(current.expression), propertyName: current.name.text }
  }

  if (ts.isElementAccessExpression(current) && current.argumentExpression) {
    const property = unwrapExpression(current.argumentExpression)
    return {
      owner: unwrapExpression(current.expression),
      propertyName:
        ts.isStringLiteral(property) || ts.isNoSubstitutionTemplateLiteral(property) ? property.text : null,
    }
  }

  return null
}

function createSourceFileTypeChecker(sourceFile) {
  const compilerOptions = {
    noLib: true,
    noResolve: true,
    target: ts.ScriptTarget.Latest,
  }
  const compilerHost = ts.createCompilerHost(compilerOptions, true)
  const sourceFileName = path.resolve(sourceFile.fileName)
  compilerHost.fileExists = (fileName) => path.resolve(fileName) === sourceFileName
  compilerHost.readFile = (fileName) =>
    path.resolve(fileName) === sourceFileName ? sourceFile.text : undefined
  compilerHost.getSourceFile = (fileName) =>
    path.resolve(fileName) === sourceFileName ? sourceFile : undefined

  return ts.createProgram([sourceFile.fileName], compilerOptions, compilerHost).getTypeChecker()
}

function hasCommonJsPublicExport(sourceFile) {
  const typeChecker = createSourceFileTypeChecker(sourceFile)
  const moduleAliasSymbols = new Set()
  const exportsAliasSymbols = new Set()
  const aliasCandidates = []
  const moduleDestructuringCandidates = []
  const getSymbol = (identifier) => typeChecker.getSymbolAtLocation(identifier)

  const getCommonJsBindingKind = (expression) => {
    const current = unwrapExpression(expression)

    if (ts.isIdentifier(current)) {
      const symbol = getSymbol(current)
      if (current.text === "module" && !symbol?.declarations?.length) return "module"
      if (current.text === "exports" && !symbol?.declarations?.length) return "exports"
      if (symbol && moduleAliasSymbols.has(symbol)) return "module"
      if (symbol && exportsAliasSymbols.has(symbol)) return "exports"
      return null
    }

    const access = getPropertyAccess(current)
    if (!access) return null

    const ownerKind = getCommonJsBindingKind(access.owner)
    if (ownerKind === "module" && access.propertyName === "exports") return "exports"
    if (ownerKind === "exports") return "exports"
    return null
  }

  const collectAliasCandidates = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
      if (ts.isIdentifier(node.name)) {
        const symbol = getSymbol(node.name)
        if (symbol) aliasCandidates.push({ expression: node.initializer, symbol })
      } else if (ts.isObjectBindingPattern(node.name)) {
        moduleDestructuringCandidates.push({ expression: node.initializer, pattern: node.name })
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken &&
      ts.isIdentifier(unwrapExpression(node.left))
    ) {
      const symbol = getSymbol(unwrapExpression(node.left))
      if (symbol) aliasCandidates.push({ expression: node.right, symbol })
    }

    ts.forEachChild(node, collectAliasCandidates)
  }

  collectAliasCandidates(sourceFile)

  const addAlias = (symbol, kind) => {
    const aliases = kind === "module" ? moduleAliasSymbols : exportsAliasSymbols
    if (aliases.has(symbol)) return false
    aliases.add(symbol)
    return true
  }

  const bindModuleExportsPattern = (pattern, sourceKind) => {
    if (sourceKind !== "module") return false

    let changed = false
    for (const element of pattern.elements) {
      if (element.dotDotDotToken || !ts.isIdentifier(element.name)) continue

      const propertyName = element.propertyName
        ? ts.isIdentifier(element.propertyName) || ts.isStringLiteral(element.propertyName)
          ? element.propertyName.text
          : null
        : element.name.text
      if (propertyName !== "exports") continue

      const symbol = getSymbol(element.name)
      if (symbol && addAlias(symbol, "exports")) changed = true
    }

    return changed
  }

  let discoveredAlias = true
  while (discoveredAlias) {
    discoveredAlias = false

    for (const candidate of aliasCandidates) {
      if (moduleAliasSymbols.has(candidate.symbol) || exportsAliasSymbols.has(candidate.symbol)) continue

      const kind = getCommonJsBindingKind(candidate.expression)
      if (kind && addAlias(candidate.symbol, kind)) discoveredAlias = true
    }

    for (const candidate of moduleDestructuringCandidates) {
      const sourceKind = getCommonJsBindingKind(candidate.expression)
      if (bindModuleExportsPattern(candidate.pattern, sourceKind)) discoveredAlias = true
    }
  }

  const isCommonJsExportMutationTarget = (expression) => {
    const access = getPropertyAccess(expression)
    if (!access) return false

    const ownerKind = getCommonJsBindingKind(access.owner)
    return ownerKind === "exports" || (ownerKind === "module" && access.propertyName === "exports")
  }

  let found = false

  const visit = (node) => {
    if (found) return

    if (
      ts.isBinaryExpression(node) &&
      ts.isAssignmentOperator(node.operatorToken.kind) &&
      isCommonJsExportMutationTarget(node.left)
    ) {
      found = true
      return
    }

    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
      isCommonJsExportMutationTarget(node.operand)
    ) {
      found = true
      return
    }

    if (ts.isDeleteExpression(node) && isCommonJsExportMutationTarget(node.expression)) {
      found = true
      return
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return found
}

function isWorkspaceCompositionSource(file) {
  return /^src\/features\/clinic-dashboard\/workspace\/ClinicDashboardWorkspace\.[cm]?[jt]sx?$/u.test(file)
}

function isDemoCommandCompositionSource(file) {
  return /^src\/features\/clinic-dashboard\/workspace\/ClinicDashboardWorkspace\.[cm]?[jt]sx?$/u.test(file)
}

function isAllowedClinicDashboardDemoImport(file, reference) {
  const target = importTarget(reference)

  if (/^src\/features\/clinic-dashboard\/demo\//u.test(file)) {
    return isClinicDashboardDemoTarget(target) || isDemoPrivateWorkspaceContractTarget(target)
  }

  if (isClinicDashboardServerSource(file)) {
    return /^src\/features\/clinic-dashboard\/demo\/loader\.ts$/u.test(target)
  }

  return isDemoCommandCompositionSource(file) && isClinicDashboardDemoCommandTarget(target)
}

function isPrototypeDataMapperSource(file) {
  return /\.prototype-data\.mapper\.[cm]?[jt]s$/u.test(file)
}

function isPrototypeDataMapperTarget(target) {
  return /\.prototype-data\.mapper(?:\.[cm]?[jt]s)?$/u.test(target)
}

function isPrototypeDataMapperImport(reference) {
  return isPrototypeDataMapperTarget(importTarget(reference))
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

function bindingIdentifierNames(bindingName) {
  if (ts.isIdentifier(bindingName)) return [bindingName.text]

  const names = []
  for (const element of bindingName.elements) {
    if (ts.isOmittedExpression(element)) continue
    names.push(...bindingIdentifierNames(element.name))
  }

  return names
}

function collectLocalBindingInitializers(sourceFile) {
  const initializers = new Map()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (!declaration.initializer) continue
      for (const name of bindingIdentifierNames(declaration.name)) {
        initializers.set(name, declaration.initializer)
      }
    }
  }

  return initializers
}

function resolveImportedBindingFromExpression(expression, importBindings, localInitializers, visited) {
  const current = unwrapExpression(expression)
  if (ts.isIdentifier(current)) {
    return resolveImportedBinding(current.text, importBindings, localInitializers, visited)
  }

  const access = getPropertyAccess(current)
  return access
    ? resolveImportedBindingFromExpression(access.owner, importBindings, localInitializers, visited)
    : null
}

function resolveImportedBinding(localName, importBindings, localInitializers, visited = new Set()) {
  if (visited.has(localName)) return null
  visited.add(localName)

  const importBinding = importBindings.get(localName)
  if (importBinding) return importBinding

  const initializer = localInitializers.get(localName)
  return initializer
    ? resolveImportedBindingFromExpression(initializer, importBindings, localInitializers, visited)
    : null
}

function collectReExportTargetsByFile(rootDir, sourceEntries) {
  return new Map(
    sourceEntries.map(({ file, references, sourceFile }) => {
      const targets = references
        .filter((reference) => reference.kind === "export" && reference.resolvedPath)
        .map((reference) => reference.resolvedPath)
      const importBindings = getImportBindings(rootDir, sourceFile)
      const localInitializers = collectLocalBindingInitializers(sourceFile)

      for (const statement of sourceFile.statements) {
        if (ts.isExportAssignment(statement)) {
          const binding = resolveImportedBindingFromExpression(
            statement.expression,
            importBindings,
            localInitializers,
            new Set(),
          )
          if (binding?.resolvedPath) targets.push(binding.resolvedPath)
          continue
        }

        if (
          ts.isVariableStatement(statement) &&
          statement.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword)
        ) {
          for (const declaration of statement.declarationList.declarations) {
            for (const localName of bindingIdentifierNames(declaration.name)) {
              const binding = resolveImportedBinding(localName, importBindings, localInitializers)
              if (binding?.resolvedPath) targets.push(binding.resolvedPath)
            }
          }
          continue
        }

        if (
          !ts.isExportDeclaration(statement) ||
          statement.moduleSpecifier ||
          !statement.exportClause ||
          !ts.isNamedExports(statement.exportClause)
        ) {
          continue
        }

        for (const element of statement.exportClause.elements) {
          const localName = element.propertyName?.text ?? element.name.text
          const binding = resolveImportedBinding(localName, importBindings, localInitializers)
          if (binding?.resolvedPath) targets.push(binding.resolvedPath)
        }
      }

      return [file, [...new Set(targets)]]
    }),
  )
}

function collectTransitiveReExportTargets(target, reExportTargetsByFile, visited = new Set()) {
  if (visited.has(target)) return []
  visited.add(target)

  const exportTargets = reExportTargetsByFile.get(target) ?? []

  return [
    ...exportTargets,
    ...exportTargets.flatMap((exportTarget) =>
      collectTransitiveReExportTargets(exportTarget, reExportTargetsByFile, visited),
    ),
  ]
}

function reachesControlledModeSelectorTarget(target, reExportTargetsByFile) {
  return (
    isControlledModeSelectorTarget(target) ||
    collectTransitiveReExportTargets(target, reExportTargetsByFile).some(isControlledModeSelectorTarget)
  )
}

function bindingSelectsControlledMode(binding, reExportTargetsByFile) {
  if (binding.importedName === controlledModeSelectorName) return true
  if (!binding.resolvedPath) return false

  if (isControlledModeSelectorTarget(binding.resolvedPath)) {
    return binding.importedName === "*"
  }

  return reachesControlledModeSelectorTarget(binding.resolvedPath, reExportTargetsByFile)
}

function reExportsControlledMode(sourceFile, references, reExportTargetsByFile) {
  const exportTargets = new Map(
    references
      .filter((reference) => reference.kind === "export" && reference.resolvedPath)
      .map((reference) => [reference.moduleSpecifier, reference.resolvedPath]),
  )

  return sourceFile.statements.some((statement) => {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.moduleSpecifier ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      return false
    }

    const target = exportTargets.get(statement.moduleSpecifier.text)
    if (!target || !reachesControlledModeSelectorTarget(target, reExportTargetsByFile)) {
      return false
    }

    if (!statement.exportClause || ts.isNamespaceExport(statement.exportClause)) return true
    if (!ts.isNamedExports(statement.exportClause)) return false

    if (!isControlledModeSelectorTarget(target)) return true

    return statement.exportClause.elements.some(
      (element) => (element.propertyName?.text ?? element.name.text) === controlledModeSelectorName,
    )
  })
}

function findHigherAtomicReExportTarget(sourceLayer, target, reExportTargetsByFile) {
  const rank = { atoms: 0, molecules: 1, organisms: 2 }

  return collectTransitiveReExportTargets(target, reExportTargetsByFile)
    .filter((exportTarget) => {
      const exportTargetLayer = atomicLayer(exportTarget)
      return exportTargetLayer && rank[exportTargetLayer] > rank[sourceLayer]
    })
    .sort()[0]
}

function findCompositionOnlyPublicReExportTarget(file, reExportTargetsByFile) {
  const targets = collectTransitiveReExportTargets(file, reExportTargetsByFile)
  return (
    targets.filter(isClinicDashboardDemoTarget).sort()[0] ??
    targets.filter(isPrototypeDataTarget).sort()[0] ??
    targets.filter(isPrototypeDataMapperTarget).sort()[0]
  )
}

function findSharedUiDomainTarget(reference, reExportTargetsByFile) {
  const target = reference.resolvedPath
  if (!target) return null

  return [target, ...collectTransitiveReExportTargets(target, reExportTargetsByFile)]
    .filter(isSharedUiDomainTarget)
    .sort()[0]
}

function collectFindings() {
  const findings = []
  const sourceEntries = collectProjectSourceFiles(rootDir).map((filePath) => {
    const sourceFile = parseSourceFile(filePath)
    return {
      file: toRelative(rootDir, filePath),
      references: getModuleReferences(rootDir, sourceFile),
      sourceFile,
    }
  })
  const reExportTargetsByFile = collectReExportTargetsByFile(rootDir, sourceEntries)

  for (const filePath of collectExecutableJavaScriptFiles(rootDir)) {
    const file = toRelative(rootDir, filePath)
    findings.push(
      createFinding(
        "javascript-source-forbidden",
        file,
        file,
        "Executable source under src must use TypeScript; JavaScript source files are outside the governed architecture.",
      ),
    )
  }

  for (const { file, references, sourceFile } of sourceEntries) {
    const importBindings = getImportBindings(rootDir, sourceFile)

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

    const atomicPlacement = featureAtomicPlacement(file)
    if (atomicPlacement && atomicPlacement.layer === null) {
      findings.push(
        createFinding(
          "missing-atomic-layer",
          file,
          file,
          "Feature components must be placed under an atoms, molecules, or organisms directory.",
        ),
      )
    } else if (atomicPlacement && !atomicLayers.has(atomicPlacement.layer)) {
      findings.push(
        createFinding(
          "unknown-atomic-layer",
          file,
          atomicPlacement.layer,
          `Feature components must use atoms, molecules, or organisms; ${atomicPlacement.layer} is not an allowed Atomic layer.`,
        ),
      )
    }

    const forbiddenDirectory = catchAllDirectory(file)
    if (forbiddenDirectory) {
      findings.push(
        createFinding(
          "forbidden-catchall-directory",
          file,
          forbiddenDirectory,
          `Replace the ${forbiddenDirectory} directory with a concrete business or technical responsibility.`,
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

    if (isFeaturePublicContractFile(file) && hasPublicDefaultExport(sourceFile)) {
      findings.push(
        createFinding(
          "default-public-export",
          file,
          "default-export",
          "Feature public contracts must expose explicit named exports, not a default export.",
        ),
      )
    }

    if (isFeaturePublicContractFile(file) && hasCommonJsPublicExport(sourceFile)) {
      findings.push(
        createFinding(
          "commonjs-public-export",
          file,
          "commonjs-export",
          "Feature public contracts must use explicit ES named exports, not CommonJS export assignments.",
        ),
      )
    }

    if (isFeaturePublicContractFile(file)) {
      const compositionOnlyTarget = findCompositionOnlyPublicReExportTarget(file, reExportTargetsByFile)
      if (compositionOnlyTarget) {
        findings.push(
          createFinding(
            "public-prototype-data-export",
            file,
            compositionOnlyTarget,
            `Feature public contracts must not expose composition-only runtime demo or prototype sources (${compositionOnlyTarget}).`,
          ),
        )
      }
    }

    if (
      isClinicDashboardServerSource(file) &&
      !references.some((reference) => reference.moduleSpecifier === "server-only")
    ) {
      findings.push(
        createFinding(
          "clinic-dashboard-server-marker",
          file,
          "server-only",
          "The Clinic Dashboard server entry must import server-only to prevent client-bundle use.",
        ),
      )
    }

    if (
      (isClinicDashboardDataProviderCompositionSource(file) ||
        isPatientInquiryProviderContractSource(file) ||
        isPatientInquiryProviderAdapterSource(file) ||
        isPatientInquiryServerPublicSource(file)) &&
      !references.some((reference) => reference.moduleSpecifier === "server-only")
    ) {
      findings.push(
        createFinding(
          "clinic-dashboard-data-provider-server-marker",
          file,
          "server-only",
          "Clinic Dashboard data-provider composition, interfaces, and adapters must remain server-only.",
        ),
      )
    }

    const selectsControlledMode =
      [...importBindings.values()].some((binding) =>
        bindingSelectsControlledMode(binding, reExportTargetsByFile),
      ) || reExportsControlledMode(sourceFile, references, reExportTargetsByFile)
    if (selectsControlledMode && !isAllowedControlledModeSelection(file)) {
      findings.push(
        createFinding(
          "clinic-dashboard-controlled-mode-selection",
          file,
          "isControlledAuthTestMode",
          "Controlled data-source selection belongs only to the central provider composition; authentication keeps its existing server-only exception.",
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
      if (reference.kind === "unresolved-dynamic-import") {
        findings.push(
          createFinding(
            "unresolved-dynamic-import",
            file,
            reference.moduleSpecifier,
            "Governed source must use a statically analyzable dynamic import target.",
          ),
        )
        continue
      }

      const target = importTarget(reference)
      const reachableTargets = [
        target,
        ...(reference.resolvedPath
          ? collectTransitiveReExportTargets(reference.resolvedPath, reExportTargetsByFile)
          : []),
      ]
      const prototypeDataImport = isPrototypeDataImport(reference)
      const runtimePrototypeCommandImport = isRuntimePrototypeCommandImport(reference)
      const demoImport = isClinicDashboardDemoImport(reference)
      const allowedDemoImport = demoImport && isAllowedClinicDashboardDemoImport(file, reference)
      const dataProviderCompositionImport = reachableTargets.some(
        isClinicDashboardDataProviderCompositionTarget,
      )
      const patientInquiryProviderAdapterImport = reachableTargets.some(isPatientInquiryProviderAdapterTarget)
      const patientInquiryProviderContractImport = reachableTargets.some(
        isPatientInquiryProviderContractTarget,
      )
      const serverImport = isClinicDashboardServerTarget(target)
      const workspaceProviderImport = isClinicDashboardWorkspaceProviderTarget(target)
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

      if (/^src\/features\//u.test(file) && /^src\/app(?:\/|$)/u.test(target)) {
        findings.push(
          createFinding(
            "feature-app-import",
            file,
            reference.moduleSpecifier,
            "Feature source must not import App Router implementation files.",
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

      if (isStoryOrTestingSource(file) && demoImport) {
        findings.push(
          createFinding(
            "story-testing-runtime-demo-import",
            file,
            reference.moduleSpecifier,
            "Stories and tests must use independent feature-local fixtures, not the runtime demo source.",
          ),
        )
      } else if (demoImport && !allowedDemoImport) {
        findings.push(
          createFinding(
            "runtime-demo-source-boundary",
            file,
            reference.moduleSpecifier,
            "Runtime demo sources may be imported only within demo, by the server loader entry, or as the demo client adapter at the client composition entry.",
          ),
        )
      }

      if (workspaceProviderImport && !isAllowedClinicDashboardWorkspaceProviderImport(file)) {
        findings.push(
          createFinding(
            "clinic-dashboard-workspace-provider-boundary",
            file,
            reference.moduleSpecifier,
            "The private workspace provider contract may be imported only by the server entry and provider implementations.",
          ),
        )
      }

      if (dataProviderCompositionImport && !isAllowedClinicDashboardDataProviderCompositionImport(file)) {
        findings.push(
          createFinding(
            "clinic-dashboard-data-provider-composition-boundary",
            file,
            reference.moduleSpecifier,
            "The data-provider composition may be imported only by the Clinic Dashboard server root and its exact composition test.",
          ),
        )
      }

      if (patientInquiryProviderAdapterImport && !isAllowedPatientInquiryProviderAdapterImport(file)) {
        findings.push(
          createFinding(
            "patient-inquiry-provider-adapter-boundary",
            file,
            reference.moduleSpecifier,
            "Concrete patient-inquiry adapters may be imported only by the central composition and exact adapter-contract tests.",
          ),
        )
      }

      if (patientInquiryProviderContractImport && !isAllowedPatientInquiryProviderContractImport(file)) {
        findings.push(
          createFinding(
            "patient-inquiry-provider-contract-boundary",
            file,
            reference.moduleSpecifier,
            "The patient-inquiry provider interface is private server-only infrastructure and must not enter UI, App Router, or Storybook modules.",
          ),
        )
      }

      if (serverImport && !isAllowedClinicDashboardServerImport(file)) {
        findings.push(
          createFinding(
            "clinic-dashboard-server-boundary",
            file,
            reference.moduleSpecifier,
            "The Clinic Dashboard server entry may be imported only by the root server page, approved live-domain BFF routes, and exact data-contract tests.",
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

      const sharedUiDomainTarget = /^src\/components\/ui\//u.test(file)
        ? findSharedUiDomainTarget(reference, reExportTargetsByFile)
        : null
      if (sharedUiDomainTarget) {
        findings.push(
          createFinding(
            "shared-ui-domain-import",
            file,
            reference.moduleSpecifier,
            `Shared UI must remain domain-neutral; ${reference.moduleSpecifier} reaches domain source ${sharedUiDomainTarget}.`,
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
        target !== "src/features/clinic-dashboard/public.ts" &&
        !isClinicDashboardServerTarget(target) &&
        !isClinicDashboardAuthServerTarget(target)
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
        !isAllowedClinicDashboardDemoImport(file, reference) &&
        !prototypeDataImport &&
        !runtimePrototypeCommandImport &&
        !demoImport
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

      const hasDedicatedFeatureBoundary =
        Boolean(sourceArea) ||
        isClinicDashboardServerSource(file) ||
        isClinicDashboardDataProviderCompositionSource(file) ||
        isClinicDashboardWorkspaceProviderSource(file) ||
        /^src\/app\//u.test(file) ||
        /^src\/components\/ui\//u.test(file) ||
        /^src\/providers\//u.test(file)
      if (
        /^src\//u.test(file) &&
        !hasDedicatedFeatureBoundary &&
        !isFeaturePublicContractFile(file) &&
        targetArea &&
        !isPublicContract(reference)
      ) {
        findings.push(
          createFinding(
            "neutral-feature-private-import",
            file,
            reference.moduleSpecifier,
            "Neutral source must not expose or import feature-private implementation; use the owning public.ts contract.",
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
      } else if (sourceLayer) {
        const higherReExportTarget = findHigherAtomicReExportTarget(
          sourceLayer,
          target,
          reExportTargetsByFile,
        )
        const higherReExportLayer = higherReExportTarget ? atomicLayer(higherReExportTarget) : null

        if (higherReExportTarget && higherReExportLayer) {
          findings.push(
            createFinding(
              "atomic-upward-import",
              file,
              `${reference.moduleSpecifier}->${higherReExportTarget}`,
              `${sourceLayer} must not import a barrel that re-exports the higher ${higherReExportLayer} layer (${higherReExportTarget}).`,
            ),
          )
        }
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
