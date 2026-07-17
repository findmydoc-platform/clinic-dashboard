import fs from "node:fs"
import path from "node:path"
import ts from "typescript"

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".cts"]
const EXECUTABLE_JAVASCRIPT_EXTENSIONS = [".js", ".jsx", ".mjs", ".cjs"]
const moduleResolutionConfigByRoot = new Map()
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

export function createBindingMutationDetector(sourceFile) {
  const typeChecker = createSourceFileTypeChecker(sourceFile)
  const results = new Map()

  return (bindingName) => {
    if (results.has(bindingName)) return results.get(bindingName)

    let bindingIdentifier = null
    for (const statement of sourceFile.statements) {
      if (!ts.isVariableStatement(statement)) continue

      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name) && declaration.name.text === bindingName) {
          bindingIdentifier = declaration.name
          break
        }
      }
      if (bindingIdentifier) break
    }

    const bindingSymbol = bindingIdentifier ? typeChecker.getSymbolAtLocation(bindingIdentifier) : undefined
    if (!bindingSymbol) {
      results.set(bindingName, true)
      return true
    }

    let hasMutation = false
    const aliasSymbols = new Set([bindingSymbol])
    const taintedPropertyPathsBySymbol = new Map()
    const aliasCandidates = []
    const destructuringCandidates = []
    const assignmentPatternCandidates = []
    const propertyAliasCandidates = []
    const getSymbol = (identifier) => typeChecker.getSymbolAtLocation(identifier)

    const getStaticAccessPath = (expression) => {
      const current = unwrapExpression(expression)
      if (ts.isIdentifier(current)) {
        const symbol = getSymbol(current)
        return symbol ? { path: [], symbol } : null
      }

      if (ts.isPropertyAccessExpression(current)) {
        const ownerPath = getStaticAccessPath(current.expression)
        return ownerPath ? { ...ownerPath, path: [...ownerPath.path, current.name.text] } : null
      }

      if (ts.isElementAccessExpression(current) && current.argumentExpression) {
        const property = unwrapExpression(current.argumentExpression)
        if (
          !ts.isStringLiteral(property) &&
          !ts.isNoSubstitutionTemplateLiteral(property) &&
          !ts.isNumericLiteral(property)
        ) {
          return null
        }

        const ownerPath = getStaticAccessPath(current.expression)
        return ownerPath ? { ...ownerPath, path: [...ownerPath.path, property.text] } : null
      }

      return null
    }

    const propertyPathKey = (propertyPath) => JSON.stringify(propertyPath)

    const addTaintedPropertyTarget = (target) => {
      const accessPath = getStaticAccessPath(target)
      if (!accessPath || accessPath.path.length === 0 || aliasSymbols.has(accessPath.symbol)) return false

      const paths = taintedPropertyPathsBySymbol.get(accessPath.symbol) ?? new Map()
      const key = propertyPathKey(accessPath.path)
      if (paths.has(key)) return false
      paths.set(key, accessPath.path)
      taintedPropertyPathsBySymbol.set(accessPath.symbol, paths)
      return true
    }

    const getMatchingTaintedPropertyPath = (expression) => {
      const accessPath = getStaticAccessPath(expression)
      if (!accessPath) return null
      if (aliasSymbols.has(accessPath.symbol)) return { accessPath, taintedPath: [] }

      const paths = taintedPropertyPathsBySymbol.get(accessPath.symbol)
      if (!paths) return null

      const taintedPath = [...paths.values()].find(
        (candidate) =>
          candidate.length <= accessPath.path.length &&
          candidate.every((segment, index) => segment === accessPath.path[index]),
      )
      return taintedPath ? { accessPath, taintedPath } : null
    }

    const isTainted = (expression) => {
      const current = unwrapExpression(expression)
      return (
        (ts.isIdentifier(current) ||
          ts.isPropertyAccessExpression(current) ||
          ts.isElementAccessExpression(current)) &&
        getMatchingTaintedPropertyPath(current) !== null
      )
    }

    const containsTaintedReference = (expression) => {
      const current = unwrapExpression(expression)
      if (isTainted(current)) return true

      if (ts.isObjectLiteralExpression(current)) {
        return current.properties.some((property) => {
          if (ts.isSpreadAssignment(property)) return containsTaintedReference(property.expression)
          if (ts.isPropertyAssignment(property)) return containsTaintedReference(property.initializer)
          if (ts.isShorthandPropertyAssignment(property)) {
            const symbol = typeChecker.getShorthandAssignmentValueSymbol(property)
            return symbol !== undefined && aliasSymbols.has(symbol)
          }
          return false
        })
      }

      if (ts.isArrayLiteralExpression(current)) {
        return current.elements.some((element) =>
          ts.isSpreadElement(element)
            ? containsTaintedReference(element.expression)
            : containsTaintedReference(element),
        )
      }

      return false
    }

    const collectAliasCandidates = (node) => {
      if ((ts.isVariableDeclaration(node) || ts.isParameter(node)) && node.initializer) {
        if (ts.isIdentifier(node.name)) {
          const symbol = getSymbol(node.name)
          if (symbol) aliasCandidates.push({ expression: node.initializer, symbol })
        } else if (ts.isObjectBindingPattern(node.name) || ts.isArrayBindingPattern(node.name)) {
          destructuringCandidates.push({ expression: node.initializer, pattern: node.name })
        }
      }

      if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        const assignmentTarget = unwrapExpression(node.left)
        if (ts.isIdentifier(assignmentTarget)) {
          const symbol = getSymbol(assignmentTarget)
          if (symbol) aliasCandidates.push({ expression: node.right, symbol })
        } else if (
          ts.isObjectLiteralExpression(assignmentTarget) ||
          ts.isArrayLiteralExpression(assignmentTarget)
        ) {
          assignmentPatternCandidates.push({ expression: node.right, pattern: assignmentTarget })
        } else if (
          ts.isPropertyAccessExpression(assignmentTarget) ||
          ts.isElementAccessExpression(assignmentTarget)
        ) {
          propertyAliasCandidates.push({ expression: node.right, target: assignmentTarget })
        }
      }

      ts.forEachChild(node, collectAliasCandidates)
    }

    collectAliasCandidates(sourceFile)

    const bindPattern = (pattern) => {
      let changed = false

      for (const element of pattern.elements) {
        if (ts.isOmittedExpression(element)) continue

        if (ts.isIdentifier(element.name)) {
          const symbol = getSymbol(element.name)
          if (symbol && !aliasSymbols.has(symbol)) {
            aliasSymbols.add(symbol)
            changed = true
          }
        } else if (
          (ts.isObjectBindingPattern(element.name) || ts.isArrayBindingPattern(element.name)) &&
          bindPattern(element.name)
        ) {
          changed = true
        }
      }

      return changed
    }

    const bindAssignmentTarget = (target) => {
      const current = unwrapExpression(target)

      if (ts.isIdentifier(current)) {
        const symbol = getSymbol(current)
        if (!symbol || aliasSymbols.has(symbol)) return false
        aliasSymbols.add(symbol)
        return true
      }

      if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
        return bindAssignmentTarget(current.left)
      }

      if (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) {
        return addTaintedPropertyTarget(current)
      }

      if (ts.isArrayLiteralExpression(current)) {
        let changed = false
        for (const element of current.elements) {
          if (ts.isOmittedExpression(element)) continue
          const elementTarget = ts.isSpreadElement(element) ? element.expression : element
          if (bindAssignmentTarget(elementTarget)) changed = true
        }
        return changed
      }

      if (ts.isObjectLiteralExpression(current)) {
        let changed = false
        for (const property of current.properties) {
          if (ts.isShorthandPropertyAssignment(property)) {
            const symbol = typeChecker.getShorthandAssignmentValueSymbol(property)
            if (symbol && !aliasSymbols.has(symbol)) {
              aliasSymbols.add(symbol)
              changed = true
            }
          } else if (ts.isPropertyAssignment(property)) {
            if (bindAssignmentTarget(property.initializer)) changed = true
          } else if (ts.isSpreadAssignment(property)) {
            if (bindAssignmentTarget(property.expression)) changed = true
          }
        }
        return changed
      }

      return false
    }

    let discoveredAlias = true
    while (discoveredAlias) {
      discoveredAlias = false

      for (const candidate of aliasCandidates) {
        if (aliasSymbols.has(candidate.symbol) || !containsTaintedReference(candidate.expression)) continue
        aliasSymbols.add(candidate.symbol)
        discoveredAlias = true
      }

      for (const candidate of destructuringCandidates) {
        if (containsTaintedReference(candidate.expression) && bindPattern(candidate.pattern)) {
          discoveredAlias = true
        }
      }

      for (const candidate of assignmentPatternCandidates) {
        if (containsTaintedReference(candidate.expression) && bindAssignmentTarget(candidate.pattern)) {
          discoveredAlias = true
        }
      }

      for (const candidate of propertyAliasCandidates) {
        if (containsTaintedReference(candidate.expression) && addTaintedPropertyTarget(candidate.target)) {
          discoveredAlias = true
        }
      }
    }

    const isPropertyTarget = (expression) => {
      const current = unwrapExpression(expression)
      return (
        (ts.isPropertyAccessExpression(current) || ts.isElementAccessExpression(current)) &&
        isTainted(current)
      )
    }

    const isBindingReassignment = (expression) => {
      const current = unwrapExpression(expression)
      return ts.isIdentifier(current) && getSymbol(current) === bindingSymbol
    }

    const replacesTrackedAliasSlot = (node) => {
      if (!ts.isBinaryExpression(node) || node.operatorToken.kind !== ts.SyntaxKind.EqualsToken) return false

      const match = getMatchingTaintedPropertyPath(node.left)
      return (
        match !== null &&
        match.taintedPath.length > 0 &&
        match.taintedPath.length === match.accessPath.path.length
      )
    }

    const visit = (node) => {
      if (hasMutation) return

      if (ts.isCallExpression(node) || ts.isNewExpression(node)) {
        const argumentsContainBinding = (node.arguments ?? []).some((argument) =>
          ts.isSpreadElement(argument)
            ? containsTaintedReference(argument.expression)
            : containsTaintedReference(argument),
        )
        const callsBindingMethod = isTainted(node.expression)
        if (argumentsContainBinding || callsBindingMethod) {
          hasMutation = true
          return
        }
      }

      if (
        ts.isBinaryExpression(node) &&
        ts.isAssignmentOperator(node.operatorToken.kind) &&
        ((isPropertyTarget(node.left) && !replacesTrackedAliasSlot(node)) || isBindingReassignment(node.left))
      ) {
        hasMutation = true
        return
      }

      if (
        (ts.isPrefixUnaryExpression(node) || ts.isPostfixUnaryExpression(node)) &&
        (node.operator === ts.SyntaxKind.PlusPlusToken || node.operator === ts.SyntaxKind.MinusMinusToken) &&
        (isPropertyTarget(node.operand) || isBindingReassignment(node.operand))
      ) {
        hasMutation = true
        return
      }

      if (ts.isDeleteExpression(node) && isPropertyTarget(node.expression)) {
        hasMutation = true
        return
      }

      ts.forEachChild(node, visit)
    }

    visit(sourceFile)
    results.set(bindingName, hasMutation)
    return hasMutation
  }
}

