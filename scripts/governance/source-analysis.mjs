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

  const addReference = (moduleSpecifier, kind) => {
    references.push({
      kind,
      moduleSpecifier,
      resolvedPath: resolveModulePath(rootDir, sourceFile.fileName, moduleSpecifier),
    })
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
      const argument = node.arguments[0] ? unwrapExpression(node.arguments[0]) : null
      const moduleSpecifier = getStringLiteralValue(argument)

      if (moduleSpecifier !== null) {
        addReference(moduleSpecifier, "dynamic-import")
      } else {
        const { line } = sourceFile.getLineAndCharacterOfPosition(node.getStart(sourceFile))
        references.push({
          kind: "unresolved-dynamic-import",
          moduleSpecifier: `<dynamic import at line ${line + 1}>`,
          resolvedPath: null,
        })
      }
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

  const visit = (node) => {
    if (ts.isPropertyAccessExpression(node)) {
      const owner = unwrapExpression(node.expression)
      if (ts.isIdentifier(owner) && owner.text === "globalThis" && identifierNames.has(node.name.text)) {
        found.add(node.name.text)
      }
    }

    if (ts.isElementAccessExpression(node) && node.argumentExpression) {
      const owner = unwrapExpression(node.expression)
      const propertyName = getStringLiteralValue(unwrapExpression(node.argumentExpression))
      if (
        ts.isIdentifier(owner) &&
        owner.text === "globalThis" &&
        propertyName !== null &&
        identifierNames.has(propertyName)
      ) {
        found.add(propertyName)
      }
    }

    if (ts.isIdentifier(node) && identifierNames.has(node.text)) {
      const parent = node.parent
      const isPropertyName =
        (ts.isPropertyAccessExpression(parent) && parent.name === node) ||
        ((ts.isPropertyAssignment(parent) || ts.isPropertyDeclaration(parent)) && parent.name === node)
      const isDeclarationName =
        (ts.isVariableDeclaration(parent) ||
          ts.isFunctionDeclaration(parent) ||
          ts.isParameter(parent) ||
          ts.isImportSpecifier(parent)) &&
        parent.name === node

      if (!isPropertyName && !isDeclarationName) found.add(node.text)
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
