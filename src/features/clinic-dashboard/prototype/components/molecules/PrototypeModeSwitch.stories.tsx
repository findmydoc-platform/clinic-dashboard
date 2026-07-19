import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { PrototypeModeSwitch } from "./PrototypeModeSwitch"

const meta = {
  component: PrototypeModeSwitch,
  render: (args) => <ControlledPrototypeModeSwitch key={String(args.checked)} {...args} />,
  tags: ["domain:workspace", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Workspace/Molecules/Prototype Mode Switch",
} satisfies Meta<typeof PrototypeModeSwitch>

export default meta
type Story = StoryObj<typeof meta>

function ControlledPrototypeModeSwitch(props: ComponentProps<typeof PrototypeModeSwitch>) {
  const [checked, setChecked] = useState(props.checked)

  return (
    <PrototypeModeSwitch
      {...props}
      checked={checked}
      onCheckedChange={(nextChecked) => {
        setChecked(nextChecked)
        props.onCheckedChange(nextChecked)
      }}
    />
  )
}

export const Interactive: Story = {
  args: {
    checked: false,
    onCheckedChange: fn(),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const modeSwitch = canvas.getByRole("switch", { name: "Demo scope" })
    await expect(modeSwitch).not.toBeChecked()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).toBeChecked()
    await expect(canvas.getByText("All demo screens")).toBeInTheDocument()
  },
}
