import { execFileSync } from "node:child_process"
import { pathToFileURL } from "node:url"

export function summarizeRuns(runs) {
  if (
    runs.length === 0 ||
    runs.some(
      (run) =>
        run.status !== "completed" ||
        run.jobs.some((job) => job.conclusion !== "skipped" && (!job.started_at || !job.completed_at)),
    )
  ) {
    throw new Error("Select completed workflow runs with complete job data.")
  }
  const started = Math.min(...runs.map((run) => Date.parse(run.created_at)))
  const finished = Math.max(
    ...runs.map((run) => {
      const completed = run.jobs.filter((job) => job.completed_at).map((job) => Date.parse(job.completed_at))
      return completed.length > 0 ? Math.max(...completed) : Date.parse(run.updated_at)
    }),
  )
  const jobSeconds = runs
    .flatMap((run) => run.jobs)
    .reduce(
      (sum, job) =>
        sum +
        (job.conclusion === "skipped"
          ? 0
          : (Date.parse(job.completed_at) - Date.parse(job.started_at)) / 1000),
      0,
    )
  if (![started, finished, jobSeconds].every(Number.isFinite))
    throw new Error("Workflow timestamps are incomplete.")
  return {
    elapsed_seconds: (finished - started) / 1000,
    job_seconds: jobSeconds,
    jobs: runs.reduce((sum, run) => sum + run.jobs.length, 0),
    runs: runs.map((run) => ({ id: run.id, attempt: run.run_attempt, conclusion: run.conclusion })),
    note: "Job durations are runner workload, not billable minutes. Include CodeQL and every workflow for the same event.",
  }
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const repository = process.env.GITHUB_REPOSITORY ?? "findmydoc-platform/clinic-dashboard"
  const runIds = process.argv.slice(2)
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository) || runIds.length === 0 || runIds.some((id) => !/^\d+$/.test(id)))
    throw new Error("Pass workflow run IDs as arguments.")
  const get = (endpoint) => JSON.parse(execFileSync("gh", ["api", endpoint], { encoding: "utf8" }))
  const runs = runIds.map((id) => {
    const run = get(`repos/${repository}/actions/runs/${id}`)
    const jobs = []
    for (let page = 1; ; page += 1) {
      const result = get(
        `repos/${repository}/actions/runs/${id}/attempts/${run.run_attempt}/jobs?per_page=100&page=${page}`,
      )
      jobs.push(...result.jobs)
      if (jobs.length === result.total_count) break
      if (result.jobs.length === 0) throw new Error("Incomplete workflow job pagination.")
    }
    return { ...run, jobs }
  })
  process.stdout.write(`${JSON.stringify(summarizeRuns(runs), null, 2)}\n`)
}
