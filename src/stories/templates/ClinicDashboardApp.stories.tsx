import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ClinicDashboardApp } from "@/components/organisms/ClinicDashboard/ClinicDashboardApp"

const meta = {
  component: ClinicDashboardApp,
  parameters: {
    a11y: { test: "error" },
    layout: "fullscreen",
    viewport: {
      options: {
        desktop1280: { name: "Desktop 1280", styles: { height: "900px", width: "1280px" } },
        mobile320Short: { name: "Mobile 320 short", styles: { height: "700px", width: "320px" } },
        mobile375Short: { name: "Mobile 375 short", styles: { height: "700px", width: "375px" } },
        tablet768: { name: "Tablet 768", styles: { height: "1024px", width: "768px" } },
      },
    },
  },
  tags: ["autodocs", "layer:template", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Templates/App Shell",
} satisfies Meta<typeof ClinicDashboardApp>

export default meta
type Story = StoryObj<typeof meta>

export const DashboardVisualReference: Story = { args: { variant: "visual-reference" } }
export const DashboardPresentation: Story = {
  args: { variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await expect(canvas.getAllByText("18,420", { selector: "strong" }).length).toBeGreaterThanOrEqual(2)
    await expect(canvas.queryByRole("group", { name: "Reporting period" })).not.toBeInTheDocument()
  },
}

export const MessagesVisualReference: Story = {
  args: { initialSection: "messages", variant: "visual-reference" },
}
export const MessagesPresentation: Story = {
  args: { initialSection: "messages", variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await expect(canvas.getByText(/initial consultation/)).toBeInTheDocument()
    await expect(canvas.queryByLabelText("Write a message")).not.toBeInTheDocument()
  },
}

export const PatientProfileVisualReference: Story = {
  args: { initialDialog: "patient-profile", initialSection: "messages", variant: "visual-reference" },
}
export const PatientProfilePresentation: Story = {
  args: { initialDialog: "patient-profile", initialSection: "messages", variant: "presentation" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("dialog", { name: "Patient profile" })).toBeInTheDocument()
    await expect(page.getByText("l.weber@example.com")).toBeInTheDocument()
    await expect(page.queryByText("Medical notes")).not.toBeInTheDocument()
  },
}

export const ReviewsVisualReference: Story = {
  args: { initialSection: "reviews", variant: "visual-reference" },
}
export const ReviewsPresentation: Story = {
  args: { initialSection: "reviews", variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByText("Based on 1,248 reviews")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Export" })).not.toBeInTheDocument()
  },
}

export const ClinicProfileVisualReference: Story = {
  args: { initialSection: "profile", variant: "visual-reference" },
}
export const ClinicProfilePresentation: Story = {
  args: { initialSection: "profile", variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Clinic profile" })).toBeInTheDocument()
    await expect(canvas.getByDisplayValue("Berlin Health Dental & Derm Clinic")).toBeDisabled()
  },
}

export const NewTreatmentVisualReference: Story = {
  args: { initialDialog: "treatment", initialSection: "profile", variant: "visual-reference" },
}
export const NewTreatmentPresentation: Story = {
  args: { initialSection: "profile", variant: "presentation" },
  parameters: { viewport: { defaultViewport: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const trigger = page.getByRole("button", { name: "New treatment" })
    await userEvent.click(trigger)
    await expect(page.getByRole("dialog", { name: "Create new treatment" })).toBeInTheDocument()
    await expect(page.getByLabelText("Treatment name")).toBeDisabled()
    await userEvent.click(page.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Create new treatment" })).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(trigger).toHaveFocus())
    await userEvent.click(trigger)
    await expect(page.getByRole("dialog", { name: "Create new treatment" })).toBeInTheDocument()
  },
}

export const AddTeamMemberVisualReference: Story = {
  args: { initialDialog: "team-member", initialSection: "profile", variant: "visual-reference" },
}
export const AddTeamMemberPresentation: Story = {
  args: { initialSection: "profile", variant: "presentation" },
  parameters: { viewport: { defaultViewport: "mobile375Short" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const trigger = page.getByRole("button", { name: "Add team member" })
    await userEvent.click(trigger)
    await expect(page.getByRole("dialog", { name: "Add team member" })).toBeInTheDocument()
    await expect(page.getByLabelText("First name")).toBeDisabled()
    await userEvent.click(page.getByRole("button", { name: "Cancel" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Add team member" })).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const MobileNavigationPresentation: Story = {
  args: { variant: "presentation" },
  parameters: { viewport: { defaultViewport: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const trigger = page.getByRole("button", { name: "Open navigation" })
    await userEvent.click(trigger)
    const dialog = page.getByRole("dialog", { name: "Clinic navigation" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Messages" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Clinic navigation" })).not.toBeInTheDocument(),
    )
    await expect(page.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}
