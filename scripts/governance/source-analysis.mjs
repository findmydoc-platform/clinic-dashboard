import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"]
const EXECUTABLE_JAVASCRIPT_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs"]
const IGNORED_DIRECTORIES = new Set([
  ".git",
  ".next",
  "coverage",
  "node_modules",
  "playwright-report",
  "storybook-static",
])

function toPosix(value) {
  return value.replaceAll(path.sep, "/")
}

export function toRelative(rootDir, filePath) {
  return toPosix(path.relative(rootDir, filePath))
}

function walkFiles(directory) {
  if (!fs.existsSync(directory)) return []

  const files = []
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && IGNORED_DIRECTORIES.has(entry.name)) continue

    const entryPath = path.join(directory, entry.name)
    if (entry.isDirectory()) {
      files.push(...walkFiles(entryPath))
    } else if (entry.isFile()) {
      files.push(entryPath)
    }
  }

  return files
}

export function collectSourceFiles(rootDir, relativeDirectories = ["src"]) {
  return relativeDirectories
    .flatMap((relativeDirectory) => walkFiles(path.join(rootDir, relativeDirectory)))
    .filter((filePath) => SOURCE_EXTENSIONS.includes(path.extname(filePath)))
    .sort()
}

export function collectExecutableJavaScriptFiles(rootDir, relativeDirectories = ["src"]) {
  return relativeDirectories
    .flatMap((relativeDirectory) => walkFiles(path.join(rootDir, relativeDirectory)))
    .filter((filePath) => EXECUTABLE_JAVASCRIPT_EXTENSIONS.includes(path.extname(filePath).toLowerCase()))
    .sort()
}

export function parseSourceFile(filePath) {
  const content = fs.readFileSync(filePath, "utf8")
  const scriptKind = filePath.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS
  return ts.createSourceFile(filePath, content, ts.ScriptTarget.Latest, true, scriptKind)
}

function hasExportModifier(node) {
  return node.modifiers?.some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword) ?? false
}

function propertyNameText(name) {
  if (ts.isIdentifier(name) || ts.isStringLiteral(name) || ts.isNumericLiteral(name)) {
    return name.text
  }

  return null
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

function getStaticPropertyAccess(expression) {
  const current = unwrapExpression(expression)

  if (ts.isPropertyAccessExpression(current)) {
    return {
      owner: unwrapExpression(current.expression),
      propertyName: current.name.text,
    }
  }

  if (ts.isElementAccessExpression(current) && current.argumentExpression) {
    return {
      owner: unwrapExpression(current.expression),
      propertyName: getStringLiteralValue(unwrapExpression(current.argumentExpression)),
    }
  }

  return null
}

export function getObjectProperty(objectLiteral, propertyName) {
  for (const property of objectLiteral.properties) {
    if (!ts.isPropertyAssignment(property)) continue
    if (propertyNameText(property.name) === propertyName) return unwrapExpression(property.initializer)
  }

  return null
}

export function getStringLiteralValue(node) {
  if (node && (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node))) {
    return node.text
  }

  return null
}

export function getStringArrayValue(node) {
  if (!node || !ts.isArrayLiteralExpression(node)) return null

  const values = []
  for (const element of node.elements) {
    const value = getStringLiteralValue(unwrapExpression(element))
    if (value === null) return null
    values.push(value)
  }

  return values
}

function findVariableInitializer(sourceFile, variableName) {
  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || declaration.name.text !== variableName) continue
      return declaration.initializer ? unwrapExpression(declaration.initializer) : null
    }
  }

  return null
}

export function getDefaultMetaObject(sourceFile) {
  const exportAssignment = sourceFile.statements.find(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
  )
  if (!exportAssignment || !ts.isExportAssignment(exportAssignment)) return null

  const exportedExpression = unwrapExpression(exportAssignment.expression)
  if (ts.isObjectLiteralExpression(exportedExpression)) return exportedExpression
  if (!ts.isIdentifier(exportedExpression)) return null

  const initializer = findVariableInitializer(sourceFile, exportedExpression.text)
  return initializer && ts.isObjectLiteralExpression(initializer) ? initializer : null
}

