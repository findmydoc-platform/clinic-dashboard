import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { clinicProfileFixture, clinicTreatmentSnapshotFixture } from "../../testing/clinic-profile.fixtures"
import {
  createDoctorProfileCommandsFixture,
  doctorDirectoryFixture,
} from "../../testing/doctor-profile.fixtures"
import {
  ClinicProfileScreen,
  type ClinicProfileScreenActions,
  type ClinicProfileScreenModel,
} from "./ClinicProfileScreen"

const actions = {
  onAddressEdit: fn(),
  onDescriptionChange: fn(),
  onDoctorsChange: fn(),
  onFocusHandled: fn(),
  onGalleryOpen: fn(),
  onNameChange: fn(),
  onOpeningHoursEdit: fn(),
  onProfileCancel: fn(),
  onProfileSave: fn(),
  onSpecialtyDialogOpen: fn(),
  onSpecialtyRemove: fn(),
  onTreatmentCreate: fn(),
  onTreatmentOpen: fn(),
  onTreatmentRetry: fn(),
} satisfies ClinicProfileScreenActions

const readOnlyModel = {
  doctorCommands: createDoctorProfileCommandsFixture(),
  doctorDirectory: doctorDirectoryFixture,
  doctorManagement: "hidden",
  isDirty: false,
  profile: clinicProfileFixture,
  profileManagement: "hidden",
  saveState: "idle",
  statusMessage: "",
  treatmentManagement: "hidden",
  treatmentSnapshot: clinicTreatmentSnapshotFixture,
  treatmentStatusMessage: "",
  treatmentsBusy: false,
} satisfies ClinicProfileScreenModel

const meta = {
  component: ClinicProfileScreen,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Screen",
} satisfies Meta<typeof ClinicProfileScreen>

export default meta
type Story = StoryObj<typeof meta>

export const ManagementUnavailable: Story = {
  args: {
    actions,
    model: readOnlyModel,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Add doctor" })).not.toBeInTheDocument()
  },
}

export const EditableWithUndo: Story = {
  args: {
    actions,
    model: {
      ...readOnlyModel,
      doctorManagement: "interactive",
      isDirty: true,
      profileManagement: "interactive",
      statusMessage: "Profile changes staged.",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Add doctor" })).toBeEnabled()
    const profileActions = canvas.getByRole("group", { name: "Profile page actions" })
    await expect(within(profileActions).getByRole("button", { name: "Save changes" })).toBeEnabled()
  },
}

export const DoctorsFocusRequest: Story = {
  args: {
    actions,
    model: {
      ...readOnlyModel,
      focusTarget: "doctors",
    },
  },
  play: async ({ args, canvasElement }) => {
    const doctors = within(canvasElement).getByRole("heading", { name: "Doctors" }).closest("section")
    if (!doctors) throw new Error("Doctor directory is required.")
    await waitFor(() => expect(doctors).toHaveFocus())
    await expect(args.actions.onFocusHandled).toHaveBeenCalledOnce()
  },
}
