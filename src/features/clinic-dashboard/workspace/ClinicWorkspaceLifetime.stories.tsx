import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import {
  notificationCommandsFixture,
  notificationPageFixture,
} from "@/features/clinic-dashboard/notifications/testing/public"
import { ClinicWorkspaceLifetimeProvider } from "./ClinicWorkspaceLifetime"
import { ClinicDashboardWorkspace } from "./ClinicDashboardWorkspace"
import { authenticatedClinicContextFixture } from "./testing/workspace.fixtures"
import { clinicDashboardWorkspaceFixture } from "./testing/public"

const meta = {
  component: ClinicWorkspaceLifetimeProvider,
  args: {
    isolated: true,
    notificationCommands: notificationCommandsFixture,
    children: (
      <ClinicDashboardWorkspace
        authenticatedContext={authenticatedClinicContextFixture}
        prototypeMode="presentation"
        workspaceInput={clinicDashboardWorkspaceFixture}
        initialNotifications={{ status: "ready", response: notificationPageFixture }}
      />
    ),
  },
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Clinic Workspace Lifetime",
} satisfies Meta<typeof ClinicWorkspaceLifetimeProvider>
export default meta
type Story = StoryObj<typeof meta>

export const PersonalNotificationOwner: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(
      await canvas.findByRole("button", { name: "Notifications, 2 unread notifications" }),
    )
    const center = await body.findByRole("dialog", { name: "Notifications" })
    await expect(within(center).getByText("Clinic One", { exact: true })).toBeVisible()
    await expect(within(center).getByText("Clinic Two", { exact: true })).toBeVisible()
    await userEvent.click(within(center).getByRole("button", { name: "Close notifications" }))
    await expect(canvas.getByRole("heading", { name: "Dashboard" })).toBeVisible()
  },
}
