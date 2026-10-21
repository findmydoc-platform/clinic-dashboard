// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getClinicDashboardAccess: vi.fn(),
  loadClinicDashboardInitialReporting: vi.fn(),
  loadClinicDashboardInitialNotifications: vi.fn(),
  loadClinicDashboardWorkspaceInput: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("next/headers", () => ({ cookies: async () => ({ get: () => undefined }) }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/features/clinic-dashboard/public", async () => ({
  ...(await import("@/features/clinic-dashboard/workspace/model/clinic-selection")),
  ...(await import("@/features/clinic-dashboard/auth/model/auth")),
  ClinicDashboardAuthScreen: ({ returnTarget }: { returnTarget?: string }) => (
    <div data-return-target={returnTarget} data-testid="auth-screen" />
  ),
  ClinicDashboardWorkspace: ({
    focusInquiryId,
    focusReviewId,
  }: {
    focusInquiryId?: string
    focusReviewId?: string
  }) => (
    <div
      data-focus-review-id={focusReviewId}
      data-focus-inquiry-id={focusInquiryId}
      data-testid="workspace"
    />
  ),
}))
vi.mock("@/features/clinic-dashboard/server", () => ({
  getClinicDashboardAccess: mocks.getClinicDashboardAccess,
  loadClinicDashboardInitialReporting: mocks.loadClinicDashboardInitialReporting,
  loadClinicDashboardInitialNotifications: mocks.loadClinicDashboardInitialNotifications,
  loadClinicDashboardWorkspaceInput: mocks.loadClinicDashboardWorkspaceInput,
}))

import HomePage from "@/app/page"
import LoginPage from "@/app/login/page"

describe("clinic dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        schemaVersion: "clinic-scope-v1",
        clinics: [{ id: "clinic-1", name: "Synthetic Clinic", capabilities: ["clinic-inquiries:view"] }],
        principal: { displayName: "Synthetic Staff", email: "staff@example.test", id: "staff-1" },
      },
      status: "approved",
    })
    mocks.loadClinicDashboardInitialNotifications.mockResolvedValue({
      status: "unavailable",
      error: "SERVICE_UNAVAILABLE",
    })
    mocks.loadClinicDashboardInitialReporting.mockResolvedValue({ status: "temporarily-unavailable" })
    mocks.loadClinicDashboardWorkspaceInput.mockResolvedValue({ inquiryQueue: { status: "ready" } })
  })

  it("awaits search params and passes one safe inquiry focus into the workspace", async () => {
    render(
      await HomePage({
        params: Promise.resolve({ clinicId: "clinic-1" }),
        searchParams: Promise.resolve({ inquiry: "inquiry-lukas-weber" }),
      }),
    )

    expect(screen.getByTestId("workspace")).toHaveAttribute("data-focus-inquiry-id", "inquiry-lukas-weber")
  })

  it("passes a validated exact review target independently from its current list page", async () => {
    render(
      await HomePage({
        params: Promise.resolve({ clinicId: "clinic-1" }),
        searchParams: Promise.resolve({ section: "reviews", review: "off-page-review" }),
      }),
    )
    expect(screen.getByTestId("workspace")).toHaveAttribute("data-focus-review-id", "off-page-review")
    expect(screen.getByTestId("workspace")).not.toHaveAttribute("data-focus-inquiry-id")
  })

  it.each([
    ["messages", "inquiry", "off-page-inquiry"],
    ["reviews", "review", "off-page-review"],
  ])("retains the exact clinic %s target through login and session recovery", async (section, key, id) => {
    for (const status of ["unauthenticated", "recovery-required"]) {
      mocks.getClinicDashboardAccess.mockResolvedValueOnce({ status })
      mocks.redirect.mockImplementationOnce((path: string) => {
        throw new Error(`redirect:${path}`)
      })
      const target = encodeURIComponent(`/clinics/clinic-1?section=${section}&${key}=${id}`)
      await expect(
        HomePage({
          params: Promise.resolve({ clinicId: "clinic-1" }),
          searchParams: Promise.resolve({ section, [key]: id, sessionRecovery: "1" }),
        }),
      ).rejects.toThrow(
        status === "unauthenticated"
          ? `redirect:/login?next=${target}`
          : `redirect:/auth/session/recover?next=${target}&mode=clear&attempt=1`,
      )
    }
    expect(mocks.loadClinicDashboardWorkspaceInput).not.toHaveBeenCalled()
  })

  it.each([["inquiry/foreign"], [["inquiry-1", "inquiry-2"]]])(
    "drops an unsafe or ambiguous inquiry focus",
    async (inquiry) => {
      render(
        await HomePage({
          params: Promise.resolve({ clinicId: "clinic-1" }),
          searchParams: Promise.resolve({ inquiry }),
        }),
      )
      expect(screen.getByTestId("workspace")).not.toHaveAttribute("data-focus-inquiry-id")
    },
  )

  it("canonicalizes a retained legacy inquiry target into the clinic messages section", async () => {
    mocks.redirect.mockImplementationOnce((path: string) => {
      throw new Error(`redirect:${path}`)
    })
    await expect(
      HomePage({ searchParams: Promise.resolve({ inquiry: "retained-inquiry" }) }),
    ).rejects.toThrow("redirect:/clinics/clinic-1?section=messages&inquiry=retained-inquiry")
  })

  it("keeps one safe inquiry target through the unauthenticated login redirect", async () => {
    mocks.getClinicDashboardAccess.mockResolvedValueOnce({ status: "unauthenticated" })
    mocks.redirect.mockImplementationOnce((path: string) => {
      throw new Error(`redirect:${path}`)
    })

    await expect(
      HomePage({ searchParams: Promise.resolve({ inquiry: "inquiry-lukas-weber" }) }),
    ).rejects.toThrow("redirect:/login?next=%2F%3Finquiry%3Dinquiry-lukas-weber")
  })

  it.each([
    [undefined, "refresh"],
    ["1", "clear"],
  ])("recovers a rejected Payload session with a bounded attempt", async (sessionRecovery, mode) => {
    mocks.getClinicDashboardAccess.mockResolvedValueOnce({ status: "recovery-required" })
    mocks.redirect.mockImplementationOnce((path: string) => {
      throw new Error(`redirect:${path}`)
    })
    await expect(
      HomePage({ searchParams: Promise.resolve({ inquiry: "inquiry-1", sessionRecovery }) }),
    ).rejects.toThrow(`redirect:/auth/session/recover?next=%2F%3Finquiry%3Dinquiry-1&mode=${mode}`)
    expect(mocks.loadClinicDashboardWorkspaceInput).not.toHaveBeenCalled()
  })

  it.each([
    ["/?inquiry=inquiry-lukas-weber", "/?inquiry=inquiry-lukas-weber"],
    ["https://attacker.example", "/"],
    ["//attacker.example", "/"],
    [["/?inquiry=inquiry-1", "/?inquiry=inquiry-2"], "/"],
  ])("passes only a canonical same-origin login return target", async (next, expected) => {
    render(
      await LoginPage({
        searchParams: Promise.resolve({ next }),
      }),
    )

    expect(screen.getByTestId("auth-screen")).toHaveAttribute("data-return-target", expected)
  })
})
