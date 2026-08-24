import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { getRouter } from "@storybook/nextjs-vite/navigation.mock"
import { expect, userEvent, within } from "storybook/test"
import { authenticatedClinicContextFixture } from "./testing/workspace.fixtures"
import { clinicDashboardWorkspaceFixture } from "./testing/public"
import { ClinicDashboardWorkspace } from "./ClinicDashboardWorkspace"

const meta = {
  args: {
    authenticatedContext: authenticatedClinicContextFixture,
    prototypeMode: "presentation",
    workspaceInput: clinicDashboardWorkspaceFixture,
  },
  component: ClinicDashboardWorkspace,
  parameters: { layout: "fullscreen", nextjs: { appDirectory: true } },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VisualReference: Story = {
  args: { prototypeMode: "visual-reference" },
}

export const ProfileProgressRetryRefreshesRoute: Story = {
  args: {
    workspaceInput: {
      ...clinicDashboardWorkspaceFixture,
      profileProgress: {
        message: "Public profile progress is temporarily unavailable.",
        reason: "profile-unavailable",
        status: "error",
      },
    },
  },
  play: async ({ canvasElement }) => {
    const router = getRouter()
    router.refresh.mockClear()

    await userEvent.click(within(canvasElement).getByRole("button", { name: "Retry" }))

    await expect(router.refresh).toHaveBeenCalledOnce()
  },
}
