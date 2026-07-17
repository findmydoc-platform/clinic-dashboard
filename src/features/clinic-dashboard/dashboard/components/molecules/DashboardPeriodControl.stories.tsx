import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { DashboardPeriodControl } from "./DashboardPeriodControl"

const meta = {
  component: DashboardPeriodControl,
  render: (args) => <ControlledDashboardPeriodControl key={args.value} {...args} />,
  tags: ["domain:dashboard", "layer:molecule", "status:prototype"],
  title: "Clinic Dashboard/Dashboard/Molecules/Dashboard Period Control",
} satisfies Meta<typeof DashboardPeriodControl>

export default meta
type Story = StoryObj<typeof meta>

function ControlledDashboardPeriodControl(props: ComponentProps<typeof DashboardPeriodControl>) {
  const [value, setValue] = useState(props.value)

  return (
    <DashboardPeriodControl
      {...props}
      onValueChange={(nextValue) => {
        setValue(nextValue)
        props.onValueChange(nextValue)
      }}
      value={value}
    />
  )
}

export const Interactive: Story = {
  args: { onValueChange: fn(), value: "30 days" },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const thirtyDays = canvas.getByRole("button", { name: "30 days" })
    const ninetyDays = canvas.getByRole("button", { name: "90 days" })

    await expect(thirtyDays).toHaveAttribute("aria-pressed", "true")
    await userEvent.click(ninetyDays)
    await expect(ninetyDays).toHaveAttribute("aria-pressed", "true")
    await expect(thirtyDays).toHaveAttribute("aria-pressed", "false")
    await expect(args.onValueChange).toHaveBeenCalledWith("90 days")
  },
}

export const MobileTouchTargets: Story = {
  args: { onValueChange: fn(), value: "7 days" },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    for (const period of ["7 days", "30 days", "90 days"]) {
      const button = canvas.getByRole("button", { name: period })
      await expect(button.getBoundingClientRect().height).toBeGreaterThanOrEqual(44)
    }
  },
}
