import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const profile = readFileSync(new URL("../../.codex/project-profile.toml", import.meta.url), "utf8")

describe("project profile contract", () => {
  it("records the completed data-less foundation and delivery decisions", () => {
    expect(profile).toContain("schema_version = 1")
    expect(profile).toMatch(/\[bootstrap\]\s+status = "complete"/)
    expect(profile).toContain('profile = "server-side-supabase-bff"')
    expect(profile).toContain('status = "implemented-preview-validation-pending"')
    expect(profile).toContain('mode = "none"')
    expect(profile).toContain(
      'public_routes = ["/login", "/api/auth/login", "/auth/password/reset", "/api/auth/password/reset", "/auth/callback", "/auth/confirm", "/api/auth/callback", "/api/health", "/robots.txt"]',
    )
    expect(profile).toContain(
      'active = ["storybook", "github-actions", "vercel-preview", "vercel-production"]',
    )
    expect(profile).toContain('vercel_setup_status = "production"')
    expect(profile).toContain("production_enabled = true")
  })
})
