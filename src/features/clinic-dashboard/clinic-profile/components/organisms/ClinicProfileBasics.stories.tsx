import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import { ClinicProfileBasics } from "./ClinicProfileBasics"

function ControlledClinicProfileBasics(props: ComponentProps<typeof ClinicProfileBasics>) {
  const [description, setDescription] = useState(props.description)
  const [name, setName] = useState(props.name)
  const [specialties, setSpecialties] = useState(props.specialties)

  return (
    <ClinicProfileBasics
      {...props}
      description={description}
      name={name}
      onDescriptionChange={(nextDescription) => {
        setDescription(nextDescription)
        props.onDescriptionChange(nextDescription)
      }}
      onNameChange={(nextName) => {
        setName(nextName)
        props.onNameChange(nextName)
      }}
      onSpecialtyRemove={(specialty) => {
        setSpecialties((current) => current.filter((item) => item !== specialty))
        props.onSpecialtyRemove(specialty)
      }}
      specialties={specialties}
    />
  )
}

const meta = {
  args: {
    description: clinicProfileFixture.description,
    isEditingDisabled: false,
    name: clinicProfileFixture.name,
    onDescriptionChange: fn(),
    onNameChange: fn(),
    onSpecialtyAdd: fn(),
    onSpecialtyRemove: fn(),
    showSpecialtyActions: true,
    specialties: clinicProfileFixture.specialties,
  },
  component: ClinicProfileBasics,
  render: (args) => <ControlledClinicProfileBasics {...args} />,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Basics",
} satisfies Meta<typeof ClinicProfileBasics>

export default meta
type Story = StoryObj<typeof meta>

export const Editable: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const name = canvas.getByRole("textbox", { name: "Clinic name" })
    await userEvent.clear(name)
    await userEvent.type(name, "Berlin International Clinic")
    await expect(args.onNameChange).toHaveBeenLastCalledWith("Berlin International Clinic")
  },
}

export const SpecialtyManagement: Story = {
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Remove Dentistry specialty" }))
    await expect(args.onSpecialtyRemove).toHaveBeenCalledWith("Dentistry")
    await expect(canvas.queryByText("Dentistry")).not.toBeInTheDocument()
    await userEvent.click(canvas.getByRole("button", { name: "Add" }))
    await expect(args.onSpecialtyAdd).toHaveBeenCalledOnce()
  },
}

export const ReadOnly: Story = {
  args: { isEditingDisabled: true, showSpecialtyActions: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: "Add" })).not.toBeInTheDocument()
  },
}
