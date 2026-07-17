import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { ClinicDashboardWorkspace, type ClinicDashboardWorkspaceProps } from "./ClinicDashboardWorkspace"

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
    await expect(
      header.getByRole("group", { name: "Current clinic identity: Berlin Health Clinic — Mitte" }),
    ).toBeInTheDocument()
    await expect(dashboardLocation.getByText("Mitte, Berlin")).toBeInTheDocument()

    await userEvent.selectOptions(locationSelector, "berlin-charlottenburg")

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
