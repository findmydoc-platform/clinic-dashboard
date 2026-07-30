#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"

export const REVIEWER_ORDER = [
  "planning_reviewer",
  "logic_reviewer",
  "security_reviewer",
  "test_reviewer",
  "ui_reviewer",
]

const REVIEWER_PHASE = {
  planning_reviewer: "planning",
  logic_reviewer: "implementation",
  security_reviewer: "implementation",
  test_reviewer: "implementation",
  ui_reviewer: "implementation",
}

const OMITTED_REASONS = {
  planning_reviewer: "No plan, project-profile, access, data, migration, or rollout decision was detected.",
  logic_reviewer:
    "No production logic, state, mapping, server, controller, model, API, or executable tooling change was detected.",
  security_reviewer:
    "No auth, API, server, environment, workflow, dependency, persistence, secret, or reviewer trust boundary was detected.",
  test_reviewer:
    "No production behavior, test, test configuration, fixture, mock, or reviewer-contract change was detected.",
  ui_reviewer: "No TSX, style, story, theme, branding, or visual-asset change was detected.",
}

function normalizePath(value) {
  return value.replaceAll("\\", "/").replace(/^\.\//, "")
}

function unique(values) {
  return [...new Set(values)].sort()
}

function evidencePaths(paths, patterns) {
  return unique(paths.filter((path) => patterns.some((pattern) => pattern.test(path))))
}

function isTestPath(path) {
  return (
    /(^|\/)(__tests__|tests?|test|fixtures?|mocks?)(\/|$)/i.test(path) ||
    /\.(test|spec)\.[cm]?[jt]sx?$/i.test(path) ||
    /(^|\/)(vitest|playwright)\.config\.[cm]?[jt]s$/i.test(path) ||
    path === "vitest.config.ts"
  )
}

function isStoryPath(path) {
  return /\.stories\.[cm]?[jt]sx?$/i.test(path) || path.startsWith(".storybook/")
}

function isProductionSource(path) {
  return path.startsWith("src/") && !isTestPath(path) && !isStoryPath(path)
}

export function parseNameStatus(output) {
  if (!output.trim()) {
    return []
  }

  return output
    .trimEnd()
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const fields = line.split("\t")
      const status = fields[0]

      if (/^[RC]\d+$/.test(status)) {
        if (fields.length !== 3) {
          throw new Error(`Invalid rename or copy status line: ${line}`)
        }

        return {
          status,
          previousPath: normalizePath(fields[1]),
          path: normalizePath(fields[2]),
        }
      }

      if (fields.length !== 2) {
        throw new Error(`Invalid name-status line: ${line}`)
      }

      return { status, path: normalizePath(fields[1]) }
    })
}

export function parseNameStatusBuffer(output) {
  const fields = output.toString("utf8").split("\0")
  if (fields.at(-1) === "") {
    fields.pop()
  }

  const entries = []
  for (let index = 0; index < fields.length;) {
    const status = fields[index]
    index += 1

    if (/^[RC]\d+$/.test(status)) {
      if (index + 1 >= fields.length) {
        throw new Error(`Invalid NUL-delimited rename or copy status: ${status}`)
      }
      entries.push({
        status,
        previousPath: normalizePath(fields[index]),
        path: normalizePath(fields[index + 1]),
      })
      index += 2
    } else {
      if (index >= fields.length) {
        throw new Error(`Invalid NUL-delimited name status: ${status}`)
      }
      entries.push({ status, path: normalizePath(fields[index]) })
      index += 1
    }
  }

  return entries
}

export function mergeFileEntries(trackedEntries, untrackedPaths) {
  const entries = new Map()

  for (const entry of trackedEntries) {
    entries.set(entry.path, entry)
  }

  for (const path of untrackedPaths.map(normalizePath)) {
    if (path && !entries.has(path)) {
      entries.set(path, { status: "??", path })
    }
  }

  return [...entries.values()].sort((left, right) => left.path.localeCompare(right.path))
}