function isPathInside(directory, filePath) {
  const relativePath = path.relative(path.resolve(directory), path.resolve(filePath))
  return (
    relativePath === "" ||
    (relativePath !== ".." && !relativePath.startsWith(`..${path.sep}`) && !path.isAbsolute(relativePath))
  )
}

function realRootPath(rootDir) {
  return fs.existsSync(rootDir) ? fs.realpathSync(rootDir) : path.resolve(rootDir)
}

function isPathInsideRoot(rootDir, filePath) {
  return isPathInside(rootDir, filePath) || isPathInside(realRootPath(rootDir), filePath)
}

function toRootRelative(rootDir, filePath) {
  const matchingRoot = isPathInside(rootDir, filePath) ? rootDir : realRootPath(rootDir)
  return toRelative(matchingRoot, filePath)
}

function isGovernedLocalPath(rootDir, filePath) {
  if (!isPathInsideRoot(rootDir, filePath)) return false

  const relativePath = toRootRelative(rootDir, filePath)
  return !relativePath.split("/").includes("node_modules")
}

function formatConfigDiagnostic(diagnostic) {
  return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n")
}

function getModuleResolutionConfig(rootDir) {
  const normalizedRoot = path.resolve(rootDir)
  const cachedConfig = moduleResolutionConfigByRoot.get(normalizedRoot)
  if (cachedConfig) return cachedConfig

  const configPath = ts.findConfigFile(normalizedRoot, ts.sys.fileExists, "tsconfig.json")
  if (!configPath) {
    const fallbackConfig = {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        moduleResolution: ts.ModuleResolutionKind.Bundler,
        paths: { "@/*": ["src/*"] },
        pathsBasePath: normalizedRoot,
      },
      projectFileNames: null,
    }
    moduleResolutionConfigByRoot.set(normalizedRoot, fallbackConfig)
    return fallbackConfig
  }

  const configFile = ts.readConfigFile(configPath, ts.sys.readFile)
  if (configFile.error) {
    throw new Error(`Cannot read ${configPath}: ${formatConfigDiagnostic(configFile.error)}`)
  }

  const parsedConfig = ts.parseJsonConfigFileContent(
    configFile.config,
    ts.sys,
    path.dirname(configPath),
    undefined,
    configPath,
  )
  const configError = parsedConfig.errors.find((diagnostic) => diagnostic.code !== 18003)
  if (configError) {
    throw new Error(`Cannot parse ${configPath}: ${formatConfigDiagnostic(configError)}`)
  }

  const moduleResolutionConfig = {
    compilerOptions: parsedConfig.options,
    projectFileNames: parsedConfig.fileNames,
  }
  moduleResolutionConfigByRoot.set(normalizedRoot, moduleResolutionConfig)
  return moduleResolutionConfig
}

