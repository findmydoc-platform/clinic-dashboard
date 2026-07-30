import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileSourceFixture } from "../../testing/clinic-profile-source.fixtures"
import { ClinicProfileBasics } from "./ClinicProfileBasics"

function ControlledClinicProfileBasics(props: ComponentProps<typeof ClinicProfileBasics>) {
  const [name, setName] = useState(props.name)
  return (
    <ClinicProfileBasics
      {...props}
      name={name}
      onNameChange={(nextName) => {
        setName(nextName)
        props.onNameChange(nextName)
      }}
    />
  )
}

const meta = {
  args: {
    description: clinicProfileSourceFixture.published.descriptionText,
    errors: {},
    isEditing: false,
    name: clinicProfileSourceFixture.published.name,
    onDescriptionChange: fn(),
    onLanguagesChange: fn(),
    onNameChange: fn(),
    supportedLanguages: clinicProfileSourceFixture.published.supportedLanguages,
  },
  component: ClinicProfileBasics,
  render: (args) => <ControlledClinicProfileBasics {...args} />,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Basics",
} satisfies Meta<typeof ClinicProfileBasics>

export default meta
type Story = StoryObj<typeof meta>

export const PublishedReadView: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("textbox")).not.toBeInTheDocument()
    await expect(canvas.getByText(clinicProfileSourceFixture.published.name)).toBeVisible()
  },
}

export const EditMode: Story = {
  args: { isEditing: true },
  play: async ({ args, canvasElement }) => {
    const name = within(canvasElement).getByRole("textbox", { name: "Clinic name" })
    await userEvent.clear(name)
    await userEvent.type(name, "Istanbul International Clinic")
    await expect(args.onNameChange).toHaveBeenLastCalledWith("Istanbul International Clinic")
  },
}
