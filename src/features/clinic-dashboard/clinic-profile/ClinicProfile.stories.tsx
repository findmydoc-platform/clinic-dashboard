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

function createTrackedClinicProfileCommands() {
  const fixtureCommands = createClinicProfileCommandsFixture()
  const createClinicProfileEntityId = fn(fixtureCommands.createClinicProfileEntityId)

  return {
    commands: { ...fixtureCommands, createClinicProfileEntityId } satisfies ClinicProfileCommands,
    createClinicProfileEntityId,
  }
}

function ClinicProfileStoryFixture({ commands: _commands, ...props }: ComponentProps<typeof ClinicProfile>) {
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())

  return <ClinicProfile {...props} commands={commands} />
}

const renderOwnedClinicProfileCommands = {
  createClinicProfileEntityId: (kind) => `${kind}-render-owned`,
  saveClinicProfile: async (profile) => profile,
} satisfies ClinicProfileCommands

const meta = {
  args: {
    commands: renderOwnedClinicProfileCommands,
    initialProfile: clinicProfileFixture,
    onFocusHandled: fn(),
    onTreatmentMissing: fn(),
    profileManagement: "interactive",
    teamManagement: "interactive",
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
  ...props
}: ComponentProps<typeof ClinicProfile>) {
  const [managementAccess, setManagementAccess] =
    useState<ComponentProps<typeof ClinicProfile>["profileManagement"]>("interactive")
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())

  return (
    <>
      <Button
        onClick={() =>
          setManagementAccess((current) => (current === "interactive" ? "read-only" : "interactive"))
        }
      >
        {managementAccess === "interactive" ? "Disable profile management" : "Enable profile management"}
      </Button>
      <ClinicProfile
        {...props}
        commands={commands}
        profileManagement={managementAccess}
        teamManagement={managementAccess}
      />
    </>
  )
}

export const AddressRollbackAndKeyboardFocus: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const addressCard = page.getByRole("heading", { name: "Address" }).closest("section")
    await expect(addressCard).not.toBeNull()
    if (!addressCard) return

    const address = within(addressCard)
    const editAddress = address.getByRole("button", { name: "Edit" })
    await userEvent.click(editAddress)

    const addressDialog = page.getByRole("dialog", { name: "Edit address" })
    const street = within(addressDialog).getByRole("textbox", { name: "Street" })
    await userEvent.clear(street)
    await userEvent.type(street, "Alexanderplatz 1")
    await userEvent.click(within(addressDialog).getByRole("button", { name: "Apply address" }))
    await expect(address.getByText("Alexanderplatz 1")).toBeInTheDocument()
    await expect(page.getByText("Address changes staged.")).toBeInTheDocument()

    const profileActions = within(page.getByRole("group", { name: "Profile page actions" }))
    await userEvent.click(profileActions.getByRole("button", { name: "Cancel" }))
    await expect(address.getByText("Kurfürstendamm 212")).toBeInTheDocument()
    await expect(page.getByText("Profile changes discarded.")).toBeInTheDocument()

    await userEvent.click(editAddress)
    await expect(page.getByRole("dialog", { name: "Edit address" })).toBeInTheDocument()
    await userEvent.keyboard("{Escape}")
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Edit address" })).not.toBeInTheDocument())
    await expect(editAddress).toHaveFocus()
  },
}

export const CapabilityChangeClosesUnavailableDialog: Story = {
  render: (args) => <CapabilityToggleClinicProfile {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const addressCard = page.getByRole("heading", { name: "Address" }).closest("section")
    await expect(addressCard).not.toBeNull()
    if (!addressCard) return

    await userEvent.click(within(addressCard).getByRole("button", { name: "Edit" }))
    await expect(page.getByRole("dialog", { name: "Edit address" })).toBeInTheDocument()

    await userEvent.click(page.getByRole("button", { name: "Disable profile management" }))
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Edit address" })).not.toBeInTheDocument())
    await expect(page.getByText("Clinics / View profile")).toBeInTheDocument()

    await userEvent.click(page.getByRole("button", { name: "Enable profile management" }))
    await expect(page.queryByRole("dialog", { name: "Edit address" })).not.toBeInTheDocument()
    await expect(page.getByText("Clinics / Edit profile")).toBeInTheDocument()
  },
}