function getDefaultMetaBindingName(sourceFile) {
  const exportAssignment = sourceFile.statements.find(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
  )
  if (!exportAssignment || !ts.isExportAssignment(exportAssignment)) return null

  const exportedExpression = unwrapExpression(exportAssignment.expression)
  return ts.isIdentifier(exportedExpression) ? exportedExpression.text : null
}

function hasCsfMetaMutation(sourceFile, metaBindingName) {
  const typeChecker = createSourceFileTypeChecker(sourceFile)
  const exportAssignment = sourceFile.statements.find(
    (statement) => ts.isExportAssignment(statement) && !statement.isExportEquals,
  )
  const exportedExpression =
    exportAssignment && ts.isExportAssignment(exportAssignment)
      ? unwrapExpression(exportAssignment.expression)
      : null
  const metaBindingSymbol =
    exportedExpression && ts.isIdentifier(exportedExpression)
      ? typeChecker.getSymbolAtLocation(exportedExpression)
      : undefined
  if (!metaBindingSymbol || exportedExpression.text !== metaBindingName) return true

  let hasMutation = false
  const metaAliasSymbols = new Set([metaBindingSymbol])
  const aliasCandidates = []
  const destructuringCandidates = []
  const getSymbol = (identifier) => typeChecker.getSymbolAtLocation(identifier)

  const isMetaTainted = (expression) => {
    const current = unwrapExpression(expression)
    if (ts.isIdentifier(current)) {
      const symbol = getSymbol(current)
      return symbol !== undefined && metaAliasSymbols.has(symbol)
    }

    if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
      return isMetaTainted(current.expression)
    }

    return false
  }

  const collectAliasCandidates = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
      if (ts.isIdentifier(node.name)) {
        const symbol = getSymbol(node.name)
        if (symbol) aliasCandidates.push({ expression: node.initializer, symbol })
      } else if (ts.isObjectBindingPattern(node.name)) {
        destructuringCandidates.push({ expression: node.initializer, pattern: node.name })
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

  const bindMetaPattern = (pattern) => {
    let changed = false

    for (const element of pattern.elements) {
      if (ts.isIdentifier(element.name)) {
        const symbol = getSymbol(element.name)
        if (symbol && !metaAliasSymbols.has(symbol)) {
          metaAliasSymbols.add(symbol)
          changed = true
        }
      } else if (ts.isObjectBindingPattern(element.name) && bindMetaPattern(element.name)) {
        changed = true
      }
    }

    return changed
  }

  let discoveredAlias = true
  while (discoveredAlias) {
    discoveredAlias = false

    for (const candidate of aliasCandidates) {
      if (metaAliasSymbols.has(candidate.symbol) || !isMetaTainted(candidate.expression)) continue
      metaAliasSymbols.add(candidate.symbol)
      discoveredAlias = true
    }

    for (const candidate of destructuringCandidates) {
      if (isMetaTainted(candidate.expression) && bindMetaPattern(candidate.pattern)) {
        discoveredAlias = true
      }
    }
  }

  const isMetaTarget = (expression) => isMetaTainted(expression)

  const isMetaPropertyTarget = (expression) => {
    const current = unwrapExpression(expression)
    return (
      (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) &&
      isMetaTarget(current)
    )
  }

  const isMetaBindingReassignment = (expression) => {
    const current = unwrapExpression(expression)
    return ts.isIdentifier(current) && getSymbol(current) === metaBindingSymbol
  }

  const visit = (node) => {
    if (hasMutation) return

    if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
      const argumentsContainMeta = (node.arguments ?? []).some((argument) =>
        ts.isSpreadElement(argument) ? isMetaTarget(argument.expression) : isMetaTarget(argument),
      )
      const callsMetaMethod = isMetaTarget(node.expression)

      if (argumentsContainMeta || callsMetaMethod) {
        hasMutation = true
        return
      }
    }

    if (
      ts.isBinaryExpression(node) &&
      ts.isAssignmentOperator(node.operatorToken.kind) &&
      (isMetaPropertyTarget(node.left) || isMetaBindingReassignment(node.left))
    ) {
      hasMutation = true
      return
    }

    if (
      (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
      (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
      (isMetaPropertyTarget(node.operand) || isMetaBindingReassignment(node.operand))
    ) {
      hasMutation = true
      return
    }

    if (ts.isDeleteExpression(node) && isMetaPropertyTarget(node.expression)) {
      hasMutation = true
      return
    }

    ts.forEachChild(node, visit)
  }

  visit(sourceFile)
  return hasMutation
}

function candidateModulePaths(basePath) {
  if (SOURCE_EXTENSIONS.includes(path.extname(basePath))) return [basePath]

  return [
    ...SOURCE_EXTENSIONS.map((extension) => `${basePath}${extension}`),
    ...SOURCE_EXTENSIONS.map((extension) => path.join(basePath, `index${extension}`)),
  ]
}

function resolveModulePath(rootDir, sourceFilePath, moduleSpecifier) {
  let basePath
  if (moduleSpecifier.startsWith("@/")) {
    basePath = path.join(rootDir, "src", moduleSpecifier.slice(2))
  } else if (moduleSpecifier.startsWith(".")) {
    basePath = path.resolve(path.dirname(sourceFilePath), moduleSpecifier)
  } else {
    return null
  }

  const resolvedPath = candidateModulePaths(basePath).find((candidate) => fs.existsSync(candidate))
  return toRelative(rootDir, resolvedPath ?? basePath)
}

export function getModuleReferences(rootDir, sourceFile) {
  const references = []
  const typeChecker = createSourceFileTypeChecker(sourceFile)
  const requireAliasSymbols = new Set()
  const requireResolveAliasSymbols = new Set()
  const aliasCandidates = []
  const destructuringCandidates = []
  const getSymbol = (identifier) => typeChecker.getSymbolAtLocation(identifier)

  const addReference = (moduleSpecifier, kind) => {
    references.push({
      kind,
      moduleSpecifier,
      resolvedPath: resolveModulePath(rootDir, sourceFile.fileName, moduleSpecifier),
    })
  }

  const addUnresolvedReference = (node, label) => {
    const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
    references.push({
      kind: "unresolved-dynamic-import",
      moduleSpecifier: `<${label} at line ${line + 1}>`,
      resolvedPath: null,
    })
  }

  const addExpressionReference = (node, expression, kind, label) => {
    const moduleSpecifier = getStringLiteralValue(expression ? unwrapExpression(expression) : null)

    if (moduleSpecifier !== null) {
      addReference(moduleSpecifier, kind)
    } else {
      addUnresolvedReference(node, label)
    }
  }

  const getRequireBindingKind = (expression) => {
    const current = unwrapExpression(expression)

    if (ts.isIdentifier(current)) {
      const symbol = getSymbol(current)
      if (current.text === "require" && !symbol?.declarations?.length) return "require"
      if (symbol && requireAliasSymbols.has(symbol)) return "require"
      if (symbol && requireResolveAliasSymbols.has(symbol)) return "require-resolve"
      return null
    }

    const access = getStaticPropertyAccess(current)
    if (!access || access.propertyName !== "resolve") return null
    return getRequireBindingKind(access.owner) === "require" ? "require-resolve" : null
  }

  const collectRequireAliasCandidates = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
      if (ts.isIdentifier(node.name)) {
        const symbol = getSymbol(node.name)
        if (symbol) aliasCandidates.push({ expression: node.initializer, symbol })
      } else if (ts.isObjectBindingPattern(node.name)) {
        destructuringCandidates.push({ expression: node.initializer, pattern: node.name })
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

    ts.forEachChild(node, collectRequireAliasCandidates)
  }

  collectRequireAliasCandidates(sourceFile)

  const addRequireAlias = (symbol, kind) => {
    const aliases = kind === "require" ? requireAliasSymbols : requireResolveAliasSymbols
    if (aliases.has(symbol)) return false
    aliases.add(symbol)
    return true
  }

  const bindRequirePattern = (pattern, sourceKind) => {
    let changed = false

    for (const element of pattern.elements) {
      const propertyName = element.propertyName
        ? propertyNameText(element.propertyName)
        : ts.isIdentifier(element.name)
          ? element.name.text
          : null
      const childKind = element.dotDotDotToken
        ? sourceKind
        : sourceKind === "require" && propertyName === "resolve"
          ? "require-resolve"
          : sourceKind === "require-resolve"
            ? "require-resolve"
            : null
      if (!childKind) continue

      if (ts.isIdentifier(element.name)) {
        const symbol = getSymbol(element.name)
        if (symbol && addRequireAlias(symbol, childKind)) changed = true
      } else if (ts.isObjectBindingPattern(element.name)) {
        if (bindRequirePattern(element.name, childKind)) changed = true
      }
    }

    return changed
  }

  let discoveredAlias = true
  while (discoveredAlias) {
    discoveredAlias = false

    for (const candidate of aliasCandidates) {
      if (requireAliasSymbols.has(candidate.symbol) || requireResolveAliasSymbols.has(candidate.symbol)) {
        continue
      }

      const kind = getRequireBindingKind(candidate.expression)
      if (kind && addRequireAlias(candidate.symbol, kind)) discoveredAlias = true
    }

    for (const candidate of destructuringCandidates) {
      const kind = getRequireBindingKind(candidate.expression)
      if (kind && bindRequirePattern(candidate.pattern, kind)) discoveredAlias = true
    }
  }

  for (const statement of sourceFile.statements) {
    if (ts.isImportDeclaration(statement) && ts.isStringLiteral(statement.moduleSpecifier)) {
      addReference(statement.moduleSpecifier.text, "import")
    }

    if (
      ts.isExportDeclaration(statement) &&
      statement.moduleSpecifier &&
      ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      addReference(statement.moduleSpecifier.text, "export")
    }
  }

  const visit = (node) => {
    if (ts.isCallExpression(node) && node.expression.kind === ts.SyntaxKind.ImportKeyword) {
      addExpressionReference(node, node.arguments[0], "dynamic-import", "dynamic import")
    } else if (ts.isCallExpression(node)) {
      const requireKind = getRequireBindingKind(node.expression)
      if (requireKind) {
        const label = requireKind === "require-resolve" ? "require.resolve call" : "require call"
        addExpressionReference(node, node.arguments[0], requireKind, label)
      }
    }

    if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) {
      addExpressionReference(
        node,
        node.moduleReference.expression,
        "import-equals",
        "import equals declaration",
      )
    }

    if (ts.isImportTypeNode(node)) {
      const argument = ts.isLiteralTypeNode(node.argument) ? node.argument.literal : null
      addExpressionReference(node, argument, "import-type", "import type")
    }

    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return references
}

export function getImportBindings(rootDir, sourceFile) {
  const bindings = new Map()

  for (const statement of sourceFile.statements) {
    if (
      !ts.isImportDeclaration(statement) ||
      !statement.importClause ||
      !ts.isStringLiteral(statement.moduleSpecifier)
    ) {
      continue
    }

    const moduleSpecifier = statement.moduleSpecifier.text
    const resolvedPath = resolveModulePath(rootDir, sourceFile.fileName, moduleSpecifier)
    const importClause = statement.importClause

    if (importClause.name) {
      bindings.set(importClause.name.text, {
        importedName: "default",
        moduleSpecifier,
        resolvedPath,
      })
    }

    if (importClause.namedBindings && ts.isNamedImports(importClause.namedBindings)) {
      for (const element of importClause.namedBindings.elements) {
        bindings.set(element.name.text, {
          importedName: element.propertyName?.text ?? element.name.text,
          moduleSpecifier,
          resolvedPath,
        })
      }
    } else if (importClause.namedBindings && ts.isNamespaceImport(importClause.namedBindings)) {
      bindings.set(importClause.namedBindings.name.text, {
        importedName: "*",
        moduleSpecifier,
        resolvedPath,
      })
    }
  }

  return bindings
}

export function getExportedComponentNames(sourceFile) {
  const localComponentNames = new Set()
  const exportedNames = new Set()

  for (const statement of sourceFile.statements) {
    if (ts.isFunctionDeclaration(statement) && statement.name && /^[A-Z]/u.test(statement.name.text)) {
      localComponentNames.add(statement.name.text)
      if (hasExportModifier(statement)) exportedNames.add(statement.name.text)
      continue
    }

    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (!ts.isIdentifier(declaration.name) || !/^[A-Z]/u.test(declaration.name.text)) continue
        localComponentNames.add(declaration.name.text)
        if (hasExportModifier(statement)) exportedNames.add(declaration.name.text)
      }
    }
  }

  for (const statement of sourceFile.statements) {
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
      const localName = element.propertyName?.text ?? element.name.text
      if (localComponentNames.has(localName) && /^[A-Z]/u.test(element.name.text)) {
        exportedNames.add(element.name.text)
      }
    }
  }

  return [...exportedNames].sort()
}

