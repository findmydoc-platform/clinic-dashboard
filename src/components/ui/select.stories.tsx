import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { Field } from "./field"
import { Select } from "./select"

const meta = {
  component: Select,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Select",
} satisfies Meta<typeof Select>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { defaultValue: "", onValueChange: fn() },
  render: (args) => (
    <Field label="Treatment category">
      {(controlProps) => (
        <Select {...args} {...controlProps}>
          <option value="">Select…</option>
          <option value="Dentistry">Dentistry</option>
          <option value="Aesthetics">Aesthetics</option>
        </Select>
      )}
    </Field>
  ),
  play: async ({ args, canvasElement }) => {
    const select = within(canvasElement).getByRole("combobox", { name: "Treatment category" })
    await userEvent.selectOptions(select, "Dentistry")
    await expect(select).toHaveValue("Dentistry")
    await expect(args.onValueChange).toHaveBeenCalledWith("Dentistry")
  },
}

export const Invalid: Story = {
  args: { defaultValue: "" },
  render: (args) => (
    <Field error="Choose a treatment category." label="Treatment category">
      {(controlProps) => (
        <Select {...args} {...controlProps}>
          <option value="">Select…</option>
          <option value="Dentistry">Dentistry</option>
        </Select>
      )}
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const select = within(canvasElement).getByRole("combobox", { name: "Treatment category" })
    await expect(select).toHaveAttribute("aria-invalid", "true")
  },
}

export const Disabled: Story = {
  args: { defaultValue: "Dentistry", disabled: true },
  render: (args) => (
    <Field label="Treatment category">
      {(controlProps) => (
        <Select {...args} {...controlProps}>
          <option value="Dentistry">Dentistry</option>
        </Select>
      )}
    </Field>
  ),
}