export const CapabilityWithdrawalProjectsSavedProfile: Story = {
  render: (args) => <CapabilityToggleClinicProfile {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const clinicName = page.getByRole("textbox", { name: "Clinic name" })

    await userEvent.clear(clinicName)
    await userEvent.type(clinicName, "Hidden draft clinic")
    await userEvent.click(page.getByRole("button", { name: "Remove Laser teeth whitening" }))
    await expect(page.getByRole("button", { name: "Undo removal" })).toBeVisible()

    await userEvent.click(page.getByRole("button", { name: "Disable profile management" }))

    await expect(page.getByText("Clinics / View profile")).toBeInTheDocument()
    await expect(clinicName).toHaveValue(clinicProfileFixture.name)
    await expect(clinicName).toBeDisabled()
    await expect(page.queryByText("Hidden draft clinic")).not.toBeInTheDocument()
    await expect(page.queryByRole("button", { name: "Undo removal" })).not.toBeInTheDocument()
    await expect(page.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    await expect(page.queryByRole("button", { name: "Add team member" })).not.toBeInTheDocument()
    await expect(page.queryByRole("button", { name: "New treatment" })).not.toBeInTheDocument()
    await expect(page.getByText("Laser teeth whitening")).toBeVisible()

    await userEvent.click(page.getByRole("button", { name: "View Laser teeth whitening" }))
    const treatmentDialog = page.getByRole("dialog", { name: "Treatment details" })
    await expect(within(treatmentDialog).getByRole("textbox", { name: "Treatment" })).toHaveValue(
      "Laser teeth whitening",
    )
    await expect(within(treatmentDialog).getByRole("textbox", { name: "Price" })).toHaveAttribute("readonly")
    await expect(within(treatmentDialog).queryByRole("button", { name: /Save/ })).not.toBeInTheDocument()
    await userEvent.click(within(treatmentDialog).getByRole("button", { name: "Done" }))

    const member = clinicProfileFixture.team[0]
    if (!member) throw new Error("Team fixture requires one member.")
    await userEvent.click(page.getByRole("button", { name: `View ${member.name}` }))
    const teamDialog = page.getByRole("dialog", { name: "Team member details" })
    await expect(within(teamDialog).getByRole("textbox", { name: "First name" })).toBeDisabled()
    await expect(
      within(teamDialog).queryByRole("button", { name: /Save team member/ }),
    ).not.toBeInTheDocument()
  },
}

export const GalleryCoverSelection: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const gallery = page.getByRole("region", { name: "Clinic image gallery" })
    await userEvent.click(within(gallery).getByRole("button", { name: /more images/ }))

    const dialog = page.getByRole("dialog", { name: "Edit clinic images" })
    await userEvent.click(within(dialog).getAllByRole("button", { name: "Set cover" })[0]!)
    await userEvent.click(within(dialog).getByRole("button", { name: "Done" }))

    await expect(page.getByText("Gallery cover staged.")).toBeInTheDocument()
    await expect(within(gallery).getAllByRole("img")[0]).toHaveAccessibleName("Berlin Health Clinic exterior")
  },
}

export const ReadOnlyGalleryBrowsing: Story = {
  args: {
    profileManagement: "read-only",
    teamManagement: "read-only",
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const gallery = page.getByRole("region", { name: "Clinic image gallery" })
    await userEvent.click(within(gallery).getByRole("button", { name: /more images/ }))

    const dialog = page.getByRole("dialog", { name: "Clinic image gallery" })
    await expect(
      within(dialog).getByText("View the images currently shown on the public clinic profile."),
    ).toBeInTheDocument()
    await expect(within(dialog).getByText("Cover image")).toBeInTheDocument()
    await expect(within(dialog).queryByRole("button", { name: "Set cover" })).not.toBeInTheDocument()
    await userEvent.click(within(dialog).getByRole("button", { name: "Close gallery" }))
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Clinic image gallery" })).not.toBeInTheDocument(),
    )
  },
}

