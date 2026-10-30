import { NextRequest, NextResponse } from "next/server"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getClinicDashboardSession: vi.fn(),
  isControlledAuthTestMode: vi.fn(),
  createRouteSupabaseClient: vi.fn(),
  readVerifiedSupabaseSession: vi.fn(),
  resolveAccessForSession: vi.fn(),
  resolveMutableClinicDashboardAccess: vi.fn(),
}))

vi.mock("@/lib/env", () => ({
  isControlledAuthTestMode: mocks.isControlledAuthTestMode,
}))

vi.mock("@/features/clinic-dashboard/auth/server/access", () => ({
  resolveAccessForSession: mocks.resolveAccessForSession,
  resolveMutableClinicDashboardAccess: mocks.resolveMutableClinicDashboardAccess,
}))

vi.mock("@/features/clinic-dashboard/auth/server/session", () => ({
  getClinicDashboardSession: mocks.getClinicDashboardSession,
  readVerifiedSupabaseSession: mocks.readVerifiedSupabaseSession,
}))

vi.mock("@/features/clinic-dashboard/auth/server/supabase-client", () => ({
  createRouteSupabaseClient: mocks.createRouteSupabaseClient,
}))

import {
  resolveClinicDashboardPersonalRouteAccess,
  resolveClinicDashboardRouteAccess,
} from "@/features/clinic-dashboard/auth/server/route-access"

const request = new NextRequest("http://localhost:3000/api/dashboard/profile")
const session = {
  accessToken: "synthetic-access-token",
  email: "alex@example.com",
  isClinicAccount: true,
  subject: "staff-1",
}

