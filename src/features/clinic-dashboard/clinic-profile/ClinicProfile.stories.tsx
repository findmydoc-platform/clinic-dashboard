import { useState, type ComponentProps } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import { ClinicProfile } from "./ClinicProfile"
import type { ClinicProfileCommands } from "./model/clinic-profile-commands"
import {
  ClinicProfileSourceCommandError,
  type ClinicProfileSourceCommands,
} from "./model/clinic-profile-source-commands"
import {
  clinicProfileFixture,
  clinicGallerySnapshotFixture,
  clinicTreatmentSnapshotFixture,
  createClinicProfileCommandsFixture,
  createClinicGalleryCommandsFixture,
  createClinicTreatmentCommandsFixture,
} from "./testing/clinic-profile.fixtures"
import {
  clinicProfileSourceDraftFixture,
  clinicProfileSourceFixture,
  createClinicProfileSourceCommandsFixture,
} from "./testing/clinic-profile-source.fixtures"
import { createDoctorProfileCommandsFixture, doctorDirectoryFixture } from "./testing/doctor-profile.fixtures"

function ClinicProfileStoryFixture({
  commands: _commands,
  galleryCommands: _galleryCommands,
  doctorCommands: _doctorCommands,
  sourceCommands: _sourceCommands,
  treatmentCommands: _treatmentCommands,
  ...props
}: ComponentProps<typeof ClinicProfile>) {
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())
  const [galleryCommands] = useState(() => createClinicGalleryCommandsFixture(props.gallerySnapshot))
  const [doctorCommands] = useState(() => createDoctorProfileCommandsFixture())
  const [sourceCommands] = useState<ClinicProfileSourceCommands>(() =>
    createClinicProfileSourceCommandsFixture(props.sourceSnapshot),
  )
  const [treatmentCommands] = useState(() => createClinicTreatmentCommandsFixture())

  return (
    <ClinicProfile
      {...props}
      commands={commands}
      galleryCommands={galleryCommands}
      doctorCommands={doctorCommands}
      sourceCommands={sourceCommands}
      treatmentCommands={treatmentCommands}
    />
  )
}

function ClinicProfileProvidedSourceCommandsStoryFixture({
  commands: _commands,
  galleryCommands: _galleryCommands,
  doctorCommands: _doctorCommands,
  sourceCommands,
  treatmentCommands: _treatmentCommands,
  ...props
}: ComponentProps<typeof ClinicProfile>) {
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())
  const [galleryCommands] = useState(() => createClinicGalleryCommandsFixture(props.gallerySnapshot))
  const [doctorCommands] = useState(() => createDoctorProfileCommandsFixture())
  const [treatmentCommands] = useState(() => createClinicTreatmentCommandsFixture())

  return (
    <ClinicProfile
      {...props}
      commands={commands}
      galleryCommands={galleryCommands}
      doctorCommands={doctorCommands}
      sourceCommands={sourceCommands}
      treatmentCommands={treatmentCommands}
    />
  )
}

const renderOwnedClinicProfileCommands = {
  createClinicProfileEntityId: (kind) => `${kind}-render-owned`,
  saveClinicProfile: async (profile) => profile,
} satisfies ClinicProfileCommands

const meta = {
  args: {
    commands: renderOwnedClinicProfileCommands,
    galleryCommands: createClinicGalleryCommandsFixture(),
    galleryManagement: "interactive",
    galleryStatus: "ready",
    gallerySnapshot: clinicGallerySnapshotFixture,
    doctorCommands: createDoctorProfileCommandsFixture(),
    doctorDirectory: doctorDirectoryFixture,
    doctorManagement: "interactive",
    initialProfile: clinicProfileFixture,
    onFocusHandled: fn(),
    onTreatmentMissing: fn(),
    profileManagement: "interactive",
    sourceProfileManagement: "interactive",
    sourceCommands: createClinicProfileSourceCommandsFixture(),
    sourceSnapshot: clinicProfileSourceFixture,
    treatmentCommands: createClinicTreatmentCommandsFixture(),
    treatmentManagement: "interactive",
    treatmentSnapshot: clinicTreatmentSnapshotFixture,
  },
  component: ClinicProfile,
  parameters: { layout: "fullscreen" },
  render: (args) => <ClinicProfileStoryFixture {...args} />,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Profile",
} satisfies Meta<typeof ClinicProfile>

export default meta
type Story = StoryObj<typeof meta>

export const PublishedReadView: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await expect(page.getByRole("button", { name: "Edit profile" })).toBeVisible()
    await expect(page.queryByRole("textbox", { name: "Clinic name" })).not.toBeInTheDocument()
  },
}

