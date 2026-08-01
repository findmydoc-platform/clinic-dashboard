import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { Field } from "./field"
import { Combobox } from "./combobox"

const options = [
  { label: "Ankara", value: "ankara" },
  { label: "Antalya", value: "antalya" },
  { label: "Istanbul", value: "istanbul" },
  { label: "Izmir", value: "izmir" },
]

function ControlledCombobox(props: ComponentProps<typeof Combobox>) {
  const [value, setValue] = useState(props.value)

  return (
    <div className="w-96 max-w-[calc(100vw-2rem)]">
      <Field label="City">
        {(controlProps) => <Combobox {...props} {...controlProps} onValueChange={setValue} value={value} />}
      </Field>
    </div>
  )
}

const meta = {
  args: {
    id: "city",
    onValueChange: fn(),
    options,
    placeholder: "Search Turkish cities…",
  },
  component: Combobox,
  parameters: { layout: "centered" },
  render: (args) => <ControlledCombobox {...args} />,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Combobox",
} satisfies Meta<typeof Combobox>

export default meta
type Story = StoryObj<typeof meta>

export const TurkishCities: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", { name: "City" })
    await userEvent.click(input)
    await userEvent.type(input, "izm")
    await expect(canvas.getByRole("option", { name: "Izmir" })).toBeVisible()
    await expect(canvas.queryByRole("option", { name: "Ankara" })).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("option", { name: "Izmir" }))
    await expect(input).toHaveValue("Izmir")
  },
}
