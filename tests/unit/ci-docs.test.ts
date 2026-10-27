import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { afterEach, describe, expect, it } from "vitest"
// @ts-expect-error Executable repository tooling has no declaration package.
import { checkDocs, markdownLinks } from "../../scripts/ci/docs-check.mjs"

const roots: string[] = []
const fixture = () => {
  const root = mkdtempSync(path.join(tmpdir(), "dashboard-docs-"))
  roots.push(root)
  mkdirSync(path.join(root, "docs"))
  return root
}

afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true })
})

describe("documentation checks", () => {
  it("accepts local paths, images, external URLs and anchors", () => {
    const root = fixture()
    writeFileSync(path.join(root, "docs/guide.md"), "# Guide")
    writeFileSync(path.join(root, "docs/image.png"), "image")
    writeFileSync(
      path.join(root, "README.md"),
      "[Guide](docs/guide.md#intro) ![Image](docs/image.png) [External](https://example.invalid) [Section](#intro)",
    )
    const result = checkDocs(root, [{ filename: "README.md" }], ["README.md", "docs/guide.md"])
    expect(result.failures).toEqual([])
    expect(result.files).toEqual(["README.md"])
  })

  it("rejects broken links in a changed Markdown file", () => {
    const root = fixture()
    writeFileSync(path.join(root, "README.md"), "[Missing](docs/missing.md)")
    expect(checkDocs(root, [{ filename: "README.md" }], ["README.md"]).failures).toEqual([
      "README.md: broken local link docs/missing.md",
    ])
  })

  it("finds links from unchanged documentation to a removed or renamed file", () => {
    const root = fixture()
    writeFileSync(path.join(root, "README.md"), "[Old](docs/old.md)")
    writeFileSync(path.join(root, "docs/new.md"), "# New")
    const result = checkDocs(
      root,
      [{ filename: "docs/new.md", previous_filename: "docs/old.md", status: "renamed" }],
      ["README.md", "docs/new.md"],
    )
    expect(result.failures).toEqual(["README.md: broken local link docs/old.md"])
    expect(result.files).toEqual(["docs/new.md"])
  })

  it("does not fail unrelated existing documentation drift", () => {
    const root = fixture()
    writeFileSync(path.join(root, "README.md"), "[Old](docs/missing.md)")
    writeFileSync(path.join(root, "docs/new.md"), "# New")
    expect(checkDocs(root, [{ filename: "docs/new.md" }], ["README.md", "docs/new.md"]).failures).toEqual([])
  })

  it("finds incoming image links when documentation assets are deleted", () => {
    const root = fixture()
    writeFileSync(path.join(root, "README.md"), "![Image](docs/removed.png)")
    expect(
      checkDocs(root, [{ filename: "docs/removed.png", status: "removed" }], ["README.md"]).failures,
    ).toEqual(["README.md: broken local link docs/removed.png"])
  })

  it("ignores fenced examples and decodes linked filenames", () => {
    const root = fixture()
    const links = markdownLinks(
      "docs/guide.md",
      "```md\n[Example](missing.md)\n```\n[Real](<file%20name.md>)\n",
      root,
    )
    expect(links).toEqual([{ href: "file%20name.md", target: path.join(root, "docs/file name.md") }])
  })
})
