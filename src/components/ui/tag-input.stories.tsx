import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { Field } from "@/components/ui/field"
import { TagInput } from "@/components/ui/tag-input"

const languageOptions = [
  { label: "English", value: "english" },
  { label: "German", value: "german" },
  { label: "Spanish", value: "spanish" },
]

const meta = {
  args: {
    id: "languages",
    onValueChange: fn(),
    options: languageOptions,
    placeholder: "Select languages…",
    value: ["german", "english"],
  },
  component: TagInput,
  parameters: { layout: "centered" },
  tags: ["domain:shared", "layer:molecule", "status:stable"],
  title: "Shared/Molecules/Tag Input",
} satisfies Meta<typeof TagInput>

export default meta
type Story = StoryObj<typeof meta>

export const FixedOptions: Story = {
  render: function FixedOptionsStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div className="w-96 max-w-[calc(100vw-2rem)]">
        <Field isRequired label="Languages">
          {(controlProps) => <TagInput {...args} {...controlProps} onValueChange={setValue} value={value} />}
        </Field>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("combobox", { name: "Languages" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Remove German" })).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Remove German" }))
    await expect(canvas.queryByRole("button", { name: "Remove German" })).not.toBeInTheDocument()
  },
}

export const CustomValues: Story = {
  args: {
    allowCustomValues: true,
    id: "qualifications",
    maxValueLength: 120,
    maxValues: 30,
    options: [],
    placeholder: "Add a qualification…",
    value: ["MD"],
  },
  render: function CustomValuesStory(args) {
    const [value, setValue] = useState(args.value)
    return (
      <div className="w-96 max-w-[calc(100vw-2rem)]">
        <Field isRequired label="Qualifications">
          {(controlProps) => <TagInput {...args} {...controlProps} onValueChange={setValue} value={value} />}
        </Field>
      </div>
    )
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const input = canvas.getByRole("combobox", { name: "Qualifications" })
    await userEvent.click(input)
    await userEvent.paste(" MD , Board   certification\nmd ")
    await expect(canvas.getByRole("button", { name: "Remove Board certification" })).toBeVisible()
    await expect(canvas.getAllByRole("button", { name: "Remove MD" })).toHaveLength(1)
    await userEvent.type(input, "Fellowship,")
    await expect(canvas.getByRole("button", { name: "Remove Fellowship" })).toBeVisible()
    await userEvent.type(input, "Clinical lead")
    await userEvent.tab()
    await expect(canvas.getByRole("button", { name: "Remove Clinical lead" })).toBeVisible()
  },
}
