import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const profile = readFileSync(new URL("../../.codex/project-profile.toml", import.meta.url), "utf8")

describe("project profile contract", () => {
  it("records the completed data-less foundation decisions", () => {
    expect(profile).toContain("schema_version = 1")
    expect(profile).toMatch(/\[bootstrap\]\s+status = "complete"/)
    expect(profile).toContain('profile = "temporary-password-guard"')
    expect(profile).toContain('status = "active-temporary"')
    expect(profile).toContain('mode = "none"')
    expect(profile).toContain('public_routes = ["/api/auth/login", "/api/health", "/login", "/robots.txt"]')
    expect(profile).toContain('active = ["storybook", "github-actions", "vercel-preview"]')
    expect(profile).toContain("production_enabled = false")
  })
})