export function classifyReviewSurface(files) {
  const paths = unique(
    files.flatMap((file) => [file.path, file.previousPath].filter(Boolean).map(normalizePath)),
  )
  const signals = []

  const addSignal = (id, reason, matchedPaths) => {
    if (matchedPaths.length > 0) {
      signals.push({ id, reason, files: matchedPaths })
    }
  }

  const planningPaths = evidencePaths(paths, [
    /^docs\/plans\//i,
    /^docs\/adr\//i,
    /^\.codex\/project-profile\.toml$/i,
    /^docs\/.*(access|authorization|data|migration|rollout|release|privacy)/i,
  ])
  addSignal(
    "planning-decision",
    "Plan, access, data, migration, project-profile, or rollout decisions changed.",
    planningPaths,
  )

  const productionLogicPaths = unique(
    paths.filter((path) => {
      if (/^scripts\/.*\.[cm]?[jt]s$/i.test(path)) {
        return true
      }
      if (/^\.codex\/skills\/[^/]+\/scripts\/.*\.[cm]?[jt]s$/i.test(path)) {
        return true
      }
      if (!isProductionSource(path) || !/\.[cm]?[jt]sx?$/i.test(path)) {
        return false
      }
      if (/\.[cm]?[jt]s$/i.test(path)) {
        return true
      }
      return /(controller|model|action|route|api|state|reducer|hook|service|domain)/i.test(path)
    }),
  )
  addSignal(
    "behavioral-logic",
    "Production logic, state, mapping, controller, server, API, or executable tooling changed.",
    productionLogicPaths,
  )

  const securityPaths = evidencePaths(paths, [
    /(^|\/)(auth|authorization|security|csrf|session|cookie|api|server|env|secrets?|middleware)(\/|[.-]|$)/i,
    /(^|\/)(supabase|payload|persistence|migration|database|privacy|tenant|clinic-domain)(\/|[.-]|$)/i,
    /(^|\/)\.env(?:\.|$)/i,
    /(^|\/)proxy\.[cm]?[jt]sx?$/i,
    /(^|\/)next\.config\.[cm]?[jt]s$/i,
    /(^|\/)vercel\.json$/i,
    /^\.github\/workflows\//i,
    /(^|\/)(package\.json|pnpm-lock\.yaml|audit-ci\.jsonc)$/i,
    /^\.codex\/(agents\/|config\.toml$|skills\/review-gate\/)/i,
  ])
  addSignal(
    "security-boundary",
    "Auth, API, server, environment, workflow, dependency, persistence, or reviewer trust boundaries changed.",
    securityPaths,
  )

  const uiPaths = unique(
    paths.filter(
      (path) =>
        /\.tsx$/i.test(path) ||
        /\.(css|scss|sass|less)$/i.test(path) ||
        isStoryPath(path) ||
        /^public\/(brand|images?|icons?|fonts?)\//i.test(path) ||
        /(^|\/)(theme|branding|tokens?)(\/|[.-]|$)/i.test(path),
    ),
  )
  addSignal("user-interface", "TSX, styles, stories, themes, branding, or visual assets changed.", uiPaths)

  const testPaths = unique(
    paths.filter(
      (path) =>
        isTestPath(path) ||
        /^tests?\//i.test(path) ||
        /^\.codex\/(agents\/|config\.toml$|skills\/review-gate\/)/i.test(path) ||
        path === "eslint.config.mjs" ||
        path === "knip.json" ||
        path === "package.json" ||
        path === "pnpm-lock.yaml",
    ),
  )
  const productionBehaviorPaths = unique([
    ...productionLogicPaths,
    ...uiPaths.filter((path) => isProductionSource(path)),
  ])
  const testReviewPaths = unique([...testPaths, ...productionBehaviorPaths])
  addSignal(
    "verification-surface",
    "Production behavior, tests, test configuration, fixtures, mocks, or reviewer contracts changed.",
    testReviewPaths,
  )

  const reviewerReasons = {
    planning_reviewer: signals.filter((signal) => signal.id === "planning-decision"),
    logic_reviewer: signals.filter((signal) => signal.id === "behavioral-logic"),
    security_reviewer: signals.filter((signal) => signal.id === "security-boundary"),
    test_reviewer: signals.filter((signal) => signal.id === "verification-surface"),
    ui_reviewer: signals.filter((signal) => signal.id === "user-interface"),
  }

  const recommendedReviewers = []
  const omittedReviewers = []

  for (const name of REVIEWER_ORDER) {
    const matchedSignals = reviewerReasons[name]
    const phase = REVIEWER_PHASE[name]

    if (matchedSignals.length > 0) {
      recommendedReviewers.push({
        name,
        phase,
        reasons: matchedSignals.map((signal) => signal.reason),
      })
    } else {
      omittedReviewers.push({
        name,
        phase,
        reasons: [OMITTED_REASONS[name]],
      })
    }
  }

  return {
    riskSignals: signals,
    recommendedReviewers,
    omittedReviewers,
  }
}

