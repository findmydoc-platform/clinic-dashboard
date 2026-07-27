import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { ClinicProfile } from "./ClinicProfile"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import {
  clinicProfileFixture,
  clinicTreatmentCatalogueFixture,
  createClinicProfileCommandsFixture,
} from "./testing/clinic-profile.fixtures"
import { createDoctorProfileCommandsFixture, doctorDirectoryFixture } from "./testing/doctor-profile.fixtures"

function ClinicProfileStoryFixture({
  commands: _commands,
  doctorCommands: _doctorCommands,
  ...props
}: ComponentProps<typeof ClinicProfile>) {
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())
  const [doctorCommands] = useState(() => createDoctorProfileCommandsFixture())

  return <ClinicProfile {...props} commands={commands} doctorCommands={doctorCommands} />
}

const renderOwnedClinicProfileCommands = {
  createClinicProfileEntityId: (kind) => `${kind}-render-owned`,
  saveClinicProfile: async (profile) => profile,
} satisfies ClinicProfileCommands

const meta = {
  args: {
    commands: renderOwnedClinicProfileCommands,
    doctorCommands: createDoctorProfileCommandsFixture(),
    doctorDirectory: doctorDirectoryFixture,
    doctorManagement: "interactive",
    initialProfile: clinicProfileFixture,
    onFocusHandled: fn(),
    onTreatmentMissing: fn(),
    profileManagement: "interactive",
    treatmentCatalogue: clinicTreatmentCatalogueFixture,
  },
  component: ClinicProfile,
  parameters: { layout: "fullscreen" },
  render: (args) => <ClinicProfileStoryFixture {...args} />,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta
type Story = StoryObj<typeof meta>

function CapabilityToggleClinicProfile({
  commands: _commands,
  doctorCommands: _doctorCommands,
  ...props
}: ComponentProps<typeof ClinicProfile>) {
  const [managementAccess, setManagementAccess] =
    useState<ComponentProps<typeof ClinicProfile>["profileManagement"]>("interactive")
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())
  const [doctorCommands] = useState(() => createDoctorProfileCommandsFixture())

  return (
    <>
      <Button
        onClick={() =>
          setManagementAccess((current) => (current === "interactive" ? "read-only" : "interactive"))
        }
      >
        {managementAccess === "interactive" ? "Disable management" : "Enable management"}
      </Button>
      <ClinicProfile
        {...props}
        commands={commands}
        doctorCommands={doctorCommands}
        doctorManagement={managementAccess}
        profileManagement={managementAccess}
      />
    </>
  )
}

export const AddressRollbackAndKeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const addressCard = page.getByRole("heading", { name: "Address" }).closest("section")
    if (!addressCard) throw new Error("Address card is required.")

    const address = within(addressCard)
    const editAddress = address.getByRole("button", { name: "Edit" })
    await userEvent.click(editAddress)

    const addressDialog = page.getByRole("dialog", { name: "Edit address" })
    const street = within(addressDialog).getByRole("textbox", { name: "Street" })
    await userEvent.clear(street)
    await userEvent.type(street, "Alexanderplatz 1")
    await userEvent.click(within(addressDialog).getByRole("button", { name: "Apply address" }))
    await expect(address.getByText("Alexanderplatz 1")).toBeInTheDocument()

    const profileActions = within(page.getByRole("group", { name: "Profile page actions" }))
    await userEvent.click(profileActions.getByRole("button", { name: "Cancel" }))
    await expect(address.getByText("Kurfürstendamm 212")).toBeInTheDocument()

    await userEvent.click(editAddress)
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Edit address" })).not.toBeInTheDocument())
    await expect(editAddress).toHaveFocus()
  },
}

export const DoctorEditorOpens: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Edit Sarah Schmidt" }))
    const dialog = page.getByRole("dialog", { name: "Edit doctor" })
    await expect(within(dialog).getByRole("textbox", { name: "First name" })).toHaveValue("Sarah")
    await expect(within(dialog).getByRole("textbox", { name: "Biography" })).toHaveValue(
      doctorDirectoryFixture.doctors[0].biography,
    )
  },
}

export const CapabilityChangeClosesActions: Story = {
  render: (args) => <CapabilityToggleClinicProfile {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await expect(page.getByRole("button", { name: "Add doctor" })).toBeEnabled()
    await userEvent.click(page.getByRole("button", { name: "Disable management" }))
    await expect(page.queryByRole("button", { name: "Add doctor" })).not.toBeInTheDocument()
    await expect(page.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
  },
}

export const TreatmentRelationshipLifecycle: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "New treatment" }))
    const dialog = page.getByRole("dialog", { name: "Add treatment" })
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Treatment" }),
      "master-hair-transplant",
    )
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Price" }), "€2,400")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add treatment" }))
    await expect(page.getByText("Hair transplant")).toBeInTheDocument()
  },
}
