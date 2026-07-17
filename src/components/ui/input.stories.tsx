import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { Field } from "./field"
import { Input } from "./input"

const meta = {
  component: Input,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Input",
} satisfies Meta<typeof Input>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { onValueChange: fn(), placeholder: "Clinic name" },
  render: (args) => (
    <Field description="Use the public clinic name." label="Clinic name">
      {(controlProps) => <Input {...args} {...controlProps} />}
    </Field>
  ),
  play: async ({ args, canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Clinic name" })
    await userEvent.tab()
    await expect(input).toHaveFocus()
    await userEvent.type(input, "City Clinic")
    await expect(input).toHaveValue("City Clinic")
    await expect(args.onValueChange).toHaveBeenLastCalledWith("City Clinic")
  },
}

export const Invalid: Story = {
  args: { defaultValue: "C" },
  render: (args) => (
    <Field error="Enter at least two characters." label="Clinic name">
      {(controlProps) => <Input {...args} {...controlProps} />}
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", { name: "Clinic name" })
    const error = canvas.getByRole("alert")
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription(error.textContent ?? "")
  },
}

export const Disabled: Story = {
  args: { defaultValue: "City Clinic", disabled: true },
  render: (args) => (
    <Field label="Clinic name">{(controlProps) => <Input {...args} {...controlProps} />}</Field>
  ),
}