function approvedAccess(capabilities: readonly ("clinic-profile:edit" | "clinic-profile:view")[]) {
  return {
    context: {
      schemaVersion: "clinic-scope-v1",
      clinics: [{ id: "clinic-1", name: "Clinic One", capabilities }],
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

beforeEach(() => {
  vi.resetAllMocks()
  mocks.isControlledAuthTestMode.mockReturnValue(true)
  mocks.getClinicDashboardSession.mockResolvedValue(session)
  mocks.readVerifiedSupabaseSession.mockResolvedValue(session)
})

describe.each([
  { controlled: true, mode: "controlled" },
  { controlled: false, mode: "normal server" },
])("clinic dashboard route access: $mode", ({ controlled }) => {
  function setAccess(access: ReturnType<typeof approvedAccess> | { status: string }) {
    mocks.resolveAccessForSession.mockResolvedValue(access)
    mocks.resolveMutableClinicDashboardAccess.mockResolvedValue(access)
  }

  beforeEach(() => {
    mocks.isControlledAuthTestMode.mockReturnValue(controlled)
    mocks.createRouteSupabaseClient.mockReturnValue({
      client: {},
      applyToResponse: (response: NextResponse) => {
        response.headers.set("x-synthetic-session", "applied")
        return response
      },
    })
  })

  it("allows view-only staff to read but not edit the profile", async () => {
    setAccess(approvedAccess(["clinic-profile:view"]))

    await expect(
      resolveClinicDashboardRouteAccess(request, "clinic-profile:view", "clinic-1"),
    ).resolves.toMatchObject({
      clinicId: "clinic-1",
      status: "approved",
    })
    await expect(
      resolveClinicDashboardRouteAccess(request, "clinic-profile:edit", "clinic-1"),
    ).resolves.toMatchObject({
      status: "denied",
    })
  })

  it("does not imply view permission from edit permission", async () => {
    setAccess(approvedAccess(["clinic-profile:edit"]))

    await expect(
      resolveClinicDashboardRouteAccess(request, "clinic-profile:view", "clinic-1"),
    ).resolves.toMatchObject({
      status: "denied",
    })
    await expect(
      resolveClinicDashboardRouteAccess(request, "clinic-profile:edit", "clinic-1"),
    ).resolves.toMatchObject({
      clinicId: "clinic-1",
      status: "approved",
    })
  })
  it("keeps unconverted targetless routes and foreign clinic paths closed", async () => {
    setAccess(approvedAccess(["clinic-profile:view", "clinic-profile:edit"]))
    await expect(resolveClinicDashboardRouteAccess(request)).resolves.toMatchObject({ status: "denied" })
    await expect(
      resolveClinicDashboardRouteAccess(request, undefined, "foreign-clinic"),
    ).resolves.toMatchObject({ status: "denied" })
  })
  it("requires the requested capability even for an assigned clinic", async () => {
    setAccess(approvedAccess([]))
    await expect(
      resolveClinicDashboardRouteAccess(request, "clinic-profile:view", "clinic-1"),
    ).resolves.toMatchObject({ status: "denied" })
  })

  it("allows an assigned clinic when the caller does not require a capability", async () => {
    setAccess(approvedAccess([]))
    await expect(resolveClinicDashboardRouteAccess(request, undefined, "clinic-1")).resolves.toMatchObject({
      clinicId: "clinic-1",
      capabilities: [],
      status: "approved",
    })
  })

  it("resolves the clinic from an explicit clinic-scoped request path", async () => {
    setAccess(approvedAccess(["clinic-profile:view"]))
    await expect(
      resolveClinicDashboardRouteAccess(
        new NextRequest("http://localhost:3000/api/dashboard/clinics/clinic-1/profile"),
        "clinic-profile:view",
      ),
    ).resolves.toMatchObject({ clinicId: "clinic-1", status: "approved" })
  })

  it("retains the explicit target rather than selecting another clinic from the URL", async () => {
    setAccess(approvedAccess(["clinic-profile:view"]))
    await expect(
      resolveClinicDashboardRouteAccess(
        new NextRequest("http://localhost:3000/api/dashboard/clinics/foreign-clinic/profile"),
        "clinic-profile:view",
        "clinic-1",
      ),
    ).resolves.toMatchObject({ clinicId: "clinic-1", status: "approved" })
  })

  it("does not infer a clinic target from a nested path outside the clinic API", async () => {
    setAccess(approvedAccess(["clinic-profile:view"]))
    await expect(
      resolveClinicDashboardRouteAccess(
        new NextRequest("http://localhost:3000/unrelated/api/dashboard/clinics/clinic-1/profile"),
        "clinic-profile:view",
      ),
    ).resolves.toMatchObject({ status: "denied" })
  })

  it("returns the selected clinic's rights and identity with the verified session token", async () => {
    const access = approvedAccess(["clinic-profile:edit"])
    access.context.clinics.push({
      id: "clinic-2",
      name: "Clinic Two",
      capabilities: ["clinic-profile:view"],
    })
    setAccess(access)
    const result = await resolveClinicDashboardRouteAccess(request, "clinic-profile:view", "clinic-2")
    expect(result).toMatchObject({
      accessToken: "synthetic-access-token",
      capabilities: ["clinic-profile:view"],
      clinicId: "clinic-2",
      clinicName: "Clinic Two",
      replyEmail: "alex@example.com",
      status: "approved",
    })
    const response = NextResponse.json({ ok: true })
    expect(result.applyToResponse(response)).toBe(response)
    expect(response.headers.get("x-synthetic-session")).toBe(controlled ? null : "applied")
  })

  it("does not borrow a required right from a different assigned clinic", async () => {
    const access = approvedAccess(["clinic-profile:edit"])
    access.context.clinics.push({ id: "clinic-2", name: "Clinic Two", capabilities: ["clinic-profile:view"] })
    setAccess(access)
    await expect(
      resolveClinicDashboardRouteAccess(request, "clinic-profile:edit", "clinic-2"),
    ).resolves.toMatchObject({ status: "denied" })
  })

  it("denies a clinic target when the authorized clinic set is empty", async () => {
    const access = approvedAccess([])
    access.context.clinics = []
    setAccess(access)
    await expect(resolveClinicDashboardRouteAccess(request, undefined, "clinic-1")).resolves.toMatchObject({
      status: "denied",
    })
  })

  it.each(["denied", "temporarily-unavailable", "unauthenticated", "unauthorized"])(
    "preserves %s access without returning provider credentials",
    async (status) => {
      setAccess({ status })
      const result = await resolveClinicDashboardRouteAccess(request, "clinic-profile:view", "clinic-1")
      expect(result.status).toBe(status)
      expect(result).not.toHaveProperty("accessToken")
      const response = NextResponse.json({ status })
      result.applyToResponse(response)
      expect(response.headers.get("x-synthetic-session")).toBe(controlled ? null : "applied")
    },
  )

  it("requires a verified session even when clinic access was approved", async () => {
    setAccess(approvedAccess(["clinic-profile:view"]))
    mocks.getClinicDashboardSession.mockResolvedValue(undefined)
    mocks.readVerifiedSupabaseSession.mockResolvedValue(undefined)
    const result = await resolveClinicDashboardRouteAccess(request, "clinic-profile:view", "clinic-1")
    expect(result.status).toBe("unauthenticated")
    expect(result).not.toHaveProperty("accessToken")
  })
})

describe("personal notification route access", () => {
  it("authorizes a personal feed without choosing or requiring a target clinic", async () => {
    const access = approvedAccess([])
    access.context.clinics.push({ id: "clinic-2", name: "Clinic Two", capabilities: [] })
    mocks.resolveAccessForSession.mockResolvedValue(access)
    const result = await resolveClinicDashboardPersonalRouteAccess(
      new NextRequest("http://localhost:3000/api/notifications?mode=summary"),
    )
    expect(result).toMatchObject({
      status: "approved",
      principalId: "staff-1",
      clinicIds: ["clinic-1", "clinic-2"],
    })
    expect(result).not.toHaveProperty("clinicId")
    mocks.resolveAccessForSession.mockResolvedValue({
      ...access,
      context: { ...access.context, clinics: [] },
    })
    await expect(
      resolveClinicDashboardPersonalRouteAccess(
        new NextRequest("http://localhost:3000/api/notifications?mode=summary"),
      ),
    ).resolves.toMatchObject({ status: "approved", clinicIds: [] })
  })
})
