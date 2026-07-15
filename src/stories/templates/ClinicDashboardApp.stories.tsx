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
export const Dashboard7Days: Story = {
  args: { initialReportingPeriod: "7 days", variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByText("4,680").length).toBeGreaterThanOrEqual(2)
    await expect(canvas.getByText("+10.1% vs. previous 7 days")).toBeInTheDocument()
    await expect(canvas.getByText("1 new review in the last 7 days")).toBeInTheDocument()
  },
}
export const Dashboard90Days: Story = {
  args: { initialReportingPeriod: "90 days", variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByText("53,680").length).toBeGreaterThanOrEqual(2)
    await expect(canvas.getByText("+9.6% vs. previous 90 days")).toBeInTheDocument()
    await expect(canvas.getByText("17 new reviews in the last 90 days")).toBeInTheDocument()
  },
}
export const DashboardPresentation: Story = {
  args: { variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await expect(canvas.getAllByText("18,420", { selector: "strong" }).length).toBeGreaterThanOrEqual(2)
    await expect(canvas.queryByRole("group", { name: "Reporting period" })).not.toBeInTheDocument()
  },
}

export const DashboardWithInterfaceModeToggle: Story = {
  args: { showInterfaceModeToggle: true, variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const modeSwitch = canvas.getByRole("switch", { name: "Full interface" })
    await expect(modeSwitch).not.toBeChecked()
    await expect(canvas.queryByRole("group", { name: "Reporting period" })).not.toBeInTheDocument()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).toBeChecked()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeInTheDocument()
    const notificationButton = canvas.getByRole("button", {
      name: "Notifications, 2 new notifications",
    })
    await expect(notificationButton).toBeInTheDocument()
    await expect(canvas.getByText("+12.0% vs. previous 30 days")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "7 days" }))
    await expect(canvas.getByRole("button", { name: "7 days" })).toHaveAttribute("aria-pressed", "true")
    const sevenDayFunnelHeading = canvas.getByRole("heading", { name: "Conversion funnel (7 days)" })
    const sevenDayFunnel = sevenDayFunnelHeading.closest("section")
    await expect(sevenDayFunnel).not.toBeNull()
    await expect(within(sevenDayFunnel as HTMLElement).getByText("4,680")).toBeInTheDocument()
    await expect(within(sevenDayFunnel as HTMLElement).getByText("18.1% of impressions")).toBeInTheDocument()
    const sevenDayChartHeading = canvas.getByRole("heading", { name: "Profile views over time" })
    const sevenDayChart = sevenDayChartHeading.closest("section")
    await expect(sevenDayChart).not.toBeNull()
    await expect(
      within(sevenDayChart as HTMLElement).getByRole("img", {
        name: "Daily profile views across the selected 7 days total 848. The highest day has 135 profile views.",
      }),
    ).toBeInTheDocument()
    await expect(within(sevenDayChart as HTMLElement).getByText("4,680")).toBeInTheDocument()
    await expect(within(sevenDayChart as HTMLElement).getByText("848")).toBeInTheDocument()
    await expect(
      within(canvas.getByRole("region", { name: "Dashboard metrics" })).getByText("4,680"),
    ).toBeInTheDocument()
    await expect(canvas.getByText("+10.1% vs. previous 7 days")).toBeInTheDocument()
    await expect(canvas.getByText("1 new review in the last 7 days")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "90 days" }))
    const ninetyDayFunnelHeading = canvas.getByRole("heading", { name: "Conversion funnel (90 days)" })
    const ninetyDayFunnel = ninetyDayFunnelHeading.closest("section")
    await expect(ninetyDayFunnel).not.toBeNull()
    await expect(within(ninetyDayFunnel as HTMLElement).getByText("53,680")).toBeInTheDocument()
    await expect(within(ninetyDayFunnel as HTMLElement).getByText("17.5% of impressions")).toBeInTheDocument()
    const ninetyDayChartHeading = canvas.getByRole("heading", { name: "Profile views over time" })
    const ninetyDayChart = ninetyDayChartHeading.closest("section")
    await expect(ninetyDayChart).not.toBeNull()
    await expect(
      within(ninetyDayChart as HTMLElement).getByRole("img", {
        name: "Weekly profile views across the selected 90 days total 9,410. The chart aggregates daily activity into 13 weekly points.",
      }),
    ).toBeInTheDocument()
    await expect(within(ninetyDayChart as HTMLElement).getByText("53,680")).toBeInTheDocument()
    await expect(within(ninetyDayChart as HTMLElement).getByText("9,410")).toBeInTheDocument()
    await expect(canvas.getByText("+9.6% vs. previous 90 days")).toBeInTheDocument()
    await userEvent.click(notificationButton)
    const notifications = canvas.getByRole("dialog", { name: "Notifications" })
    await expect(within(notifications).getByText("New message from Lukas Weber")).toBeInTheDocument()
    await expect(within(notifications).getByText("New 3-star review needs a response")).toBeInTheDocument()
    await userEvent.click(within(notifications).getByRole("button", { name: "Mark all as read" }))
    const notificationStatus = within(notifications).getByRole("status")
    await expect(within(notificationStatus).getByText("You're up to date")).toBeInTheDocument()
    await waitFor(() => expect(notificationStatus).toHaveFocus())
    await expect(
      canvas.getByRole("button", { name: "Notifications, no new notifications" }),
    ).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(notificationButton).toHaveFocus())
  },
}

export const DashboardNotificationsOpen: Story = {
  args: { initialNotificationsOpen: true, variant: "visual-reference" },
}

export const DashboardNotificationsAllRead: Story = {
  args: {
    initialNotificationReadIds: ["message-lukas-weber", "review-response"],
    initialNotificationsOpen: true,
    variant: "visual-reference",
  },
}

export const DashboardHeaderMobileFullInterface: Story = {
  args: { initialNotificationsOpen: true, variant: "visual-reference" },
  globals: { viewport: { value: "mobile375Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("dialog", { name: "Notifications" })).toBeInTheDocument()
    await expect(canvas.getByRole("group", { name: "Reporting period" })).toBeInTheDocument()
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
  globals: { viewport: { value: "mobile320Short" } },
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
  globals: { viewport: { value: "mobile375Short" } },
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
  globals: { viewport: { value: "mobile320Short" } },
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
