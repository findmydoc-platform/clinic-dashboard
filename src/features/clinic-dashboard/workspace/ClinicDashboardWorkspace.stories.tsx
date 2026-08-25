import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
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
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VisualReference: Story = {
  args: { prototypeMode: "visual-reference" },
}

export const InquiryDeepLinkOpensInquiries: Story = {
  args: { focusInquiryId: "inquiry-lukas-weber" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Inquiries" })).toHaveAttribute("aria-current", "page")
  },
}
