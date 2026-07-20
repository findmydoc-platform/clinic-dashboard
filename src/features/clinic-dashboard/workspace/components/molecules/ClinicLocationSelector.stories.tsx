import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { workspaceLocationFixtures, workspaceOrganizationFixture } from "../../testing/workspace.fixtures"
import { ClinicLocationSelector } from "./ClinicLocationSelector"

const meta = {
  args: {
    canSwitchLocations: true,
    locations: workspaceLocationFixtures,
    onValueChange: fn(),
    organizationName: workspaceOrganizationFixture.name,
    value: "berlin-mitte",
  },
  component: ClinicLocationSelector,
  render: (args) => <ControlledClinicLocationSelector key={args.value} {...args} />,
  tags: ["domain:workspace", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Molecules/Clinic Location Selector",
} satisfies Meta<typeof ClinicLocationSelector>

export default meta
type Story = StoryObj<typeof meta>

function ControlledClinicLocationSelector(props: ComponentProps<typeof ClinicLocationSelector>) {
  const [value, setValue] = useState(props.value)

  return (
    <div className="w-full max-w-md">
      <ClinicLocationSelector
        {...props}
        onValueChange={(nextValue) => {
          setValue(nextValue)
          props.onValueChange(nextValue)
        }}
        value={value}
      />
    </div>
  )
}

export const KeyboardFocusAndSelection: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.tab()
    await expect(trigger).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")

    const currentLocation = await page.findByRole("menuitem", { name: /Berlin Health Clinic — Mitte/ })
    const charlottenburg = page.getByRole("menuitem", {
      name: /Berlin Health Clinic — Charlottenburg/,
    })
    await waitFor(() => expect(currentLocation).toHaveFocus())
    await expect(currentLocation).toHaveAttribute("aria-current", "location")
    await userEvent.keyboard("{ArrowDown}")
    await expect(charlottenburg).toHaveFocus()
    await userEvent.keyboard("{Enter}")

    await waitFor(() => expect(page.queryByRole("menu")).not.toBeInTheDocument())
    await expect(trigger).toHaveAccessibleName(/Current location: Berlin Health Clinic — Charlottenburg/)
    await expect(args.onValueChange).toHaveBeenCalledWith("berlin-charlottenburg")
    await expect(trigger).toHaveFocus()
  },
}

export const NarrowViewport: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: /Switch clinic location/ })

    await userEvent.click(trigger)
    const potsdam = await page.findByRole("menuitem", { name: /Berlin Health Clinic — Potsdam/ })
    await expect(potsdam.getBoundingClientRect().right).toBeLessThanOrEqual(
      canvasElement.ownerDocument.documentElement.clientWidth,
    )
    await userEvent.click(potsdam)
    await expect(trigger).toHaveAccessibleName(/Current location: Berlin Health Clinic — Potsdam/)
    await expect(canvas.getByText("Potsdam", { exact: true })).toBeVisible()
    await expect(canvas.getByText("Berlin Health Clinic — Potsdam", { exact: true })).not.toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const StaticIdentity: Story = {
  args: { canSwitchLocations: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.queryByRole("button", { name: /Switch clinic location/ })).not.toBeInTheDocument()
    await expect(
      canvas.getByRole("group", { name: "Current clinic identity: Berlin Health Clinic — Mitte" }),
    ).toBeInTheDocument()
    await expect(canvas.getByText(workspaceOrganizationFixture.name)).toBeInTheDocument()
  },
}
