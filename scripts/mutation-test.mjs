import { readFile, realpath, stat } from "node:fs/promises"
import path from "node:path"
import { parseArgs } from "node:util"

const usage =
  "Usage: pnpm test:mutation --mutate <src-file[:start-end]> --testFiles <test-file> [--testFiles <test-file>] [--dryRunOnly]"
const root = process.cwd()

async function selectedFile(value, kind) {
  if (path.isAbsolute(value)) throw new Error(`${kind} must be a repository-relative file.`)
  const absolute = await realpath(path.resolve(root, value)).catch(() => undefined)
  const relative = absolute && path.relative(root, absolute).split(path.sep).join("/")
  if (!absolute || !(await stat(absolute)).isFile()) throw new Error(`${kind} file does not exist: ${value}`)

  const valid =
    kind === "Production"
      ? relative.startsWith("src/") &&
        /\.tsx?$/u.test(relative) &&
        !/\.(?:test|spec|stories)\.tsx?$/u.test(relative) &&
        !/(?:^|\/)(?:__tests__|tests|testing|fixtures)(?:\/|$)/u.test(relative)
      : /^tests\/(?:unit|integration)\/.+\.test\.tsx?$/u.test(relative)
  if (!valid) throw new Error(`${kind} file is outside the supported source or test scope: ${value}`)
  return relative
}

try {
  const { values } = parseArgs({
    options: {
      mutate: { type: "string" },
      testFiles: { type: "string", multiple: true },
      dryRunOnly: { type: "boolean", default: false },
      help: { type: "boolean", default: false },
    },
    strict: true,
    allowPositionals: false,
  })
  if (values.help) {
    console.log(usage)
  } else {
    if (!values.mutate || !values.testFiles?.length) {
      throw new Error("Explicit --mutate and --testFiles selections are required.")
    }
    const match = /^([^:]+)(?::([1-9]\d*)-([1-9]\d*))?$/u.exec(values.mutate)
    if (!match) throw new Error("Use a production file with an optional positive start-end line range.")
    const file = await selectedFile(match[1], "Production")
    if (match[2]) {
      const lines = (await readFile(file, "utf8")).split(/\r?\n/u).length
      if (Number(match[2]) > Number(match[3]) || Number(match[3]) > lines) {
        throw new Error("The mutation line range must be ordered and within the selected file.")
      }
    }
    const mutate = match[2] ? `${file}:${match[2]}-${match[3]}` : file
    const testFiles = [
      ...new Set(await Promise.all(values.testFiles.map((test) => selectedFile(test, "Test")))),
    ]
    const { Stryker } = await import("@stryker-mutator/core")
    const mutants = await new Stryker({
      configFile: false,
      mutate: [mutate],
      testFiles,
      testRunner: "vitest",
      plugins: ["@stryker-mutator/vitest-runner"],
      vitest: { configFile: "vitest.mutation.config.ts", related: false },
      concurrency: 2,
      dryRunOnly: values.dryRunOnly,
      thresholds: { break: 0 },
      reporters: ["progress", "clear-text", "html", "json"],
      htmlReporter: { fileName: "coverage/mutation/mutation.html" },
      jsonReporter: { fileName: "coverage/mutation/mutation.json" },
      ignorePatterns: [
        "**/.env",
        "**/.env.*",
        "**/.vercel/**",
        "/.next/**",
        "/coverage/**",
        "/playwright-report/**",
        "/test-results/**",
        "/storybook-static/**",
        "/.artifacts/**",
      ],
    }).runMutationTest()
    if (!values.dryRunOnly && mutants.length === 0) {
      throw new Error("No mutants were generated. Select a production file or range with executable logic.")
    }
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "Mutation testing failed.")
  console.error(usage)
  process.exitCode = 1
}
