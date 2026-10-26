#!/usr/bin/env node

import { execFileSync } from "node:child_process"
import { lstatSync } from "node:fs"
import { resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { getFileInfo } from "prettier"

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url))

function gitPaths(args) {
  return execFileSync("git", args, { cwd: repositoryRoot, encoding: "utf8" }).split("\0").filter(Boolean)
}

const stagedFiles = gitPaths(["diff", "--cached", "--name-only", "--diff-filter=ACMRT", "-z"])
const formatTargets = []

for (const filePath of stagedFiles) {
  const absolutePath = resolve(repositoryRoot, filePath)
  if (!lstatSync(absolutePath, { throwIfNoEntry: false })?.isFile()) continue

  const info = await getFileInfo(absolutePath, {
    ignorePath: [resolve(repositoryRoot, ".gitignore"), resolve(repositoryRoot, ".prettierignore")],
  })
  if (!info.ignored && info.inferredParser) formatTargets.push(filePath)
}

if (formatTargets.length > 0) {
  const unstagedFiles = new Set(gitPaths(["diff", "--name-only", "-z"]))
  const partiallyStagedFiles = formatTargets.filter((filePath) => unstagedFiles.has(filePath))

  if (partiallyStagedFiles.length > 0) {
    console.error(
      [
        "Pre-commit formatting aborted: files are partially staged.",
        ...partiallyStagedFiles.map((filePath) => `- ${JSON.stringify(filePath)}`),
        "Stage or stash the remaining changes, then commit again.",
      ].join("\n"),
    )
    process.exit(1)
  }

  console.log(`[pre-commit] formatting ${formatTargets.length} staged file(s).`)
  execFileSync(
    "pnpm",
    [
      "exec",
      "prettier",
      "--write",
      "--ignore-unknown",
      "--",
      ...formatTargets.map((filePath) => `./${filePath}`),
    ],
    { cwd: repositoryRoot, stdio: "inherit" },
  )
  execFileSync("git", ["add", "--", ...formatTargets], { cwd: repositoryRoot, stdio: "inherit" })
}
