import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, within } from "storybook/test"
import { clinicProfileFixture, clinicTreatmentSnapshotFixture } from "../../testing/clinic-profile.fixtures"
import { clinicProfileSourceFixture } from "../../testing/clinic-profile-source.fixtures"
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
  onLanguagesChange: fn(),
  onLegacyCancel: fn(),
  onLegacySave: fn(),
  onNameChange: fn(),
  onOpeningHoursEdit: fn(),
  onProfileCancel: fn(),
  onProfileEdit: fn(),
  onProfileReview: fn(),
  onProfileSave: fn(),
  onSourceDiscard: fn(),
  onTreatmentCreate: fn(),
  onTreatmentOpen: fn(),
  onTreatmentRetry: fn(),
} satisfies ClinicProfileScreenActions

const publishedModel = {
  doctorCommands: createDoctorProfileCommandsFixture(),
  doctorDirectory: doctorDirectoryFixture,
  doctorManagement: "interactive",
  galleryStatus: "ready",
  legacyIsDirty: false,
  legacyProfile: clinicProfileFixture,
  legacySaveState: "idle",
  legacyStatusMessage: "",
  profileManagement: "interactive",
  sourceProfileManagement: "interactive",
  source: {
    displayFields: clinicProfileSourceFixture.published,
    hasSavedChanges: false,
    hasSavedDraft: false,
    isDirty: false,
    mode: "view",
    operation: "idle",
    snapshot: clinicProfileSourceFixture,
    statusMessage: "",
    validationErrors: {},
  },
  treatmentManagement: "interactive",
  treatmentSnapshot: clinicTreatmentSnapshotFixture,
  treatmentStatusMessage: "",
  treatmentsBusy: false,
} satisfies ClinicProfileScreenModel

const meta = {
  args: { actions, model: publishedModel },
  component: ClinicProfileScreen,
  parameters: { layout: "fullscreen" },
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile Screen",
} satisfies Meta<typeof ClinicProfileScreen>

export default meta
type Story = StoryObj<typeof meta>

export const PublishedProfile: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Edit profile" })).toBeVisible()
    await expect(canvas.queryByRole("textbox", { name: "Clinic name" })).not.toBeInTheDocument()
  },
}

export const DraftAvailable: Story = {
  args: {
    model: {
      ...publishedModel,
      source: { ...publishedModel.source, hasSavedChanges: true, hasSavedDraft: true },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Continue editing" })).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Review & publish" })).toBeEnabled()
  },
}

export const EditingDirty: Story = {
  args: {
    model: {
      ...publishedModel,
      source: {
        ...publishedModel.source,
        hasSavedChanges: false,
        isDirty: true,
        mode: "edit",
      },
    },
  },
}

export const Conflict: Story = {
  args: {
    model: {
      ...publishedModel,
      source: {
        ...publishedModel.source,
        isDirty: true,
        mode: "conflict",
        statusMessage: "The published profile or draft changed elsewhere.",
      },
    },
  },
}

export const ProfileUnavailable: Story = {
  args: {
    model: {
      ...publishedModel,
      source: {
        hasSavedChanges: false,
        hasSavedDraft: false,
        isDirty: false,
        mode: "view",
        operation: "idle",
        statusMessage: "",
        validationErrors: {},
      },
    },
  },
}

export const SourceProfileReadOnlyKeepsLegacyControls: Story = {
  args: {
    model: {
      ...publishedModel,
      sourceProfileManagement: "read-only",
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.queryByRole("button", { name: "Edit profile" })).not.toBeInTheDocument()
    await expect(canvas.getByRole("button", { name: "New treatment" })).toBeVisible()
  },
}
