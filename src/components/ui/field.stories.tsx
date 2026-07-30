import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, within } from "storybook/test"
import { Field } from "./field"
import { Input } from "./input"

const meta = {
  component: Field,
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Field",
} satisfies Meta<typeof Field>

export default meta
type Story = StoryObj<typeof meta>

export const WithDescription: Story = {
  args: {
    children: (controlProps) => <Input {...controlProps} />,
    description: "Use the name shown on the public profile.",
    isRequired: true,
    label: "Clinic name",
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Clinic name" })
    await expect(input).toBeRequired()
    await expect(input).toHaveAccessibleDescription("Use the name shown on the public profile.")
  },
}

export const WithDescriptionBeforeControl: Story = {
  args: {
    children: (controlProps) => <Input {...controlProps} />,
    description: "Choose every relevant option.",
    descriptionPlacement: "before-control",
    label: "Languages",
  },
  play: async ({ canvasElement }) => {
    const input = within(canvasElement).getByRole("textbox", { name: "Languages" })
    await expect(input).toHaveAccessibleDescription("Choose every relevant option.")
  },
}

export const WithError: Story = {
  args: {
    children: (controlProps) => <Input {...controlProps} />,
    error: "Enter a clinic name.",
    label: "Clinic name",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("textbox", { name: "Clinic name" })
    await expect(input).toHaveAttribute("aria-invalid", "true")
    await expect(input).toHaveAccessibleDescription("Enter a clinic name.")
    await expect(canvas.getByRole("alert")).toHaveTextContent("Enter a clinic name.")
  },
}
