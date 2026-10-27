import { readFileSync } from "node:fs"
import { pathToFileURL } from "node:url"

const marker = "<!-- clinic-dashboard-preview -->"
const staleBody = `${marker}\nThe previous Vercel preview is outdated and does not represent the current PR changes. No new deployment is needed for these paths.`
const shaPattern = /^[a-f0-9]{40}$/

function isPreviewComment(comment) {
  return (
    comment.user?.login === "github-actions[bot]" &&
    comment.user?.type === "Bot" &&
    typeof comment.body === "string" &&
    (comment.body.startsWith(`${marker}\n`) || /^Vercel preview:\s+https:\/\//.test(comment.body))
  )
}

function publishedBody(url, commitSha) {
  const parsed = new URL(url)
  if (
    parsed.protocol !== "https:" ||
    !/^clinic-dashboard-[a-z0-9-]+-findmydoc\.vercel\.app$/.test(parsed.hostname) ||
    parsed.username ||
    parsed.password ||
    parsed.port ||
    parsed.pathname !== "/" ||
    parsed.search ||
    parsed.hash ||
    !shaPattern.test(commitSha ?? "")
  ) {
    throw new Error("Invalid Preview deployment metadata.")
  }
  return `${marker}\nVercel preview: ${parsed.origin}\n\nDeployment commit: \`${commitSha}\`.`
}

export async function updatePreviewComments({ number, headSha, mode, url, commitSha }, request) {
  if (
    !Number.isSafeInteger(number) ||
    number < 1 ||
    !shaPattern.test(headSha ?? "") ||
    !["publish", "stale"].includes(mode)
  ) {
    throw new Error("Invalid Preview comment request.")
  }
  const body = mode === "publish" ? publishedBody(url, commitSha) : staleBody
  const currentRevision = async () => {
    const pr = await request(`/pulls/${number}`)
    if (!shaPattern.test(pr.head?.sha ?? "")) throw new Error("Missing pull request revision.")
    return pr.head.sha === headSha
  }
  if (!(await currentRevision())) return { updated: 0, created: false, superseded: true }
  const ownComments = []
  for (let page = 1; ; page += 1) {
    const comments = await request(`/issues/${number}/comments?per_page=100&page=${page}`)
    if (!Array.isArray(comments) || comments.length > 100) throw new Error("Invalid Preview comment list.")
    ownComments.push(...comments.filter(isPreviewComment))
    if (comments.length < 100) break
    if (page === 100) throw new Error("Preview comment pagination exceeded its limit.")
  }
  if (mode === "stale" && ownComments.length === 0) return { updated: 0, created: false, superseded: false }
  if (!(await currentRevision())) return { updated: 0, created: false, superseded: true }
  if (mode === "publish" && ownComments.length === 0) {
    await request(`/issues/${number}/comments`, { method: "POST", body: { body } })
    return { updated: 0, created: true, superseded: false }
  }
  const selected = mode === "stale" ? ownComments : ownComments.slice(-1)
  let updated = 0
  for (const comment of selected) {
    if (comment.body === body) continue
    if (!Number.isSafeInteger(comment.id) || comment.id < 1) throw new Error("Invalid Preview comment ID.")
    await request(`/issues/comments/${comment.id}`, { method: "PATCH", body: { body } })
    updated += 1
  }
  return { updated, created: false, superseded: false }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"))
  const repository = process.env.GITHUB_REPOSITORY
  const token = process.env.GH_TOKEN
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "") || !token)
    throw new Error("Missing GitHub comment context.")
  const request = async (endpoint, options = {}) => {
    const response = await fetch(`https://api.github.com/repos/${repository}${endpoint}`, {
      method: options.method ?? "GET",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
      signal: AbortSignal.timeout(20_000),
    })
    if (!response.ok) throw new Error(`GitHub Preview comment request failed (${response.status}).`)
    return response.json()
  }
  const result = await updatePreviewComments(
    {
      number: event.pull_request?.number ?? event.number,
      headSha: event.pull_request?.head?.sha,
      mode: process.argv[2],
      url: process.env.PREVIEW_URL,
      commitSha: process.env.DEPLOYMENT_COMMIT_SHA,
    },
    request,
  )
  process.stdout.write(
    `Preview comment status: ${result.updated} updated, ${result.created ? 1 : 0} created${result.superseded ? "; newer PR revision detected" : ""}.\n`,
  )
}