export const EditAndSaveDraft: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    const name = page.getByRole("textbox", { name: "Clinic name" })
    await userEvent.clear(name)
    await userEvent.type(name, "Medicana Istanbul International")
    await expect(page.getAllByRole("button", { name: "Save draft" })).toHaveLength(1)
    await userEvent.click(page.getByRole("button", { name: "Save draft" }))
    await expect(await page.findByText("Draft saved.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Review & publish" })).toBeEnabled()
  },
}

export const DraftAvailable: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await expect(page.getByText("Published profile is shown.")).toBeVisible()
    await expect(page.getByRole("button", { name: "Continue editing" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Review & publish" })).toBeEnabled()
  },
}

export const BasicInformationDestination: Story = {
  args: { focusTarget: "basic-information" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await waitFor(() => expect(page.getByRole("textbox", { name: "Clinic name" })).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const LanguagesDestination: Story = {
  args: { focusTarget: "languages" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await waitFor(() => expect(page.getByRole("combobox", { name: "Languages" })).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const AddressDestination: Story = {
  args: { focusTarget: "address" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await expect(await page.findByRole("dialog", { name: "Edit address" })).toBeVisible()
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const OpeningHoursDestination: Story = {
  args: { focusTarget: "opening-hours" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await expect(await page.findByRole("dialog", { name: "Edit opening hours" })).toBeVisible()
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const GalleryDestination: Story = {
  args: { focusTarget: "gallery" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await waitFor(() => expect(page.getByRole("heading", { name: "Manage gallery" })).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const DoctorsDestination: Story = {
  args: { focusTarget: "doctors" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    const doctors = page.getByRole("heading", { name: "Doctors" }).closest("section")
    if (!doctors) throw new Error("Doctors section is required.")
    await waitFor(() => expect(doctors).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const TreatmentsDestination: Story = {
  args: { focusTarget: "treatments" },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await expect(await page.findByRole("dialog", { name: "Add treatment" })).toBeVisible()
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const ReviewAndPublishDestination: Story = {
  args: { focusTarget: "review-publish", sourceSnapshot: clinicProfileSourceDraftFixture },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await expect(await page.findByRole("dialog", { name: "Review and publish" })).toBeVisible()
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

const destinationMutationCommands = {
  ...createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture),
  createDraft: fn(async () => {
    throw new Error("Destination navigation must not create a draft.")
  }),
  publishDraft: fn(async () => {
    throw new Error("Destination navigation must not publish a draft.")
  }),
  saveDraft: fn(async () => {
    throw new Error("Destination navigation must not save a draft.")
  }),
}

export const DestinationNavigationDoesNotPersistOrPublish: Story = {
  args: {
    focusTarget: "review-publish",
    sourceCommands: destinationMutationCommands,
    sourceSnapshot: clinicProfileSourceDraftFixture,
  },
  render: (args) => <ClinicProfileProvidedSourceCommandsStoryFixture {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await expect(await page.findByRole("dialog", { name: "Review and publish" })).toBeVisible()
    await expect(destinationMutationCommands.createDraft).not.toHaveBeenCalled()
    await expect(destinationMutationCommands.saveDraft).not.toHaveBeenCalled()
    await expect(destinationMutationCommands.publishDraft).not.toHaveBeenCalled()
  },
}

export const ConflictDestination: Story = {
  args: {
    focusTarget: "conflict",
    sourceSnapshot: {
      ...clinicProfileSourceDraftFixture,
      published: {
        ...clinicProfileSourceDraftFixture.published,
        revision: clinicProfileSourceDraftFixture.published.revision + 1,
      },
    },
  },
  play: async ({ args, canvasElement }) => {
    const page = within(canvasElement)
    await waitFor(() => expect(page.getByRole("alert")).toHaveFocus())
    await expect(args.onFocusHandled).toHaveBeenCalledOnce()
  },
}

export const PublishReview: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Review & publish" }))
    const dialog = page.getByRole("dialog", { name: "Review and publish" })
    await expect(within(dialog).getByText("4 changed fields across 3 sections")).toBeVisible()
    await expect(within(dialog).queryByText("Removed", { exact: true })).not.toBeInTheDocument()
    await expect(within(dialog).queryByText("Added", { exact: true })).not.toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Publish changes" })).toBeEnabled()
  },
}

export const PublishReviewReturnsFocus: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Review & publish" }))
    await expect(page.getByRole("dialog", { name: "Review and publish" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(page.queryByRole("dialog", { name: "Review and publish" })).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(page.getByRole("button", { name: "Review & publish" })).toHaveFocus())
  },
}

export const AddressEditing: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    const address = page.getByRole("heading", { name: "Address" }).closest("section")
    if (!address) throw new Error("Address section is required.")
    const trigger = within(address).getByRole("button", { name: "Edit" })
    await userEvent.click(trigger)
    await expect(page.getByRole("dialog", { name: "Edit address" })).toBeVisible()
    await userEvent.keyboard("{Escape}")
    await expect(page.queryByRole("dialog", { name: "Edit address" })).not.toBeInTheDocument()
    await expect(trigger).toHaveFocus()
  },
}

export const OpeningHoursEditing: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    const hours = page.getByRole("heading", { name: "Opening hours" }).closest("section")
    if (!hours) throw new Error("Opening-hours section is required.")
    await userEvent.click(within(hours).getByRole("button", { name: "Edit" }))
    await expect(page.getByRole("dialog", { name: "Edit opening hours" })).toBeVisible()
  },
}

export const UnsavedChangesGuard: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(page.getByRole("textbox", { name: "Clinic name" }), " updated")
    await expect(page.getAllByRole("button", { name: "Cancel editing" })).toHaveLength(1)
    const trigger = page.getByRole("button", { name: "Cancel editing" })
    await userEvent.click(trigger)
    await waitFor(() =>
      expect(documentPage.getByRole("alertdialog", { name: "Leave profile editing?" })).toBeVisible(),
    )
    await userEvent.keyboard("{Escape}")
    await waitFor(() =>
      expect(
        documentPage.queryByRole("alertdialog", { name: "Leave profile editing?" }),
      ).not.toBeInTheDocument(),
    )
    await waitFor(() => expect(trigger).toHaveFocus())
  },
}

export const MobileLeaveGuardActionsFollowFocusOrder: Story = {
  globals: { viewport: { value: "mobile390Tall" } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(page.getByRole("textbox", { name: "Clinic name" }), " updated")
    await userEvent.click(page.getByRole("button", { name: "Cancel editing" }))
    const dialog = await documentPage.findByRole("alertdialog", { name: "Leave profile editing?" })
    const keepEditing = within(dialog).getByRole("button", { name: "Keep editing" })
    const leaveWithoutSaving = within(dialog).getByRole("button", { name: "Leave without saving" })
    const saveAndLeave = within(dialog).getByRole("button", { name: "Save draft and leave" })

    expect(keepEditing.getBoundingClientRect().top).toBeLessThan(
      leaveWithoutSaving.getBoundingClientRect().top,
    )
    expect(leaveWithoutSaving.getBoundingClientRect().top).toBeLessThan(
      saveAndLeave.getBoundingClientRect().top,
    )
    keepEditing.focus()
    await userEvent.tab()
    await expect(leaveWithoutSaving).toHaveFocus()
    await userEvent.tab()
    await expect(saveAndLeave).toHaveFocus()
  },
}

function SaveFailureStoryFixture(props: ComponentProps<typeof ClinicProfile>) {
  const [sourceCommands] = useState<ClinicProfileSourceCommands>(() => {
    const persistedCommands = createClinicProfileSourceCommandsFixture()
    return {
      ...persistedCommands,
      saveDraft: async () => {
        throw new ClinicProfileSourceCommandError("rejected", "Save failed.")
      },
    }
  })

  return (
    <ClinicProfile
      {...props}
      commands={createClinicProfileCommandsFixture()}
      doctorCommands={createDoctorProfileCommandsFixture()}
      sourceCommands={sourceCommands}
    />
  )
}

export const SaveFailurePreservesLeaveGuard: Story = {
  render: (args) => <SaveFailureStoryFixture {...args} />,
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(page.getByRole("textbox", { name: "Clinic name" }), " updated")
    await userEvent.click(page.getByRole("button", { name: "Cancel editing" }))
    const dialog = await documentPage.findByRole("alertdialog", { name: "Leave profile editing?" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Save draft and leave" }))

    await waitFor(() =>
      expect(
        within(documentPage.getByRole("alertdialog", { name: "Leave profile editing?" })).getByRole("alert"),
      ).toHaveTextContent("The draft was created, but your changes could not be saved."),
    )
    const openDialog = documentPage.getByRole("alertdialog", { name: "Leave profile editing?" })
    await waitFor(() => expect(openDialog).toBeVisible())
    await expect(within(openDialog).getByRole("button", { name: "Save draft and leave" })).toBeEnabled()
  },
}

const invalidHoursDraftSnapshot = {
  ...clinicProfileSourceDraftFixture,
  draft: {
    ...clinicProfileSourceDraftFixture.draft!,
    openingHours: {
      ...clinicProfileSourceDraftFixture.draft!.openingHours!,
      monday: { closesAt: "08:00", isClosed: false, opensAt: "09:00" },
    },
  },
}

export const OpeningHoursValidationLinksInputs: Story = {
  args: { sourceSnapshot: invalidHoursDraftSnapshot },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Continue editing" }))
    await userEvent.click(page.getByRole("button", { name: "Review & publish" }))
    const hours = page.getByRole("heading", { name: "Opening hours" }).closest("section")
    if (!hours) throw new Error("Opening-hours section is required.")
    await userEvent.click(within(hours).getByRole("button", { name: "Edit" }))

    const opens = page.getByLabelText("Opens for Monday")
    const closes = page.getByLabelText("Closes for Monday")
    const error = page.getByText("Closing time must be after opening time.")
    await expect(opens).toHaveAttribute("aria-errormessage", error.id)
    await expect(closes).toHaveAttribute("aria-errormessage", error.id)
  },
}

export const DiscardDraftConfirmation: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Continue editing" }))
    await userEvent.click(page.getByRole("button", { name: "Discard draft" }))
    await waitFor(() =>
      expect(documentPage.getByRole("alertdialog", { name: "Discard saved draft?" })).toBeVisible(),
    )
  },
}

const saveConflictCommands = {
  ...createClinicProfileSourceCommandsFixture(),
  saveDraft: async () => {
    throw new ClinicProfileSourceCommandError("conflict", "Changed elsewhere.")
  },
} satisfies ClinicProfileSourceCommands

export const SaveConflict: Story = {
  render: (args) => (
    <ClinicProfile
      {...args}
      commands={createClinicProfileCommandsFixture()}
      doctorCommands={createDoctorProfileCommandsFixture()}
      sourceCommands={saveConflictCommands}
    />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    await userEvent.type(page.getByRole("textbox", { name: "Clinic name" }), " updated")
    await userEvent.click(page.getByRole("button", { name: "Save draft" }))
    await expect(page.getByText("Profile changed elsewhere")).toBeVisible()
    await expect(page.getByRole("button", { name: "Reload latest" })).toBeVisible()
  },
}

const publishFailureCommands = {
  ...createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture),
  publishDraft: async () => {
    throw new ClinicProfileSourceCommandError("rejected", "Publish failed.")
  },
} satisfies ClinicProfileSourceCommands

export const PublishFailurePreservesReview: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  render: (args) => (
    <ClinicProfile
      {...args}
      commands={createClinicProfileCommandsFixture()}
      doctorCommands={createDoctorProfileCommandsFixture()}
      sourceCommands={publishFailureCommands}
    />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Continue editing" }))
    await userEvent.click(page.getByRole("button", { name: "Review & publish" }))
    const dialog = page.getByRole("dialog", { name: "Review and publish" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Publish changes" }))
    await expect(
      within(dialog).getByText("The profile could not be published. The draft is preserved."),
    ).toBeVisible()
  },
}

const unresolvedPublishCommands = {
  ...createClinicProfileSourceCommandsFixture(clinicProfileSourceDraftFixture),
  loadSnapshot: async () => {
    throw new ClinicProfileSourceCommandError("unknown", "Snapshot unavailable.")
  },
  publishDraft: async () => {
    throw new ClinicProfileSourceCommandError("unknown", "Publish outcome unknown.")
  },
} satisfies ClinicProfileSourceCommands

export const PublishOutcomeUnresolved: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  render: (args) => (
    <ClinicProfile
      {...args}
      commands={createClinicProfileCommandsFixture()}
      doctorCommands={createDoctorProfileCommandsFixture()}
      sourceCommands={unresolvedPublishCommands}
    />
  ),
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Continue editing" }))
    await userEvent.click(page.getByRole("button", { name: "Review & publish" }))
    const dialog = page.getByRole("dialog", { name: "Review and publish" })
    await userEvent.click(within(dialog).getByRole("button", { name: "Publish changes" }))
    await expect(within(dialog).getByRole("button", { name: "Reload status" })).toBeEnabled()
    await expect(within(dialog).getByRole("button", { name: "Back to editing" })).toBeDisabled()
    await expect(within(dialog).getByRole("button", { name: "Publish changes" })).toBeDisabled()
  },
}

const cleanDraftSnapshot = {
  ...clinicProfileSourceFixture,
  draft: {
    ...clinicProfileSourceFixture.published,
    basePublishedRevision: clinicProfileSourceFixture.published.revision,
    revision: 1,
  },
}

export const CleanDraft: Story = {
  args: { sourceSnapshot: cleanDraftSnapshot },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Continue editing" }))
    await expect(page.getByRole("button", { name: "Review & publish" })).toBeDisabled()
  },
}

export const ProfileUnavailable: Story = {
  args: { sourceSnapshot: undefined },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByText("Profile unavailable")).toBeVisible()
  },
}
