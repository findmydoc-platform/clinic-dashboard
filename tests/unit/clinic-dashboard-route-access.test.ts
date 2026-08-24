import { NextRequest } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getClinicDashboardSession: vi.fn(),
  resolveAccessForSession: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  isControlledAuthTestMode: () => true,
}))

vi.mock("@/features/clinic-dashboard/auth/server/access", () => ({
  resolveAccessForSession: mocks.resolveAccessForSession,
  resolveMutableClinicDashboardAccess: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/session", () => ({
  getClinicDashboardSession: mocks.getClinicDashboardSession,
  readVerifiedSupabaseSession: vi.fn(),
}))

vi.mock("@/features/clinic-dashboard/auth/server/supabase-client", () => ({
  createRouteSupabaseClient: vi.fn(),
}))

import { resolveClinicDashboardRouteAccess } from "@/features/clinic-dashboard/auth/server/route-access"

const request = new NextRequest("http://localhost:3000/api/dashboard/profile")

function approvedAccess(capabilities: readonly ("clinic-profile:edit" | "clinic-profile:view")[]) {
  return {
    context: {
      capabilities,
      clinic: { id: "clinic-1", name: "Clinic One" },
      principal: {
        displayName: "Alex Morgan",
        email: "alex@example.com",
        id: "staff-1",
      },
      status: "approved",
    },
    status: "approved",
  }
}

describe("clinic dashboard route access", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClinicDashboardSession.mockResolvedValue({
      accessToken: "access-token",
      expiresAt: 999_999_999,
      refreshToken: "refresh-token",
      user: { email: "alex@example.com", id: "staff-1" },
    })
  })

  it("allows view-only staff to read but not edit the profile", async () => {
    mocks.resolveAccessForSession.mockResolvedValue(approvedAccess(["clinic-profile:view"]))

    await expect(resolveClinicDashboardRouteAccess(request, "clinic-profile:view")).resolves.toMatchObject({
      clinicId: "clinic-1",
      status: "approved",
    })
    await expect(resolveClinicDashboardRouteAccess(request, "clinic-profile:edit")).resolves.toMatchObject({
      status: "denied",
    })
  })

  it("does not imply view permission from edit permission", async () => {
    mocks.resolveAccessForSession.mockResolvedValue(approvedAccess(["clinic-profile:edit"]))

    await expect(resolveClinicDashboardRouteAccess(request, "clinic-profile:view")).resolves.toMatchObject({
      status: "denied",
    })
    await expect(resolveClinicDashboardRouteAccess(request, "clinic-profile:edit")).resolves.toMatchObject({
      clinicId: "clinic-1",
      status: "approved",
    })
  })
})