export const TeamMemberLifecycle: Story = {
  play: async ({ args, canvasElement, mount }) => {
    const { commands, createClinicProfileEntityId } = createTrackedClinicProfileCommands()
    await mount(<ClinicProfile {...args} commands={commands} />)
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Add team member" }))

    const createDialog = page.getByRole("dialog", { name: "Add team member" })
    await userEvent.type(within(createDialog).getByRole("textbox", { name: "First name" }), "Lea")
    await userEvent.type(within(createDialog).getByRole("textbox", { name: "Last name" }), "Fischer")
    await userEvent.selectOptions(
      within(createDialog).getByRole("combobox", { name: "Specialty / role" }),
      "Patient coordinator",
    )
    await userEvent.type(
      within(createDialog).getByRole("textbox", { name: "Short biography" }),
      "Coordinates international patient journeys.",
    )
    await userEvent.click(within(createDialog).getByRole("button", { name: "Add team member" }))
    await expect(page.getByText("Lea Fischer")).toBeInTheDocument()
    await expect(createClinicProfileEntityId).toHaveBeenCalledTimes(1)
    await expect(createClinicProfileEntityId).toHaveBeenCalledWith("team")

    await userEvent.click(page.getByRole("button", { name: "Add team member" }))
    const secondCreateDialog = page.getByRole("dialog", { name: "Add team member" })
    await userEvent.type(within(secondCreateDialog).getByRole("textbox", { name: "First name" }), "Mara")
    await userEvent.type(within(secondCreateDialog).getByRole("textbox", { name: "Last name" }), "Klein")
    await userEvent.selectOptions(
      within(secondCreateDialog).getByRole("combobox", { name: "Specialty / role" }),
      "Clinic management",
    )
    await userEvent.type(
      within(secondCreateDialog).getByRole("textbox", { name: "Short biography" }),
      "Leads clinic operations and patient services.",
    )
    await userEvent.click(within(secondCreateDialog).getByRole("button", { name: "Add team member" }))
    await expect(page.getByText("Mara Klein")).toBeInTheDocument()
    await expect(createClinicProfileEntityId).toHaveBeenCalledTimes(2)
    await expect(createClinicProfileEntityId.mock.results.map(({ value }) => value)).toEqual([
      "team-fixture-1",
      "team-fixture-2",
    ])

    await userEvent.click(page.getByRole("button", { name: "Edit Lea Fischer" }))
    const editDialog = page.getByRole("dialog", { name: "Edit team member" })
    const firstName = within(editDialog).getByRole("textbox", { name: "First name" })
    await userEvent.clear(firstName)
    await userEvent.type(firstName, "Lena")
    await userEvent.click(within(editDialog).getByRole("button", { name: "Save team member" }))
    await expect(page.getByText("Lena Fischer")).toBeInTheDocument()
    await expect(page.getByText("Mara Klein")).toBeInTheDocument()
    await expect(createClinicProfileEntityId).toHaveBeenCalledTimes(2)

    await userEvent.click(page.getByRole("button", { name: "Remove Lena Fischer" }))
    await expect(page.queryByText("Lena Fischer")).not.toBeInTheDocument()
    await userEvent.click(page.getByRole("button", { name: "Undo removal" }))
    await expect(page.getByText("Lena Fischer")).toBeInTheDocument()
    await expect(page.getByText("Lena Fischer restored.")).toBeInTheDocument()
  },
}

export const TreatmentRelationshipLifecycle: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const createTreatment = page.getByRole("button", { name: "New treatment" })
    await userEvent.click(createTreatment)

    const dialog = page.getByRole("dialog", { name: "Add treatment" })
    await userEvent.selectOptions(
      within(dialog).getByRole("combobox", { name: "Treatment" }),
      "master-hair-transplant",
    )
    await userEvent.type(within(dialog).getByRole("textbox", { name: "Price" }), "€3,900")
    await userEvent.click(within(dialog).getByRole("button", { name: "Add treatment" }))

    await waitFor(() => expect(createTreatment).toHaveFocus())
    await expect(page.getByText("Hair transplant")).toBeInTheDocument()
    await expect(page.getByText("Treatment assignment staged.")).toBeInTheDocument()

    const editTreatment = page.getByRole("button", { name: "Edit Hair transplant" })
    await userEvent.click(editTreatment)
    const editDialog = page.getByRole("dialog", { name: "Edit clinic price" })
    await expect(within(editDialog).getByRole("textbox", { name: "Treatment" })).toHaveAttribute("readonly")
    await expect(within(editDialog).queryByRole("combobox")).not.toBeInTheDocument()
    const price = within(editDialog).getByRole("textbox", { name: "Price" })
    await userEvent.clear(price)
    await userEvent.type(price, "€4,100")
    await userEvent.click(within(editDialog).getByRole("button", { name: "Save price" }))
    await waitFor(() => expect(editTreatment).toHaveFocus())
    await expect(page.getByText("€4,100")).toBeInTheDocument()
    await expect(page.getByText("Clinic price changes staged.")).toBeInTheDocument()

    await userEvent.click(page.getByRole("button", { name: "Remove Hair transplant" }))
    await expect(page.queryByText("Hair transplant")).not.toBeInTheDocument()
    await userEvent.click(page.getByRole("button", { name: "Undo removal" }))
    await expect(page.getByText("Hair transplant")).toBeInTheDocument()
    await expect(page.getByText("Hair transplant restored.")).toBeInTheDocument()
  },
}

export const MissingTreatmentRequestsSupport: Story = {
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "New treatment" }))
    const dialog = page.getByRole("dialog", { name: "Add treatment" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Treatment missing?" }))

    await expect(args.onTreatmentMissing).toHaveBeenCalledOnce()
    await waitFor(() => expect(page.queryByRole("dialog", { name: "Add treatment" })).not.toBeInTheDocument())
  },
}

export const SaveProfileRevision: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const clinicName = page.getByRole("textbox", { name: "Clinic name" })
    await userEvent.clear(clinicName)
    await userEvent.type(clinicName, "Berlin Health Clinic International")

    const profileActions = within(page.getByRole("group", { name: "Profile page actions" }))
    const save = profileActions.getByRole("button", { name: "Save changes" })
    await expect(save).toBeEnabled()
    await userEvent.click(save)

    await waitFor(() => expect(page.getByText("Profile saved as revision 2.")).toBeInTheDocument())
    await expect(save).toBeDisabled()
  },
}
