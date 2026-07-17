import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { Field } from "./field"
import { Textarea } from "./textarea"

const meta = {
  component: Textarea,
  tags: ["domain:shared", "layer:atom", "status:stable"],
  title: "Shared/Atoms/Textarea",
} satisfies Meta<typeof Textarea>

export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {
  args: { onValueChange: fn(), placeholder: "Describe the treatment…" },
  render: (args) => (
    <Field label="Description">{(controlProps) => <Textarea {...args} {...controlProps} />}</Field>
  ),
  play: async ({ args, canvasElement }) => {
    const textarea = within(canvasElement).getByRole("textbox", { name: "Description" })
    await userEvent.type(textarea, "A focused treatment description.")
    await expect(textarea).toHaveValue("A focused treatment description.")
    await expect(args.onValueChange).toHaveBeenLastCalledWith("A focused treatment description.")
  },
}

export const Invalid: Story = {
  args: { defaultValue: "Too short" },
  render: (args) => (
    <Field error="Enter at least 20 characters." label="Description">
      {(controlProps) => <Textarea {...args} {...controlProps} />}
    </Field>
  ),
  play: async ({ canvasElement }) => {
    const textarea = within(canvasElement).getByRole("textbox", { name: "Description" })
    await expect(textarea).toHaveAttribute("aria-invalid", "true")
  },
}

export const ReadOnly: Story = {
  args: { readOnly: true, value: "This value remains readable and copyable." },
  render: (args) => (
    <Field label="Description">{(controlProps) => <Textarea {...args} {...controlProps} />}</Field>
  ),
}