export function parseCliArguments(argv) {
  const args = argv.filter((arg, index) => arg !== "--" || index !== 0)
  const options = {
    base: "origin/main",
    format: "json",
  }

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]

    if (argument === "--") {
      continue
    }
    if (argument === "--help" || argument === "-h") {
      return { ...options, help: true }
    }

    const separatorIndex = argument.indexOf("=")
    const key = separatorIndex === -1 ? argument : argument.slice(0, separatorIndex)
    const inlineValue = separatorIndex === -1 ? undefined : argument.slice(separatorIndex + 1)
    if (!["--base", "--format"].includes(key)) {
      throw new Error(`Unknown argument: ${argument}`)
    }

    const value = inlineValue ?? args[index + 1]
    if (!value || (inlineValue === undefined && value.startsWith("--"))) {
      throw new Error(`Missing value for ${key}`)
    }
    if (inlineValue === undefined) {
      index += 1
    }

    if (key === "--base") {
      options.base = value
    } else {
      options.format = value
    }
  }

  if (options.format !== "json") {
    throw new Error(`Unsupported format: ${options.format}`)
  }

  return options
}

function gitText(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim()
}

function gitBuffer(repositoryRoot, args) {
  return execFileSync("git", args, {
    cwd: repositoryRoot,
    encoding: "buffer",
    stdio: ["ignore", "pipe", "pipe"],
  })
}

export function collectReviewContext(options, repositoryRoot = process.cwd()) {
  const baseRevision = gitText(repositoryRoot, ["rev-parse", options.base])
  const mergeBase = gitText(repositoryRoot, ["merge-base", options.base, "HEAD"])
  const head = gitText(repositoryRoot, ["rev-parse", "HEAD"])
  const tracked = parseNameStatusBuffer(
    gitBuffer(repositoryRoot, ["diff", "--name-status", "-z", "--find-renames", mergeBase, "--"]),
  )
  const untrackedBuffer = gitBuffer(repositoryRoot, ["ls-files", "--others", "--exclude-standard", "-z"])
  const untracked = untrackedBuffer.toString("utf8").split("\0").filter(Boolean)
  const files = mergeFileEntries(tracked, untracked)
  const routing = classifyReviewSurface(files)

  return {
    generatedAt: new Date().toISOString(),
    baseRevision: {
      ref: options.base,
      oid: baseRevision,
    },
    mergeBase,
    head,
    files,
    riskSignals: routing.riskSignals,
    recommendedReviewers: routing.recommendedReviewers,
    omittedReviewers: routing.omittedReviewers,
  }
}

function printHelp() {
  process.stdout.write(`Usage: pnpm review:route [--] [options]

Options:
  --base <ref>       Review base (default: origin/main)
  --format json      Output format
`)
}

function main() {
  try {
    const options = parseCliArguments(process.argv.slice(2))
    if (options.help) {
      printHelp()
      return
    }

    const route = collectReviewContext(options)
    process.stdout.write(`${JSON.stringify(route, null, 2)}\n`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    process.stderr.write(`review:route failed: ${message}\n`)
    process.exitCode = 1
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  main()
}