export function collectProjectSourceFiles(rootDir) {
  const { projectFileNames } = getModuleResolutionConfig(rootDir)
  if (projectFileNames === null) return collectSourceFiles(rootDir, ["src", "tests"])

  return [...new Set(projectFileNames.map((filePath) => path.resolve(filePath)))]
    .filter((filePath) => isGovernedLocalPath(rootDir, filePath))
    .filter((filePath) => SOURCE_EXTENSIONS.includes(path.extname(filePath)))
    .filter((filePath) => {
      const pathSegments = toRootRelative(rootDir, filePath).split("/")
      return !pathSegments.some((segment) => IGNORED_DIRECTORIES.has(segment))
    })
    .sort()
}

function matchPathPattern(pattern, moduleSpecifier) {
  const wildcardIndex = pattern.indexOf("*")
  if (wildcardIndex === -1) {
    return pattern === moduleSpecifier ? { pattern, prefixLength: pattern.length, wildcard: null } : null
  }

  const prefix = pattern.slice(0, wildcardIndex)
  const suffix = pattern.slice(wildcardIndex + 1)
  if (!moduleSpecifier.startsWith(prefix) || !moduleSpecifier.endsWith(suffix)) return null
  if (moduleSpecifier.length < prefix.length + suffix.length) return null

  return {
    pattern,
    prefixLength: prefix.length,
    wildcard: moduleSpecifier.slice(prefix.length, moduleSpecifier.length - suffix.length),
  }
}

