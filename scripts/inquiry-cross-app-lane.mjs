import { spawn } from "node:child_process"
import fs from "node:fs"
import path from "node:path"

const websiteDirectory = process.env.INQUIRY_ACCEPTANCE_WEBSITE_DIR
if (!websiteDirectory) {
  throw new Error("INQUIRY_ACCEPTANCE_WEBSITE_DIR must point to the Website checkout")
}

const generatedDistDirectory = path.join(process.cwd(), ".next-cross-app-foreign")
const generatedTypeFiles = ["next-env.d.ts", "tsconfig.json"].map((fileName) => ({
  content: fs.readFileSync(path.join(process.cwd(), fileName), "utf8"),
  path: path.join(process.cwd(), fileName),
}))
let cleaned = false

function cleanupGeneratedFiles() {
  if (cleaned) return
  cleaned = true
  fs.rmSync(generatedDistDirectory, { force: true, recursive: true })
  for (const file of generatedTypeFiles) fs.writeFileSync(file.path, file.content)
}

process.once("exit", cleanupGeneratedFiles)

const child = spawn("pnpm", ["exec", "tsx", "scripts/inquiry-cross-app-lane.ts"], {
  cwd: path.resolve(websiteDirectory),
  env: { ...process.env, INQUIRY_ACCEPTANCE_DASHBOARD_DIR: process.cwd() },
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  cleanupGeneratedFiles()
  if (signal) process.kill(process.pid, signal)
  process.exitCode = code ?? 1
})
