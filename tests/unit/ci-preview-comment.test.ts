import { describe, expect, it, vi } from "vitest"
// @ts-expect-error Executable repository tooling has no declaration package.
import { classifyChanges } from "../../scripts/ci/change-scope.mjs"
// @ts-expect-error Executable repository tooling has no declaration package.
import { updatePreviewComments } from "../../scripts/ci/preview-comment.mjs"

type Comment = { id: number; body: string; user: { login: string; type: string } }
type Options = { method?: string; body?: { body: string } }
const headSha = "a".repeat(40)
const commitSha = "b".repeat(40)
const url = "https://clinic-dashboard-example-findmydoc.vercel.app"
const ownComment = (id: number, body: string): Comment => ({
  id,
  body,
  user: { login: "github-actions[bot]", type: "Bot" },
})

function githubFixture(initial: Comment[] = [], revisions: string[] = [headSha]) {
  const comments = initial.map((comment) => ({ ...comment }))
  let revisionIndex = 0
  const request = vi.fn(async (endpoint: string, options: Options = {}) => {
    if (endpoint === "/pulls/42") {
      return { head: { sha: revisions[Math.min(revisionIndex++, revisions.length - 1)] } }
    }
    if (options.method === "PATCH") {
      const comment = comments.find((candidate) => endpoint === `/issues/comments/${candidate.id}`)
      if (!comment || !options.body) throw new Error("Unexpected fixture comment update.")
      comment.body = options.body.body
      return comment
    }
    if (options.method === "POST" && endpoint === "/issues/42/comments" && options.body) {
      const comment = ownComment(comments.length + 1, options.body.body)
      comments.push(comment)
      return comment
    }
    const page = Number(new URL(`https://example.invalid${endpoint}`).searchParams.get("page"))
    return comments.slice((page - 1) * 100, page * 100)
  })
  return { comments, request }
}

describe("Preview comment lifecycle", () => {
  it("invalidates a previously published Preview after all runtime changes are reverted", async () => {
    const github = githubFixture()
    const runtime = classifyChanges([
      { filename: "src/app/page.tsx", status: "modified" },
      { filename: "README.md", status: "modified" },
    ])
    expect(runtime.preview).toBe(true)
    await updatePreviewComments({ number: 42, headSha, mode: "publish", url, commitSha }, github.request)
    expect(github.comments[0].body).toContain(url)

    const reverted = classifyChanges([{ filename: "README.md", status: "modified" }])
    expect(reverted.preview).toBe(false)
    const result = await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)
    expect(result).toMatchObject({ updated: 1, created: false })
    expect(github.comments[0].body).toContain("outdated")
    expect(github.comments[0].body).not.toContain(url)
  })

  it("updates legacy own Preview comments without touching human or unrelated bot comments", async () => {
    const github = githubFixture([
      ownComment(1, `Vercel preview: ${url}`),
      { id: 2, body: `Vercel preview: ${url}`, user: { login: "reviewer", type: "User" } },
      ownComment(3, "Other automation result"),
      { id: 4, body: `Vercel preview: ${url}`, user: { login: "other-bot[bot]", type: "Bot" } },
    ])
    await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)
    expect(github.comments[0].body).toContain("outdated")
    expect(github.comments[1].body).toBe(`Vercel preview: ${url}`)
    expect(github.comments[2].body).toBe("Other automation result")
    expect(github.comments[3].body).toBe(`Vercel preview: ${url}`)
    expect(github.request.mock.calls.filter(([, options]) => options?.method === "PATCH")).toHaveLength(1)
  })

  it("does not create a comment for an ordinary documentation-only PR", async () => {
    const github = githubFixture()
    expect(await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)).toMatchObject(
      { updated: 0, created: false },
    )
    expect(github.comments).toEqual([])
    expect(github.request.mock.calls.every(([, options]) => !options?.method)).toBe(true)
  })

  it("paginates comments and invalidates every previous own Preview link", async () => {
    const unrelated = Array.from({ length: 100 }, (_, index) => ownComment(index + 1, "Other automation"))
    const github = githubFixture([
      ...unrelated,
      ownComment(101, `Vercel preview: ${url}`),
      ownComment(102, `Vercel preview: ${url}`),
    ])
    expect(await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)).toMatchObject(
      { updated: 2 },
    )
    expect(github.request).toHaveBeenCalledWith("/issues/42/comments?per_page=100&page=2")
    expect(github.comments[100].body).toContain("outdated")
    expect(github.comments[101].body).toContain("outdated")
  })

  it("does not repeat an already applied stale update", async () => {
    const github = githubFixture([ownComment(1, `Vercel preview: ${url}`)])
    await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)
    github.request.mockClear()
    expect(await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)).toMatchObject(
      { updated: 0 },
    )
    expect(github.request.mock.calls.every(([, options]) => !options?.method)).toBe(true)
  })

  it("reuses its own comment when a new runtime Preview is available", async () => {
    const github = githubFixture([
      ownComment(1, `Vercel preview: ${url}`),
      ownComment(2, "Other automation result"),
    ])
    await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request)
    expect(
      await updatePreviewComments({ number: 42, headSha, mode: "publish", url, commitSha }, github.request),
    ).toMatchObject({ updated: 1, created: false })
    expect(github.comments).toHaveLength(2)
    expect(github.comments[0].body).toContain(url)
    expect(github.comments[0].body).toContain(commitSha)
    expect(github.comments[1].body).toBe("Other automation result")
  })

  it.each([["c".repeat(40)], [headSha, "c".repeat(40)]])(
    "does not overwrite a newer PR revision %#",
    async (...revisions) => {
      const github = githubFixture([ownComment(1, `Vercel preview: ${url}`)], revisions)
      expect(
        await updatePreviewComments({ number: 42, headSha, mode: "stale" }, github.request),
      ).toMatchObject({ updated: 0, superseded: true })
      expect(github.request.mock.calls.every(([, options]) => !options?.method)).toBe(true)
    },
  )

  it.each([
    "https://example.invalid",
    "http://clinic-dashboard-example-findmydoc.vercel.app",
    "https://clinic-dashboard-example-findmydoc.vercel.app/unexpected",
  ])("rejects invalid Preview metadata %s", async (invalidUrl) => {
    const github = githubFixture()
    await expect(
      updatePreviewComments(
        { number: 42, headSha, mode: "publish", url: invalidUrl, commitSha },
        github.request,
      ),
    ).rejects.toThrow("metadata")
    expect(github.request).not.toHaveBeenCalled()
  })

  it("reports API failures instead of silently keeping a stale link", async () => {
    const github = githubFixture([ownComment(1, `Vercel preview: ${url}`)])
    const request = async (endpoint: string, options?: Options) => {
      if (options?.method === "PATCH") throw new Error("Comment update failed.")
      return github.request(endpoint, options)
    }
    await expect(updatePreviewComments({ number: 42, headSha, mode: "stale" }, request)).rejects.toThrow(
      "Comment update failed",
    )
  })
})