function matchingPathEntry(paths, moduleSpecifier) {
  return Object.entries(paths)
    .map(([pattern, targets]) => ({ match: matchPathPattern(pattern, moduleSpecifier), targets }))
    .filter(({ match, targets }) => match && Array.isArray(targets))
    .sort((left, right) => {
      const exactDifference = Number(right.match.wildcard === null) - Number(left.match.wildcard === null)
      return exactDifference || right.match.prefixLength - left.match.prefixLength
    })[0]
}

function unresolvedConfiguredPath(rootDir, moduleSpecifier, compilerOptions) {
  const pathEntry = matchingPathEntry(compilerOptions.paths ?? {}, moduleSpecifier)
  if (!pathEntry || pathEntry.match.pattern === "*") return null

  const pathsBasePath = path.resolve(compilerOptions.baseUrl ?? compilerOptions.pathsBasePath ?? rootDir)
  for (const target of pathEntry.targets) {
    const mappedTarget =
      pathEntry.match.wildcard === null ? target : target.replace("*", pathEntry.match.wildcard)
    const unresolvedPath = path.resolve(pathsBasePath, mappedTarget)
    if (isGovernedLocalPath(rootDir, unresolvedPath)) {
      return toRootRelative(rootDir, unresolvedPath)
    }
  }

  return null
}

function resolveModulePath(rootDir, sourceFilePath, moduleSpecifier) {
  const { compilerOptions } = getModuleResolutionConfig(rootDir)
  const resolvedModule = ts.resolveModuleName(
    moduleSpecifier,
    sourceFilePath,
    compilerOptions,
    ts.sys,
  ).resolvedModule

  if (resolvedModule) {
    const resolvedPath = fs.realpathSync(resolvedModule.resolvedFileName)
    if (resolvedModule.isExternalLibraryImport || !isGovernedLocalPath(rootDir, resolvedPath)) {
      return null
    }

    return toRootRelative(rootDir, resolvedPath)
  }

  if (moduleSpecifier.startsWith(".")) {
    return toRootRelative(rootDir, path.resolve(path.dirname(sourceFilePath), moduleSpecifier))
  }

  return unresolvedConfiguredPath(rootDir, moduleSpecifier, compilerOptions)
}

