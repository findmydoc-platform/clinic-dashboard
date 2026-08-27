// @vitest-environment jsdom

import { render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getClinicDashboardAccess: vi.fn(),
  loadClinicDashboardWorkspaceInput: vi.fn(),
  redirect: vi.fn(),
}))

vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/features/clinic-dashboard/public", () => ({
  ClinicDashboardAuthScreen: ({ returnTarget }: { returnTarget?: string }) => (
    <div data-return-target={returnTarget} data-testid="auth-screen" />
  ),
  ClinicDashboardWorkspace: ({ focusInquiryId }: { focusInquiryId?: string }) => (
    <div data-focus-inquiry-id={focusInquiryId} data-testid="workspace" />
  ),
  createClinicDashboardLoginPath: (returnTarget: string) =>
    returnTarget === "/" ? "/login" : `/login?next=${encodeURIComponent(returnTarget)}`,
  createClinicDashboardReturnTarget: (inquiryId?: string) => (inquiryId ? `/?inquiry=${inquiryId}` : "/"),
  parseClinicDashboardReturnTarget: (value: unknown) =>
    typeof value === "string" && (/^\/\?inquiry=[A-Za-z0-9._~-]{1,100}$/u.test(value) || value === "/")
      ? value
      : undefined,
  parseInquiryDeepLink: (value: unknown) =>
    typeof value === "string" && /^[A-Za-z0-9._~-]{1,100}$/u.test(value) ? value : undefined,
}))
vi.mock("@/features/clinic-dashboard/server", () => ({
  getClinicDashboardAccess: mocks.getClinicDashboardAccess,
  loadClinicDashboardWorkspaceInput: mocks.loadClinicDashboardWorkspaceInput,
}))

import HomePage from "@/app/page"
import LoginPage from "@/app/login/page"

describe("clinic dashboard page", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getClinicDashboardAccess.mockResolvedValue({
      context: {
        capabilities: ["clinic-inquiries:view"],
        clinic: { id: "clinic-1", name: "Synthetic Clinic" },
        principal: { displayName: "Synthetic Staff", email: "staff@example.test", id: "staff-1" },
      },
      status: "approved",
    })
    mocks.loadClinicDashboardWorkspaceInput.mockResolvedValue({ inquiryQueue: { status: "ready" } })
  })

  it("awaits search params and passes one safe inquiry focus into the workspace", async () => {
    render(
      await HomePage({
        searchParams: Promise.resolve({ inquiry: "inquiry-lukas-weber" }),
      }),
    )

    expect(screen.getByTestId("workspace")).toHaveAttribute("data-focus-inquiry-id", "inquiry-lukas-weber")
  })

  it.each([["inquiry/foreign"], [["inquiry-1", "inquiry-2"]]])(
    "drops an unsafe or ambiguous inquiry focus",
    async (inquiry) => {
      render(await HomePage({ searchParams: Promise.resolve({ inquiry }) }))
      expect(screen.getByTestId("workspace")).not.toHaveAttribute("data-focus-inquiry-id")
    },
  )

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
