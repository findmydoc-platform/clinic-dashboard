import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { authenticatedClinicContextFixture } from "./testing/workspace.fixtures"
import { ClinicDashboardWorkspaceHarness, clinicDashboardWorkspaceFixture } from "./testing/public"
import { inquiryCommandsFixture } from "@/features/clinic-dashboard/messages/testing/public"
import { createClinicProfileSourceSaveFailureCommandsFixture } from "@/features/clinic-dashboard/clinic-profile/testing/public"
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
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent(
        "Charlottenburg",
      ),
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

export const LocationDeparturePreservesProfileOnStay: Story = {
  ...VisualReference,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await userEvent.click(canvas.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(canvas.getByRole("textbox", { name: "Clinic name" }), " pending")
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    const dialog = await body.findByRole("alertdialog", { name: "Leave profile editing?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }))
    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toHaveValue(
      "Medicana International Istanbul pending",
    )
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent("Mitte")
  },
}

export const LocationDepartureDiscardsOnlyInquiryDrafts: Story = {
  ...VisualReference,
  render: (args) => (
    <ClinicDashboardWorkspaceHarness
      {...args}
      reportingDemo={dashboardFixture}
      inquiryCommands={inquiryCommandsFixture}
      start={{ section: "messages" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    const reply = await canvas.findByRole("textbox", { name: "Reply to patient" })
    await userEvent.type(reply, "Unsent clinic reply")
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    let dialog = await body.findByRole("alertdialog", { name: "Leave unfinished inquiries?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }))
    await expect(reply).toHaveValue("Unsent clinic reply")
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent("Mitte")
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    dialog = await body.findByRole("alertdialog", { name: "Leave unfinished inquiries?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Discard and continue" }))
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent(
        "Charlottenburg",
      ),
    )
    await expect(reply).toHaveValue("")
    await expect(canvas.getByRole("button", { name: "Inquiries" })).toHaveAttribute("aria-current", "page")
  },
}

export const LocationDepartureFailedSaveKeepsOriginalClinic: Story = {
  ...VisualReference,
  render: (args) => (
    <ClinicDashboardWorkspaceHarness
      {...args}
      reportingDemo={dashboardFixture}
      profileSourceCommands={createClinicProfileSourceSaveFailureCommandsFixture()}
      start={{ section: "profile" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(canvas.getByRole("textbox", { name: "Clinic name" }), " pending")
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    const dialog = await body.findByRole("alertdialog", { name: "Leave profile editing?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Save draft and leave" }))
    await waitFor(() =>
      expect(within(dialog).getByRole("alert")).toHaveTextContent(
        "The draft was created, but your changes could not be saved.",
      ),
    )
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }))
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent("Mitte")
    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toHaveValue(
      "Medicana International Istanbul pending",
    )
  },
}

export const LocationDepartureSavesBeforeContinuation: Story = {
  ...VisualReference,
  render: (args) => (
    <ClinicDashboardWorkspaceHarness
      {...args}
      reportingDemo={dashboardFixture}
      start={{ section: "profile" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(canvas.getByRole("textbox", { name: "Clinic name" }), " saved")
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    const dialog = await body.findByRole("alertdialog", { name: "Leave profile editing?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Save draft and leave" }))
    await waitFor(() =>
      expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toHaveTextContent(
        "Charlottenburg",
      ),
    )
    await expect(canvas.getByRole("button", { name: "Clinic profile" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    expect(body.queryByRole("alertdialog", { name: "Leave profile editing?" })).not.toBeInTheDocument()
  },
}

export const MobileInquiryDepartureDecision: Story = {
  ...VisualReference,
  globals: { viewport: { value: "mobile390Tall" } },
  render: (args) => (
    <ClinicDashboardWorkspaceHarness
      {...args}
      reportingDemo={dashboardFixture}
      inquiryCommands={inquiryCommandsFixture}
      start={{ section: "messages" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await userEvent.type(
      await canvas.findByRole("textbox", { name: "Reply to patient" }),
      "Unsent clinic reply",
    )
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    const dialog = await body.findByRole("alertdialog", { name: "Leave unfinished inquiries?" })
    const stay = within(dialog).getByRole("button", { name: "Keep editing" })
    await waitFor(() => expect(stay).toHaveFocus())
    await userEvent.tab()
    await waitFor(() =>
      expect(within(dialog).getByRole("button", { name: "Discard and continue" })).toHaveFocus(),
    )
    await userEvent.tab()
    await waitFor(() => expect(stay).toHaveFocus())
    expect(dialog.getBoundingClientRect().width).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientWidth,
    )
  },
}

export const DarkInquiryDepartureDecision: Story = {
  ...MobileInquiryDepartureDecision,
  globals: { theme: "dark", viewport: { value: "mobile390Tall" } },
}

export const LocationDepartureProtectsHiddenProfile: Story = {
  ...VisualReference,
  render: (args) => (
    <ClinicDashboardWorkspaceHarness
      {...args}
      reportingDemo={dashboardFixture}
      start={{ section: "profile" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const body = within(canvasElement.ownerDocument.body)
    await userEvent.click(canvas.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(canvas.getByRole("textbox", { name: "Clinic name" }), " pending")
    await userEvent.click(canvas.getByRole("button", { name: "Dashboard" }))
    await userEvent.click(canvas.getByRole("button", { name: /Switch clinic location/ }))
    await userEvent.click(body.getByRole("menuitem", { name: /Charlottenburg/ }))
    const dialog = await body.findByRole("alertdialog", { name: "Leave profile editing?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Keep editing" }))
    await expect(canvas.getByRole("button", { name: "Dashboard" })).toHaveAttribute("aria-current", "page")
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toHaveValue(
      "Medicana International Istanbul pending",
    )
  },
}
