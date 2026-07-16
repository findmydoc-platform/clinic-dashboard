import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { ClinicDashboardApp } from "@/components/organisms/ClinicDashboard/ClinicDashboardApp"
import { ThemeProvider } from "@/components/organisms/AppShell/ThemeProvider"

const meta = {
  component: ClinicDashboardApp,
  decorators: [
    (Story) => (
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <Story />
      </ThemeProvider>
    ),
  ],
  parameters: {
    a11y: { test: "error" },
    layout: "fullscreen",
    viewport: {
      options: {
        desktop1280: { name: "Desktop 1280", styles: { height: "900px", width: "1280px" } },
        mobile320Compact: { name: "Mobile 320 compact", styles: { height: "500px", width: "320px" } },
        mobile320Short: { name: "Mobile 320 short", styles: { height: "700px", width: "320px" } },
        mobile375Short: { name: "Mobile 375 short", styles: { height: "700px", width: "375px" } },
        mobile390Tall: { name: "Mobile 390 tall", styles: { height: "844px", width: "390px" } },
        tablet768: { name: "Tablet 768", styles: { height: "1024px", width: "768px" } },
      },
    },
  },
  tags: ["autodocs", "layer:template", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Templates/App Shell",
} satisfies Meta<typeof ClinicDashboardApp>

export default meta
type Story = StoryObj<typeof meta>

export const DashboardVisualReference: Story = {
  args: { variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const downloadButton = canvas.getByRole("button", { name: "Download profile views" })
    await expect(downloadButton).toBeInTheDocument()
    await expect(downloadButton.querySelector("svg")).toHaveClass("lucide-arrow-down")
    await expect(canvas.getByRole("button", { name: "Open preview" })).toBeInTheDocument()

    const funnelHeading = canvas.getByRole("heading", { name: "Conversion funnel (30 days)" })
    const funnel = funnelHeading.closest("section")
    await expect(funnel).not.toBeNull()
    await expect(
      Array.from(funnel?.querySelectorAll("[data-funnel-icon]") ?? []).map((icon) =>
        icon.getAttribute("data-funnel-icon"),
      ),
    ).toEqual(["eye", "mouse-pointer-click", "user-round", "message-square", "file-check"])
  },
}
export const DashboardAccountMenuOpen: Story = {
  args: { variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const trigger = canvas.getByRole("button", { name: "Open account menu for Sarah Schmidt" })

    await userEvent.click(trigger)
    const menu = canvas.getByRole("dialog", { name: "Account menu" })
    await expect(within(menu).getByText("Sarah Schmidt")).toBeInTheDocument()
    await expect(within(menu).getByText("Clinic administrator")).toBeInTheDocument()
    await expect(within(menu).getByRole("switch", { name: "Dark mode" })).toBeInTheDocument()
    await expect(within(menu).getByRole("button", { name: "Sign out" })).toBeInTheDocument()
  },
}
export const Dashboard7Days: Story = {
  args: { initialReportingPeriod: "7 days", variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByText("4,680").length).toBeGreaterThanOrEqual(2)
    await expect(canvas.getByText("+10.1% vs. previous 7 days")).toBeInTheDocument()
    await expect(canvas.getByText("1 new review in the last 7 days")).toBeInTheDocument()
    const chart = canvas.getByRole("group", {
      name: "Daily profile views across the selected 7 days total 848. The highest day has 135 profile views.",
    })
    const firstPoint = within(chart).getByRole("img", {
      name: "October 6: 103 profile views",
    })
    await userEvent.hover(firstPoint)
    await expect(
      within(chart).getByRole("tooltip", { name: "October 6: 103 profile views" }),
    ).toBeInTheDocument()
    await userEvent.unhover(firstPoint)
    firstPoint.focus()
    await expect(firstPoint).toHaveFocus()
    await expect(
      within(chart).getByRole("tooltip", { name: "October 6: 103 profile views" }),
    ).toBeInTheDocument()
    await userEvent.keyboard("{ArrowRight}")
    await expect(within(chart).getByRole("img", { name: "October 7: 111 profile views" })).toHaveFocus()
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
    await expect(canvas.getByRole("button", { name: "Review images" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Review team" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: /^View details/ })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "View reviews" })).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Download profile views" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Open preview" })).not.toBeInTheDocument()
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
      within(sevenDayChart as HTMLElement).getByRole("group", {
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
      within(ninetyDayChart as HTMLElement).getByRole("group", {
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

export const DashboardProfileTaskFlows: Story = {
  args: { variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const openAndCloseTask = async (groupName: string, actionName: string, dialogName: string) => {
      const task = page.getByRole("group", { name: groupName })
      const trigger = within(task).getByRole("button", { name: actionName })
      await userEvent.click(trigger)
      const dialog = page.getByRole("dialog", { name: dialogName })
      await expect(dialog).toBeInTheDocument()
      await expect(within(dialog).getByLabelText(/Status: Open, .* priority/)).toBeInTheDocument()
      await expect(within(dialog).queryByText("Status", { exact: true })).not.toBeInTheDocument()
      await userEvent.keyboard("{Escape}")
      await waitFor(() => expect(trigger).toHaveFocus())
    }

    await openAndCloseTask("Missing images profile task", "Review images", "Missing images")
    await openAndCloseTask("Open doctor profiles profile task", "Review team", "Open doctor profiles")
    await openAndCloseTask(
      "Certificates required profile task",
      "View details for Certificates required",
      "Certificates required",
    )
    await openAndCloseTask(
      "Certificate expiry profile task",
      "View details for Certificate expiry",
      "Certificate expiry",
    )

    const imageTrigger = page.getByRole("button", { name: "Review images" })
    await userEvent.click(imageTrigger)
    const imageDialog = page.getByRole("dialog", { name: "Missing images" })
    await userEvent.click(within(imageDialog).getByRole("button", { name: "Open image gallery" }))
    await expect(page.getByRole("heading", { level: 1, name: "Clinic profile" })).toBeInTheDocument()
    await waitFor(() => expect(page.getByRole("region", { name: "Clinic image gallery" })).toHaveFocus())

    await userEvent.click(page.getByRole("button", { name: "Dashboard" }))
    await userEvent.click(page.getByRole("button", { name: "Review team" }))
    const teamDialog = page.getByRole("dialog", { name: "Open doctor profiles" })
    await userEvent.click(within(teamDialog).getByRole("button", { name: "Open doctors and team" }))
    await waitFor(() =>
      expect(canvasElement.ownerDocument.querySelector("#clinic-profile-team")).toHaveFocus(),
    )
  },
}

export const DashboardProfileTaskMobile: Story = {
  args: { variant: "visual-reference" },
  globals: { viewport: { value: "mobile320Compact" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const certificateTask = page.getByRole("group", {
      name: "Certificates required profile task",
    })
    await userEvent.click(
      within(certificateTask).getByRole("button", {
        name: "View details for Certificates required",
      }),
    )
    const dialog = page.getByRole("dialog", { name: "Certificates required" })
    await expect(within(dialog).getByLabelText("Status: Open, High priority")).toBeInTheDocument()
    await expect(within(dialog).queryByText("Status", { exact: true })).not.toBeInTheDocument()
    await expect(
      within(dialog).getByText("Certificate management is not available yet.", { exact: false }),
    ).toBeInTheDocument()
    await expect(within(dialog).queryByRole("button", { name: /Open/ })).not.toBeInTheDocument()
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getAllByText("Hair transplant").length).toBeGreaterThanOrEqual(1)
    await expect(canvas.queryByText("Interest: Hair transplant")).not.toBeInTheDocument()
    await expect(canvas.getByLabelText("Write a message")).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Add smile emoji" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "Use reply template" })).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "View patient profile" }).querySelector("svg"),
    ).toHaveClass("lucide-file-text")
    await expect(canvasElement.querySelector("svg.lucide-stethoscope")).toBeInTheDocument()
  },
}
export const MessagesSearchAndPreview: Story = {
  args: { initialSection: "messages", variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.type(canvas.getByLabelText("Search conversations"), "Markus")
    const conversation = canvas.getByRole("button", { name: /Markus Schmidt/ })
    await userEvent.click(conversation)
    await expect(canvas.getByRole("heading", { level: 2, name: "Markus Schmidt" })).toBeInTheDocument()
    await expect(canvas.getByText("Conversation preview")).toBeInTheDocument()
    await expect(
      canvas.getByText("Full conversation details are not available in this prototype."),
    ).toBeInTheDocument()
    await expect(canvas.queryByRole("textbox", { name: "Write a message" })).not.toBeInTheDocument()
  },
}
export const MessagesThreadInteraction: Story = {
  args: { initialSection: "messages", variant: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("1 new")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Conversation menu" }))
    await userEvent.click(canvas.getByRole("menuitem", { name: "Mark as read" }))
    await expect(canvas.getByText("All read")).toBeInTheDocument()
    await expect(canvas.queryByText("1 new")).not.toBeInTheDocument()
    const composer = canvas.getByLabelText("Write a message")
    await userEvent.type(composer, "We can review the photos tomorrow.{enter}")
    await expect(canvas.getByText("We can review the photos tomorrow.")).toBeInTheDocument()
    await expect(composer).toHaveValue("")
    await userEvent.click(canvas.getByRole("button", { name: "Conversation menu" }))
    await userEvent.click(canvas.getByRole("menuitem", { name: "Mark as unread" }))
    await expect(canvas.getByText("1 new")).toBeInTheDocument()
  },
}
export const MessagesMobileInbox: Story = {
  args: { initialSection: "messages", variant: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Lukas Weber/ })).toBeInTheDocument()
    await expect(canvas.queryByRole("textbox", { name: "Write a message" })).not.toBeInTheDocument()
  },
}
export const MessagesMobileThreadDraft: Story = {
  args: { initialSection: "messages", variant: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: /Lukas Weber/ }))
    await expect(canvas.getByRole("button", { name: "Back to conversations" })).toBeInTheDocument()
    const threadHeading = canvas.getByRole("heading", { level: 1, name: "Lukas Weber" })
    await waitFor(() => expect(threadHeading).toHaveFocus())
    await expect(canvas.getByText(/Treatment:/)).toBeInTheDocument()
    const composer = canvas.getByLabelText("Write a message")
    await userEvent.type(composer, "Thank you, we will review the photos.")
    await userEvent.click(canvas.getByRole("button", { name: "Send message" }))
    await expect(canvas.getByText("Thank you, we will review the photos.")).toBeInTheDocument()
    await expect(composer).toHaveValue("")
  },
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
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const dialog = page.getByRole("dialog", { name: "Patient profile" })
    await expect(within(dialog).getByText("No phone number provided")).toBeInTheDocument()
  },
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
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Apply filters" }).querySelector("svg")).toHaveClass(
      "lucide-sliders-horizontal",
    )
    await expect(canvas.getByRole("button", { name: "Edit response" }).querySelector("svg")).toHaveClass(
      "lucide-pencil",
    )
    await expect(canvasElement.querySelector("svg.lucide-info")).toBeInTheDocument()
  },
}
export const ReviewsPresentation: Story = {
  args: { initialSection: "reviews", variant: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Reviews" })).toBeInTheDocument()
    await expect(canvas.getByText("Based on 1,248 reviews")).toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Export" })).not.toBeInTheDocument()
    const threeStarRating = canvas.getByRole("img", { name: "3 out of 5 stars" })
    await expect(threeStarRating.querySelectorAll('[data-star-state="full"]')).toHaveLength(3)
    await expect(threeStarRating.querySelectorAll('[data-star-state="empty"]')).toHaveLength(2)
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
