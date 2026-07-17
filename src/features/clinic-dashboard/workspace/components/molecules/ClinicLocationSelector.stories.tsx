import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { workspaceLocationFixtures } from "../../testing/workspace.fixtures"
import { ClinicLocationSelector } from "./ClinicLocationSelector"

const meta = {
  args: {
    locations: workspaceLocationFixtures,
    onValueChange: fn(),
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
    <div className="w-full max-w-sm">
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
    const selector = within(canvasElement).getByRole("combobox", { name: "Clinic location" })

    await userEvent.tab()
    await expect(selector).toHaveFocus()
    await expect(selector).toHaveDisplayValue("Mitte")
    await userEvent.keyboard("{ArrowDown}")
    await expect(selector).toHaveValue("berlin-charlottenburg")
    await expect(selector).toHaveDisplayValue("Charlottenburg")
    await expect(args.onValueChange).toHaveBeenCalledWith("berlin-charlottenburg")
    await expect(selector).toHaveFocus()
  },
}

export const NarrowViewport: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const selector = canvas.getByRole("combobox", { name: "Clinic location" })

    await expect(selector).toHaveValue("berlin-mitte")
    await expect(selector).toHaveDisplayValue("Mitte")
    await userEvent.selectOptions(selector, "berlin-charlottenburg")
    await expect(selector).toHaveDisplayValue("Charlottenburg")
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}