export function getModuleReferences(rootDir, sourceFile) {
  const references = []
  const typeChecker = createSourceFileTypeChecker(sourceFile)
  const requireAliasSymbols = new Set()
  const requireResolveAliasSymbols = new Set()
  const aliasCandidates = []
  const destructuringCandidates = []
  const assignmentPatternCandidates = []
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

    if (ts.isBinaryExpression(node) && node.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      const assignmentTarget = unwrapExpression(node.left)
      if (ts.isIdentifier(assignmentTarget)) {
        const symbol = getSymbol(assignmentTarget)
        if (symbol) aliasCandidates.push({ expression: node.right, symbol })
      } else if (
        ts.isObjectLiteralExpression(assignmentTarget) ||
        ts.isArrayLiteralExpression(assignmentTarget)
      ) {
        assignmentPatternCandidates.push({ expression: node.right, pattern: assignmentTarget })
      }
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

  const bindRequireAssignmentTarget = (target, sourceKind) => {
    const current = unwrapExpression(target)

    if (ts.isIdentifier(current)) {
      const symbol = getSymbol(current)
      return symbol ? addRequireAlias(symbol, sourceKind) : false
    }

    if (ts.isBinaryExpression(current) && current.operatorToken.kind === ts.SyntaxKind.EqualsToken) {
      return bindRequireAssignmentTarget(current.left, sourceKind)
    }

    if (!ts.isObjectLiteralExpression(current)) return false

    let changed = false
    for (const property of current.properties) {
      const propertyName = property.name ? propertyNameText(property.name) : null
      const childKind = ts.isSpreadAssignment(property)
        ? sourceKind
        : sourceKind === "require" && propertyName === "resolve"
          ? "require-resolve"
          : sourceKind === "require-resolve"
            ? "require-resolve"
            : null
      if (!childKind) continue

      if (ts.isShorthandPropertyAssignment(property)) {
        const symbol = typeChecker.getShorthandAssignmentValueSymbol(property)
        if (symbol && addRequireAlias(symbol, childKind)) changed = true
        continue
      }

      const propertyTarget = ts.isPropertyAssignment(property)
        ? property.initializer
        : ts.isSpreadAssignment(property)
          ? property.expression
          : null
      if (propertyTarget && bindRequireAssignmentTarget(propertyTarget, childKind)) changed = true
    }

    return changed
  }

  const getObjectLiteralValues = (objectLiteral) => {
    const values = new Map()
    for (const property of objectLiteral.properties) {
      const propertyName = property.name ? propertyNameText(property.name) : null
      if (propertyName === null) continue

      if (ts.isPropertyAssignment(property)) {
        values.set(propertyName, property.initializer)
      } else if (ts.isShorthandPropertyAssignment(property)) {
        values.set(propertyName, property.name)
      }
    }
    return values
  }

  const bindRequireAssignmentPattern = (target, source) => {
    const sourceKind = getRequireBindingKind(source)
    if (sourceKind) return bindRequireAssignmentTarget(target, sourceKind)

    const currentTarget = unwrapExpression(target)
    const currentSource = unwrapExpression(source)
    if (ts.isArrayLiteralExpression(currentTarget) && ts.isArrayLiteralExpression(currentSource)) {
      let changed = false
      for (const [index, targetElement] of currentTarget.elements.entries()) {
        const sourceElement = currentSource.elements[index]
        if (!sourceElement || ts.isOmittedExpression(targetElement) || ts.isSpreadElement(targetElement)) {
          continue
        }

        const sourceExpression = ts.isSpreadElement(sourceElement) ? sourceElement.expression : sourceElement
        if (bindRequireAssignmentPattern(targetElement, sourceExpression)) changed = true
      }
      return changed
    }

    if (ts.isObjectLiteralExpression(currentTarget) && ts.isObjectLiteralExpression(currentSource)) {
      const sourceValues = getObjectLiteralValues(currentSource)
      let changed = false

      for (const property of currentTarget.properties) {
        if (ts.isSpreadAssignment(property)) continue
        const propertyName = property.name ? propertyNameText(property.name) : null
        const sourceExpression = propertyName === null ? null : sourceValues.get(propertyName)
        if (!sourceExpression) continue

        if (ts.isShorthandPropertyAssignment(property)) {
          const sourceKind = getRequireBindingKind(sourceExpression)
          const symbol = typeChecker.getShorthandAssignmentValueSymbol(property)
          if (sourceKind && symbol && addRequireAlias(symbol, sourceKind)) changed = true
          continue
        }

        const propertyTarget = ts.isPropertyAssignment(property) ? property.initializer : null
        if (propertyTarget && bindRequireAssignmentPattern(propertyTarget, sourceExpression)) changed = true
      }

      return changed
    }

    return false
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

    for (const candidate of assignmentPatternCandidates) {
      if (bindRequireAssignmentPattern(candidate.pattern, candidate.expression)) discoveredAlias = true
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
  if (metaBindingName && createBindingMutationDetector(sourceFile)(metaBindingName)) return []

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