export function getCsfStoryExportNames(sourceFile) {
  const metaBindingName = getDefaultMetaBindingName(sourceFile)
  if (metaBindingName && hasCsfMetaMutation(sourceFile, metaBindingName)) return []

  const storyVariableNames = new Set()
  const exportedNames = new Set()

  for (const statement of sourceFile.statements) {
    if (!ts.isVariableStatement(statement)) continue

    for (const declaration of statement.declarationList.declarations) {
      if (!ts.isIdentifier(declaration.name) || !declaration.initializer) continue
      const initializer = unwrapExpression(declaration.initializer)
      if (!ts.isObjectLiteralExpression(initializer)) continue

      storyVariableNames.add(declaration.name.text)
      if (hasExportModifier(statement) && /^[A-Z]/u.test(declaration.name.text)) {
        exportedNames.add(declaration.name.text)
      }
    }
  }

  for (const statement of sourceFile.statements) {
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
      const localName = element.propertyName?.text ?? element.name.text
      if (storyVariableNames.has(localName) && /^[A-Z]/u.test(element.name.text)) {
        exportedNames.add(element.name.text)
      }
    }
  }

  const meta = getDefaultMetaObject(sourceFile)
  const includeStories = getStoryExportMatcher(sourceFile, meta, "includeStories")
  const excludeStories = getStoryExportMatcher(sourceFile, meta, "excludeStories")
  if (includeStories === undefined || excludeStories === undefined) return []

  return [...exportedNames]
    .filter(
      (exportedName) =>
        (includeStories === null || includeStories(exportedName)) &&
        (excludeStories === null || !excludeStories(exportedName)),
    )
    .sort()
}

