import { execFileSync } from "node:child_process"
import { existsSync, lstatSync, readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

export function secretScanFiles(scope, tracked, root = process.cwd()) {
  const files = scope.full_secret_scan ? tracked : scope.changes.map((entry) => entry.filename)
  return [...new Set(files)].filter(
    (file) =>
      !file.startsWith("/") &&
      !file.split("/").includes("..") &&
      existsSync(`${root}/${file}`) &&
      lstatSync(`${root}/${file}`).isFile(),
  )
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const scope = JSON.parse(readFileSync(process.argv[2], "utf8"))
  const tracked = execFileSync("git", ["ls-files", "-z"], { encoding: "utf8" }).split("\0").filter(Boolean)
  const files = secretScanFiles(scope, tracked)
  for (let index = 0; index < files.length; index += 100) {
    execFileSync(
      "detect-secrets-hook",
      ["--baseline", ".secrets.baseline", "--", ...files.slice(index, index + 100)],
      { stdio: "inherit" },
    )
  }
  process.stdout.write(`Secret scan passed (${files.length} files).\n`)
}
