import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspaceHarness } from "./public"

const productionArgs = {
  prototypeMode: "presentation",
} as const

const meta = {
  args: productionArgs,
  component: ClinicDashboardWorkspaceHarness,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Workspace Fixture Journeys",
} satisfies Meta<typeof ClinicDashboardWorkspaceHarness>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VisualReferenceLocationSwitching: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const header = within(canvas.getByRole("banner"))
    const dashboardLocation = within(
      canvas.getByRole("region", { name: "Dashboard clinic location summary" }),
    )
    const locationSelector = header.getByRole("button", { name: /Switch clinic location/ })

    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Mitte/,
    )
    await expect(header.getByText("Berlin Health Group")).toBeInTheDocument()
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )

    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
    await expect(dashboardLocation.getByText("Charlottenburg, Berlin")).toBeInTheDocument()
    await expect(canvas.getByRole("status")).toHaveTextContent(
      "Location changed to Berlin Health Clinic — Charlottenburg.",
    )
    await expect(canvas.getAllByText("91%")[0]).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Messages" }))
    await expect(canvas.getByRole("heading", { name: "Lukas Weber" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await expect(canvas.getByText("Eva Fixture")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByDisplayValue("Berlin Health Clinic — Charlottenburg")).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Open account menu for Sarah Schmidt" }),
    ).toBeInTheDocument()
  },
}

export const PresentationLocationSwitching: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const header = within(canvas.getByRole("banner"))
    const dashboardLocation = within(
      canvas.getByRole("region", { name: "Dashboard clinic location summary" }),
    )
    const locationSelector = header.getByRole("button", { name: /Switch clinic location/ })

    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Mitte/,
    )
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )
    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
  },
}

export const LocationSwitchingAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const locationSelector = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.click(locationSelector)
    await userEvent.click(
      await page.findByRole("menuitem", { name: /Berlin Health Clinic — Charlottenburg/ }),
    )
    await expect(locationSelector).toHaveAccessibleName(
      /Current location: Demo data · Berlin Health Clinic — Charlottenburg/,
    )
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const Mobile: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: /Switch clinic location/ })).toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))
    await userEvent.click(
      within(canvas.getByRole("dialog", { name: "Clinic navigation" })).getByRole("button", {
        name: "Messages",
      }),
    )
    await expect(await canvas.findByRole("heading", { level: 1, name: "Messages" })).toBeInTheDocument()
  },
}

export const VisualReferenceSubscriptions: Story = {
  args: { prototypeMode: "visual-reference" },
  render: () => <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const subscriptions = canvas.getByRole("button", { name: "Subscriptions" })

    await userEvent.click(subscriptions)

    await expect(subscriptions).toHaveAttribute("aria-current", "page")
    await expect(canvas.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
    await expect(
      canvas.getByText(
        "This area is a visual placeholder only. Subscription details and actions are not available in this demo.",
      ),
    ).toBeInTheDocument()
  },
}

export const PresentationSubscriptionsPlaceholder: Story = {
  args: { prototypeMode: "presentation" },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="presentation" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Subscriptions" })).toHaveAttribute(
      "aria-current",
      "page",
    )
    await expect(canvas.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
    const region = canvas.getByRole("region", { name: "Subscriptions" })
    await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
    await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
  },
}

export const SubscriptionsAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const region = canvas.getByRole("region", { name: "Subscriptions" })

    await expect(within(region).getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
    await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
    await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const SubscriptionsDark: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { theme: "dark" },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Subscriptions" })).toBeInTheDocument()
  },
}

export const VisualReferenceCertificatesAndAccreditations: Story = {
  args: { prototypeMode: "visual-reference" },
  render: () => <ClinicDashboardWorkspaceHarness prototypeMode="visual-reference" />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const destination = canvas.getByRole("button", { name: "Credentials" })

    await userEvent.click(destination)

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    await expect(
      canvas.getByText(
        "This area is a visual placeholder only. Certificate and accreditation details and actions are not available in this demo.",
      ),
    ).toBeInTheDocument()
  },
}

export const PresentationCredentialsPlaceholder: Story = {
  args: { prototypeMode: "presentation" },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="presentation"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("button", { name: "Credentials" })).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    const region = canvas.getByRole("region", { name: "Certificates and accreditations" })
    await expect(within(region).queryByRole("button")).not.toBeInTheDocument()
    await expect(within(region).queryByRole("link")).not.toBeInTheDocument()
  },
}

export const CertificatesAndAccreditationsAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="visual-reference"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Open navigation" }))

    const navigation = within(canvas.getByRole("dialog", { name: "Clinic navigation" }))
    const destination = navigation.getByRole("button", { name: "Credentials" })
    const label = within(destination).getByText("Credentials")

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(destination.scrollWidth).toBeLessThanOrEqual(destination.clientWidth)
    await expect(destination.scrollHeight).toBeLessThanOrEqual(destination.clientHeight)
    await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    await expect(label).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const CertificatesAndAccreditationsDark: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { theme: "dark" },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="visual-reference"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
  },
}

export const PotsdamWorkspaceContent: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const locationSelector = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.click(locationSelector)
    await userEvent.click(await page.findByRole("menuitem", { name: /Berlin Health Clinic — Potsdam/ }))
    await expect(canvas.getAllByText("64%")[0]).toBeInTheDocument()

    await userEvent.click(canvas.getByRole("button", { name: "Messages" }))
    await expect(canvas.getByRole("heading", { name: "Lukas Weber" })).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Reviews" }))
    await expect(canvas.getByText("Greta Fixture")).toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByDisplayValue("Berlin Health Clinic — Potsdam")).toBeInTheDocument()
  },
}

export const OrganizationNotificationsShowLocations: Story = {
  args: { prototypeMode: "visual-reference" },
  render: () => (
    <ClinicDashboardWorkspaceHarness notificationState={{ isOpen: true }} prototypeMode="visual-reference" />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    const notificationList = page.getByRole("list", { name: "New notifications" })

    await expect(within(notificationList).getByText("Mitte")).toBeInTheDocument()
    await expect(within(notificationList).getByText("Charlottenburg")).toBeInTheDocument()
  },
}

export const DemoBadgeAndFourImageGallery: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByText("Mixed data")[0]).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await expect(canvas.getByRole("button", { name: "View all images" })).toBeInTheDocument()
  },
}

export const FourImageGalleryDark: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { theme: "dark" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)

    await userEvent.click(canvas.getByRole("button", { name: "Clinic profile" }))
    await userEvent.click(canvas.getByRole("button", { name: "View all images" }))

    const dialog = await page.findByRole("dialog", { name: "Edit clinic images" })
    await expect(canvasElement.ownerDocument.documentElement).toHaveClass("dark")
    await expect(within(dialog).getAllByRole("img")).toHaveLength(4)
    await expect(within(dialog).getByLabelText("Current cover image")).toBeVisible()
    await expect(within(dialog).getAllByRole("button", { name: "Set cover" })).toHaveLength(3)
    await expect(within(dialog).getByRole("button", { name: "Done" })).toBeVisible()
  },
}