function getStaticMetaPropertyValue(sourceFile, meta, propertyName) {
  if (!meta) return null

  let value = null

  for (const property of meta.properties) {
    if (ts.isSpreadAssignment(property)) return undefined

    if (!property.name) continue
    const name = propertyNameText(property.name)
    if (name === null) return undefined
    if (name !== propertyName) continue

    if (ts.isPropertyAssignment(property)) {
      value = unwrapExpression(property.initializer)
      continue
    }

    if (ts.isShorthandPropertyAssignment(property)) {
      value = findVariableInitializer(sourceFile, property.name.text) ?? undefined
      continue
    }

    value = undefined
  }

  return value
}

function getStoryExportMatcher(sourceFile, meta, propertyName) {
  const filter = getStaticMetaPropertyValue(sourceFile, meta, propertyName)
  if (filter === undefined) return undefined
  if (!filter) return null

  const names = getStringArrayValue(filter)
  if (names) {
    const allowedNames = new Set(names)
    return (exportedName) => allowedNames.has(exportedName)
  }

  if (ts.isRegularExpressionLiteral(filter)) {
    const closingSlash = filter.text.lastIndexOf("/")
    if (closingSlash <= 0) return undefined

    try {
      const pattern = filter.text.slice(1, closingSlash)
      const flags = filter.text.slice(closingSlash + 1)
      const expression = new RegExp(pattern, flags)
      return (exportedName) => exportedName.match(expression) !== null
    } catch {
      return undefined
    }
  }

  return undefined
}

