import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspace, type ClinicDashboardWorkspaceProps } from "./ClinicDashboardWorkspace"
import { ClinicDashboardWorkspaceHarness } from "./testing/public"

const productionArgs = {
  prototypeMode: "presentation",
} satisfies ClinicDashboardWorkspaceProps

const meta = {
  args: productionArgs,
  component: ClinicDashboardWorkspace,
  parameters: { layout: "fullscreen" },
  tags: ["domain:workspace", "layer:page", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Pages/Clinic Dashboard Workspace",
} satisfies Meta<typeof ClinicDashboardWorkspace>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}

export const VisualReferenceLocationSwitching: Story = {
  args: { prototypeMode: "visual-reference" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const header = within(canvas.getByRole("banner"))
    const dashboardLocation = within(
      canvas.getByRole("region", { name: "Dashboard clinic location summary" }),
    )
    const locationSelector = canvas.getByRole("combobox", { name: "Clinic location" })

    await expect(locationSelector).toHaveValue("berlin-mitte")
    await expect(locationSelector).toHaveDisplayValue("Mitte")
    await expect(
      header.getByRole("group", { name: "Current clinic identity: Berlin Health Clinic — Mitte" }),
    ).toBeInTheDocument()
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()

    await userEvent.selectOptions(locationSelector, "berlin-charlottenburg")
    await expect(locationSelector).toHaveDisplayValue("Charlottenburg")

    await expect(
      header.getByRole("group", {
        name: "Current clinic identity: Berlin Health Clinic — Charlottenburg",
      }),
    ).toBeInTheDocument()
    await expect(dashboardLocation.getByText("Charlottenburg, Berlin")).toBeInTheDocument()
    await expect(
      canvas.getByRole("button", { name: "Open account menu for Sarah Schmidt" }),
    ).toBeInTheDocument()
  },
}

export const PresentationUsesDefaultLocation: Story = {
  args: { prototypeMode: "presentation" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const header = within(canvas.getByRole("banner"))
    const dashboardLocation = within(
      canvas.getByRole("region", { name: "Dashboard clinic location summary" }),
    )

    await expect(canvas.queryByRole("combobox", { name: "Clinic location" })).not.toBeInTheDocument()
    await expect(
      header.getByRole("group", { name: "Current clinic identity: Berlin Health Clinic — Mitte" }),
    ).toBeInTheDocument()
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()
  },
}

export const LocationSwitchingAt320: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const locationSelector = canvas.getByRole("combobox", { name: "Clinic location" })

    await userEvent.selectOptions(locationSelector, "berlin-charlottenburg")
    await expect(locationSelector).toHaveValue("berlin-charlottenburg")
    await expect(locationSelector).toHaveDisplayValue("Charlottenburg")
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const Mobile: Story = {
  args: { prototypeMode: "visual-reference" },
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
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
        "This area is a visual placeholder only. Subscription details and actions are not available in this prototype.",
      ),
    ).toBeInTheDocument()
  },
}

export const PresentationHidesSubscriptions: Story = {
  args: { prototypeMode: "presentation" },
  render: () => (
    <ClinicDashboardWorkspaceHarness prototypeMode="presentation" start={{ section: "subscriptions" }} />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole("button", { name: "Subscriptions" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("heading", { level: 1, name: "Subscriptions" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
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
    const destination = canvas.getByRole("button", { name: "Certificates and accreditations" })

    await userEvent.click(destination)

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(
      canvas.getByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).toBeInTheDocument()
    await expect(
      canvas.getByText(
        "This area is a visual placeholder only. Certificate and accreditation details and actions are not available in this prototype.",
      ),
    ).toBeInTheDocument()
  },
}

export const PresentationHidesCertificatesAndAccreditations: Story = {
  args: { prototypeMode: "presentation" },
  render: () => (
    <ClinicDashboardWorkspaceHarness
      prototypeMode="presentation"
      start={{ section: "certificates-accreditations" }}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(
      canvas.queryByRole("button", { name: "Certificates and accreditations" }),
    ).not.toBeInTheDocument()
    await expect(
      canvas.queryByRole("heading", { level: 1, name: "Certificates and accreditations" }),
    ).not.toBeInTheDocument()
    await expect(canvas.getByRole("heading", { level: 1, name: "Dashboard" })).toBeInTheDocument()
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
    const destination = navigation.getByRole("button", { name: "Certificates and accreditations" })
    const label = within(destination).getByText("Certificates and accreditations")

    await expect(destination).toHaveAttribute("aria-current", "page")
    await expect(destination.scrollWidth).toBeLessThanOrEqual(destination.clientWidth)
    await expect(destination.scrollHeight).toBeLessThanOrEqual(destination.clientHeight)
    await expect(label.scrollWidth).toBeLessThanOrEqual(label.clientWidth)
    await expect(label.getBoundingClientRect().height).toBeGreaterThan(20)
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
