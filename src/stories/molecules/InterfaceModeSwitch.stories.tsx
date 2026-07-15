import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, within } from "storybook/test"
import { InterfaceModeSwitch } from "@/components/molecules/InterfaceModeSwitch"

const meta = {
  component: InterfaceModeSwitch,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs", "layer:molecule", "domain:clinic-dashboard"],
  title: "Clinic Dashboard/Molecules/Interface Mode Switch",
} satisfies Meta<typeof InterfaceModeSwitch>

export default meta
type Story = StoryObj<typeof meta>

function StatefulInterfaceModeSwitch() {
  const [checked, setChecked] = useState(false)

  return <InterfaceModeSwitch checked={checked} onCheckedChange={setChecked} />
}

export const Interactive: Story = {
  args: {
    checked: false,
    onCheckedChange: () => undefined,
  },
  render: () => <StatefulInterfaceModeSwitch />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const modeSwitch = canvas.getByRole("switch", { name: "Full interface" })
    await expect(modeSwitch).not.toBeChecked()
    await userEvent.click(modeSwitch)
    await expect(modeSwitch).toBeChecked()
    await expect(canvas.getByText("All prototype UI")).toBeInTheDocument()
  },
}
