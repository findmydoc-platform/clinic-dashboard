import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { clinicProfileFixture } from "../../testing/clinic-profile.fixtures"
import {
  ClinicProfileScreen,
  type ClinicProfileScreenActions,
  type ClinicProfileScreenModel,
} from "./ClinicProfileScreen"

const actions = {
  onAddressEdit: fn(),
  onDescriptionChange: fn(),
  onFocusHandled: fn(),
  onGalleryOpen: fn(),
  onNameChange: fn(),
  onOpeningHoursEdit: fn(),
  onProfileCancel: fn(),
  onProfileSave: fn(),
  onRemovalUndo: fn(),
  onSpecialtyDialogOpen: fn(),
  onSpecialtyRemove: fn(),
  onTeamMemberCreate: fn(),
  onTeamMemberOpen: fn(),
  onTeamMemberRemove: fn(),
  onTreatmentCreate: fn(),
  onTreatmentMove: fn(),
  onTreatmentOpen: fn(),
  onTreatmentRemove: fn(),
} satisfies ClinicProfileScreenActions

const readOnlyModel = {
  isDirty: false,
  profile: clinicProfileFixture,
  profileManagement: "hidden",
  saveState: "idle",
  statusMessage: "",
  teamManagement: "hidden",
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

    await expect(canvas.getByRole("heading", { level: 1, name: "Clinic profile" })).toBeInTheDocument()
    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: "Save changes" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "Add team member" })).not.toBeInTheDocument()
  },
}

export const EditableWithUndo: Story = {
  args: {
    actions,
    model: {
      ...readOnlyModel,
      isDirty: true,
      profileManagement: "interactive",
      statusMessage: "Treatment removed.",
      teamManagement: "interactive",
      undoKind: "treatment",
      undoMessage: "FUE hair transplant removed. Undo restores this item.",
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    const profileActions = within(canvas.getByRole("group", { name: "Profile page actions" }))

    await expect(profileActions.getByRole("button", { name: "Save changes" })).toBeEnabled()
    await expect(canvas.getByRole("button", { name: "Add team member" })).toBeEnabled()
    await userEvent.click(canvas.getByRole("button", { name: "Undo removal" }))
    await expect(args.actions.onRemovalUndo).toHaveBeenCalledOnce()
  },
}

export const ReadOnlyManagementPreview: Story = {
  args: {
    actions,
    model: {
      ...readOnlyModel,
      profileManagement: "read-only",
      teamManagement: "read-only",
    },
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("textbox", { name: "Clinic name" })).toBeDisabled()
    await expect(canvas.queryByRole("button", { name: "Add team member" })).not.toBeInTheDocument()
    await expect(canvas.queryByRole("button", { name: "New treatment" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "View Dr Markus Weber" })).toBeEnabled()
    await expect(canvas.getByRole("button", { name: /View Laser teeth whitening/ })).toBeEnabled()
    const openGallery = canvas.getByRole("button", { name: /more images/ })
    await expect(openGallery).toBeEnabled()
    await userEvent.click(openGallery)
    await expect(args.actions.onGalleryOpen).toHaveBeenCalledOnce()
    await expect(canvas.queryByRole("group", { name: "Profile page actions" })).not.toBeInTheDocument()
  },
}

export const GalleryFocusRequest: Story = {
  args: {
    actions,
    model: {
      ...readOnlyModel,
      focusTarget: "gallery",
    },
  },
  play: async ({ args, canvasElement }) => {
    const gallery = within(canvasElement).getByRole("region", { name: "Clinic image gallery" })
    await waitFor(() => expect(gallery).toHaveFocus())
    await expect(args.actions.onFocusHandled).toHaveBeenCalledOnce()
  },
}
