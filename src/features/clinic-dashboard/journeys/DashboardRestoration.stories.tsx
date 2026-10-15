import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspaceHarness } from "@/features/clinic-dashboard/workspace/testing/public"
import { clinicProfileSourceFixture } from "@/features/clinic-dashboard/clinic-profile/testing/public"
import { clinicDashboardReportingFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
import { notificationCommandsFixture } from "@/features/clinic-dashboard/notifications/testing/public"

const incompleteProfile = {
  ...clinicProfileSourceFixture,
  published: {
    ...clinicProfileSourceFixture.published,
    address: {
      ...clinicProfileSourceFixture.published.address,
      city: undefined,
      street: "",
      houseNumber: "",
      zipCode: "",
    },
  },
}

const meta = {
  component: ClinicDashboardWorkspaceHarness,
  args: { prototypeMode: "presentation", profileSourceSnapshot: incompleteProfile },
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:stable"],
  title: "Clinic Dashboard/Journeys/Pages/Dashboard Restoration",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>
export default meta
type Story = StoryObj<typeof meta>

export const RetainsPeriodAndMetricThroughReviewNavigation: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Contacts Not supported yet/ }))
    await userEvent.click(canvas.getByRole("button", { name: "90 days" }))
    await userEvent.click(canvas.getByRole("button", { name: "View reviews" }))
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    await expect(canvas.getByRole("button", { name: "90 days" })).toHaveAttribute("aria-pressed", "true")
    await expect(canvas.getByRole("button", { name: /Contacts Not supported yet/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    )
    await expect(canvas.getByRole("heading", { name: "Contacts" })).toBeVisible()
  },
}

export const NotificationFailureLeavesReportingAndTasksUsable: Story = {
  args: {
    loadReporting: fn(async (days) => ({
      ...clinicDashboardReportingFixture,
      period: { ...clinicDashboardReportingFixture.period, days },
    })),
    notificationCommands: {
      ...notificationCommandsFixture,
      load: fn(async () => ({ ok: false, error: "SERVICE_UNAVAILABLE" }) as const),
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "90 days" }))
    await expect(canvas.getByRole("heading", { name: "Conversion funnel (90 days)" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: /^Notifications,/ }))
    await expect(args.notificationCommands!.load).toHaveBeenCalled()
    await userEvent.click(canvas.getByRole("button", { name: "Close notifications" }))
    await expect(canvas.getByRole("list", { name: "Profile tasks" })).toBeVisible()
    await expect(
      within(canvas.getByRole("region", { name: "Dashboard metrics" })).getByText("284"),
    ).toBeVisible()
    await expect(args.loadReporting).toHaveBeenCalledTimes(1)
    await userEvent.click(canvas.getByRole("button", { name: "View details for Complete address" }))
    await expect(
      within(canvasElement.ownerDocument.body).getByRole("dialog", { name: "Complete address" }),
    ).toBeVisible()
  },
}

export const ReportingFailureLeavesNotificationsAndProfileUsable: Story = {
  args: { loadReporting: fn(async () => undefined) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "90 days" }))
    await expect(await canvas.findByRole("button", { name: "Retry reporting" })).toBeVisible()
    await expect(canvas.getByRole("list", { name: "Profile tasks" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: /^Notifications,/ }))
    await expect(await canvas.findByRole("button", { name: "Close notifications" })).toBeVisible()
  },
}

export const NarrowDashboard: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { name: "Dashboard" })).toBeVisible()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /^Notifications,/ })).toBeVisible()
    await expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(window.innerWidth)
  },
}

export const DarkDashboard: Story = { globals: { theme: "dark" } }
