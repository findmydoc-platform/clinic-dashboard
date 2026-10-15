import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { authenticatedClinicContextFixture } from "./testing/workspace.fixtures"
import { ClinicDashboardWorkspaceHarness, clinicDashboardWorkspaceFixture } from "./testing/public"
import { dashboardFixture } from "@/features/clinic-dashboard/dashboard/testing/public"
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
  render: (args) => <ClinicDashboardWorkspaceHarness {...args} reportingDemo={dashboardFixture} />,
}

export const ReportingDemoInteractions: Story = {
  ...VisualReference,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText(/Reporting demo. Sample measurements/)).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: /Contacts 42/ }))
    await expect(canvas.getByRole("heading", { name: "Contacts over time" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(canvas.getByRole("button", { name: /Contacts 12/ })).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(within(document.body).getByRole("menuitem", { name: /Charlottenburg/ }))
    await expect(canvas.getByRole("heading", { name: "Contacts over time" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent(
      "Charlottenburg",
    )
  },
}

export const InquiryDeepLinkOpensInquiries: Story = {
  args: { focusInquiryId: "inquiry-lukas-weber" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Inquiries" })).toHaveAttribute("aria-current", "page")
  },
}
