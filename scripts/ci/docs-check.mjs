import { execFileSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import path from "node:path"
import { pathToFileURL } from "node:url"

export function markdownLinks(file, text, root) {
  const links = []
  const prose = text.replace(/^(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\1[^\n]*$/gm, "")
  for (const match of prose.matchAll(/!?\[[^\]]*\]\(\s*(<[^>]+>|[^\s)]+)(?:\s+["'][^"']*["'])?\s*\)/g)) {
    const href = match[1].replace(/^<|>$/g, "")
    if (/^(?:[a-z][a-z\d+.-]*:|#|\/\/)/i.test(href)) continue
    const target = decodeURIComponent(href.split(/[?#]/)[0])
    if (!target || /[<>*{}]/.test(target)) continue
    links.push({
      href,
      target: target.startsWith("/")
        ? path.resolve(root, `.${target}`)
        : path.resolve(root, path.dirname(file), target),
    })
  }
  return links
}

export function checkDocs(root, changed, tracked) {
  const changedMarkdown = new Set(
    changed.flatMap((entry) =>
      [entry.filename, entry.previous_filename].filter((file) => file && /\.md$/i.test(file)),
    ),
  )
  const deleted = new Set(
    changed
      .flatMap((entry) => [entry.filename, entry.previous_filename].filter(Boolean))
      .filter((file) => !existsSync(path.join(root, file)))
      .map((file) => path.resolve(root, file)),
  )
  const failures = []
  for (const file of tracked.filter(
    (candidate) => /\.md$/i.test(candidate) && existsSync(path.join(root, candidate)),
  )) {
    for (const link of markdownLinks(file, readFileSync(path.join(root, file), "utf8"), root)) {
      if ((changedMarkdown.has(file) || deleted.has(link.target)) && !existsSync(link.target)) {
        failures.push(`${file}: broken local link ${link.href}`)
      }
    }
  }
  return { failures, files: [...changedMarkdown].filter((file) => existsSync(path.join(root, file))) }
}

export function runDocsCheck(root = process.cwd(), manifest = process.argv[2]) {
  const tracked = execFileSync("git", ["ls-files", "-z"], { cwd: root, encoding: "utf8" })
    .split("\0")
    .filter(Boolean)
  const scope = manifest ? JSON.parse(readFileSync(manifest, "utf8")) : undefined
  const changes =
    scope && scope.changes.length > 0 ? scope.changes : tracked.map((filename) => ({ filename }))
  const { failures, files } = checkDocs(root, changes, tracked)
  if (failures.length > 0) throw new Error(failures.join("\n"))
  if (files.length > 0) {
    const version = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8")).devDependencies.prettier
    if (!/^\d+\.\d+\.\d+$/.test(version))
      throw new Error("Documentation formatter must use an exact Prettier version.")
    execFileSync(
      "npm",
      [
        "exec",
        "--yes",
        `--package=prettier@${version}`,
        "--",
        "prettier",
        "--check",
        "--no-config",
        "--print-width=110",
        "--single-quote=false",
        "--no-semi",
        "--parser=markdown",
        "--",
        ...files,
      ],
      { cwd: root, stdio: "inherit" },
    )
  }
  process.stdout.write(`Documentation checks passed (${files.length} changed Markdown files).\n`)
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) runDocsCheck()