export function containsReferencedIdentifier(sourceFile, identifierNames) {
  const found = new Set()
  const typeChecker = createSourceFileTypeChecker(sourceFile)
  const globalThisAliasSymbols = new Set()
  const browserGlobalAliasNames = new Map()
  const aliasCandidates = []
  const destructuringCandidates = []

  const getSymbol = (identifier) => typeChecker.getSymbolAtLocation(identifier)

  const getStaticComputedPropertyName = (expression, visited = new Set()) => {
    const current = unwrapExpression(expression)
    const literalValue = getStringLiteralValue(current)
    if (literalValue !== null) return literalValue
    if (ts.isNumericLiteral(current)) return current.text
    if (!ts.isIdentifier(current)) return null

    const symbol = getSymbol(current)
    if (!symbol || visited.has(symbol)) return null
    visited.add(symbol)

    const declaration = symbol.declarations?.find(
      (candidate) =>
        ts.isVariableDeclaration(candidate) &&
        candidate.initializer &&
        ts.isVariableDeclarationList(candidate.parent) &&
        (candidate.parent.flags & ts.NodeFlags.Const) !== 0,
    )
    if (!declaration || !ts.isVariableDeclaration(declaration) || !declaration.initializer) return null

    return getStaticComputedPropertyName(declaration.initializer, visited)
  }

  const getResolvedPropertyAccess = (expression) => {
    const current = unwrapExpression(expression)
    if (ts.isPropertyAccessExpression(current)) {
      return { owner: unwrapExpression(current.expression), propertyName: current.name.text }
    }
    if (ts.isElementAccessExpression(current) && current.argumentExpression) {
      return {
        owner: unwrapExpression(current.expression),
        propertyName: getStaticComputedPropertyName(current.argumentExpression),
      }
    }

    return null
  }

  const isGlobalThisReference = (expression) => {
    const current = unwrapExpression(expression)
    if (!ts.isIdentifier(current)) return false

    const symbol = getSymbol(current)
    return (
      (current.text === "globalThis" && !symbol?.declarations?.length) ||
      (symbol !== undefined && globalThisAliasSymbols.has(symbol))
    )
  }

  const collectAliasCandidates = (node) => {
    if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
      if (ts.isIdentifier(node.name)) {
        const symbol = getSymbol(node.name)
        if (symbol) aliasCandidates.push({ expression: node.initializer, symbol })
      } else if (ts.isObjectBindingPattern(node.name)) {
        destructuringCandidates.push({ expression: node.initializer, pattern: node.name })
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

  const addBrowserGlobalAlias = (symbol, globalNames) => {
    const currentNames = browserGlobalAliasNames.get(symbol) ?? new Set()
    const previousSize = currentNames.size
    for (const globalName of globalNames) currentNames.add(globalName)
    browserGlobalAliasNames.set(symbol, currentNames)
    return currentNames.size !== previousSize
  }

  const addGlobalThisAlias = (symbol) => {
    if (globalThisAliasSymbols.has(symbol)) return false
    globalThisAliasSymbols.add(symbol)
    return true
  }

  const bindGlobalThisPattern = (pattern, inheritedGlobalName = null, isRoot = true) => {
    let changed = false

    for (const element of pattern.elements) {
      if (element.dotDotDotToken) {
        if (!ts.isIdentifier(element.name)) continue
        const symbol = getSymbol(element.name)
        if (!symbol) continue

        if (inheritedGlobalName) {
          if (addBrowserGlobalAlias(symbol, [inheritedGlobalName])) changed = true
        } else if (isRoot && addGlobalThisAlias(symbol)) {
          changed = true
        }
        continue
      }

      const propertyName = element.propertyName
        ? propertyNameText(element.propertyName)
        : ts.isIdentifier(element.name)
          ? element.name.text
          : null
      const globalName =
        inheritedGlobalName ??
        (isRoot && propertyName !== null && identifierNames.has(propertyName) ? propertyName : null)

      if (ts.isIdentifier(element.name)) {
        const symbol = getSymbol(element.name)
        if (symbol && globalName && addBrowserGlobalAlias(symbol, [globalName])) changed = true
      } else if (ts.isObjectBindingPattern(element.name)) {
        if (bindGlobalThisPattern(element.name, globalName, false)) changed = true
      }
    }

    return changed
  }

  let discoveredAlias = true
  while (discoveredAlias) {
    discoveredAlias = false

    for (const candidate of aliasCandidates) {
      if (globalThisAliasSymbols.has(candidate.symbol)) continue
      if (!isGlobalThisReference(candidate.expression)) continue
      if (addGlobalThisAlias(candidate.symbol)) discoveredAlias = true
    }

    for (const candidate of destructuringCandidates) {
      if (!isGlobalThisReference(candidate.expression)) continue
      if (bindGlobalThisPattern(candidate.pattern)) discoveredAlias = true
    }
  }

  const getBrowserGlobalNames = (expression) => {
    const current = unwrapExpression(expression)

    if (ts.isIdentifier(current)) {
      const symbol = getSymbol(current)
      if (symbol && browserGlobalAliasNames.has(symbol)) {
        return browserGlobalAliasNames.get(symbol)
      }
      if (identifierNames.has(current.text) && !symbol?.declarations?.length) {
        return new Set([current.text])
      }
      return null
    }

    const access = getResolvedPropertyAccess(current)
    if (access && isGlobalThisReference(access.owner)) {
      if (access.propertyName === null) return new Set(identifierNames)
      if (identifierNames.has(access.propertyName)) return new Set([access.propertyName])
    }

    return null
  }

  let discoveredBrowserGlobalAlias = true
  while (discoveredBrowserGlobalAlias) {
    discoveredBrowserGlobalAlias = false

    for (const candidate of aliasCandidates) {
      const globalNames = getBrowserGlobalNames(candidate.expression)
      if (!globalNames) continue
      if (addBrowserGlobalAlias(candidate.symbol, globalNames)) discoveredBrowserGlobalAlias = true
    }
  }

  const isIdentifierInTypePosition = (identifier) => {
    let current = identifier.parent

    while (current && !ts.isStatement(current) && !ts.isExpression(current)) {
      if (ts.isTypeNode(current)) return true
      current = current.parent
    }

    return false
  }

  const isNonReferenceIdentifier = (identifier) => {
    const parent = identifier.parent
    if (!parent) return true
    if (isIdentifierInTypePosition(identifier)) return true
    if (ts.isShorthandPropertyAssignment(parent)) return false
    if ("name" in parent && parent.name === identifier) return true
    if (ts.isBindingElement(parent) && parent.propertyName === identifier) return true
    if (ts.isExportSpecifier(parent) || ts.isQualifiedName(parent)) return true
    if (
      (ts.isLabeledStatement(parent) || ts.isBreakStatement(parent) || ts.isContinueStatement(parent)) &&
      parent.label === identifier
    ) {
      return true
    }

    return false
  }

  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const owner = unwrapExpression(node.expression)
      if (isGlobalThisReference(owner) && identifierNames.has(node.name.text)) {
        found.add(node.name.text)
      }
    }

    if (ts.isElementAccessExpression(node) && node.argumentExpression) {
      const owner = unwrapExpression(node.expression)
      if (isGlobalThisReference(owner)) {
        const propertyName = getStaticComputedPropertyName(node.argumentExpression)
        if (propertyName === null) {
          for (const globalName of identifierNames) found.add(globalName)
        } else if (identifierNames.has(propertyName)) {
          found.add(propertyName)
        }
      }
    }

    if (ts.isIdentifier(node) && !isNonReferenceIdentifier(node)) {
      const symbol = getSymbol(node)
      const aliasNames = symbol ? browserGlobalAliasNames.get(symbol) : null
      if (aliasNames) {
        for (const globalName of aliasNames) found.add(globalName)
      } else if (identifierNames.has(node.text) && symbol === undefined) {
        found.add(node.text)
      }
    }

    ts.forEachChild(node, visit)
  }
  visit(sourceFile)

  return found
}

export function hasWildcardExport(sourceFile) {
  return sourceFile.statements.some(
    (statement) =>
      ts.isExportDeclaration(statement) &&
      Boolean(statement.moduleSpecifier) &&
      (!statement.exportClause || ts.isNamespaceExport(statement.exportClause)),
  )
}

export function createFinding(ruleId, file, subject, message) {
  return {
    file,
    fingerprint: `${ruleId}|${file}|${subject}`,
    message,
    ruleId,
    subject,
  }
}

export function uniqueSortedFindings(findings) {
  return [...new Map(findings.map((finding) => [finding.fingerprint, finding])).values()].sort((a, b) =>
    a.fingerprint.localeCompare(b.fingerprint),
  )
}
