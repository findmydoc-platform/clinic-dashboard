#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { fileURLToPath, pathToFileURL } from "node:url"
import { REVIEWER_ORDER } from "./collect-review-context.mjs"

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..")

export function verifyReviewSystem(rootDirectory = repositoryRoot) {
  const failures = []

  function read(relativePath) {
    const absolutePath = resolve(rootDirectory, relativePath)
    if (!existsSync(absolutePath)) {
      failures.push(`Missing ${relativePath}`)
      return ""
    }
    return readFileSync(absolutePath, "utf8")
  }

  for (const name of REVIEWER_ORDER) {
    const fileName = name.replaceAll("_", "-")
    const content = read(`.codex/agents/${fileName}.toml`)
    if (!new RegExp(`^name\\s*=\\s*["']${name}["']\\s*(?:#.*)?$`, "m").test(content)) {
      failures.push(`${fileName} must declare its role name ${name}`)
    }
    if (!/^sandbox_mode\s*=\s*["']read-only["']\s*(?:#.*)?$/m.test(content)) {
      failures.push(`${name} must use read-only sandbox mode`)
    }
  }

  const skill = read(".codex/skills/review-gate/SKILL.md")
  if (!/^name: review-gate$/m.test(skill)) {
    failures.push("Review Gate skill metadata must declare its name")
  }
  read(".codex/skills/review-gate/agents/openai.yaml")
  read(".codex/skills/review-gate/references/routing.md")

  let packageJson
  try {
    packageJson = JSON.parse(read("package.json") || "{}")
  } catch {
    failures.push("Invalid package.json")
    return failures
  }

  for (const [name, scriptPath] of [
    ["review:route", ".codex/skills/review-gate/scripts/collect-review-context.mjs"],
    ["review:verify", ".codex/skills/review-gate/scripts/verify-review-system.mjs"],
  ]) {
    read(scriptPath)
    if (packageJson.scripts?.[name] !== `node ${scriptPath}`) {
      failures.push(`package.json must expose ${name}`)
    }
  }
  if (!packageJson.scripts?.check?.split(/\s*&&\s*/).includes("pnpm review:verify")) {
    failures.push("pnpm check must include pnpm review:verify")
  }

  return failures
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const failures = verifyReviewSystem()
  if (failures.length > 0) {
    process.stderr.write(`Review system verification failed:\n- ${failures.join("\n- ")}\n`)
    process.exitCode = 1
  } else {
    process.stdout.write("Review system contracts verified.\n")
  }
}
