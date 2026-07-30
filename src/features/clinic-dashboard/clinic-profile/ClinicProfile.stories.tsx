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
  clinicTreatmentCatalogueFixture,
  createClinicProfileCommandsFixture,
} from "./testing/clinic-profile.fixtures"
import {
  clinicProfileSourceDraftFixture,
  clinicProfileSourceFixture,
  createClinicProfileSourceCommandsFixture,
} from "./testing/clinic-profile-source.fixtures"
import { createDoctorProfileCommandsFixture, doctorDirectoryFixture } from "./testing/doctor-profile.fixtures"

function ClinicProfileStoryFixture({
  commands: _commands,
  doctorCommands: _doctorCommands,
  sourceCommands: _sourceCommands,
  ...props
}: ComponentProps<typeof ClinicProfile>) {
  const [commands] = useState<ClinicProfileCommands>(() => createClinicProfileCommandsFixture())
  const [doctorCommands] = useState(() => createDoctorProfileCommandsFixture())
  const [sourceCommands] = useState<ClinicProfileSourceCommands>(() =>
    createClinicProfileSourceCommandsFixture(props.sourceSnapshot),
  )

  return (
    <ClinicProfile
      {...props}
      commands={commands}
      doctorCommands={doctorCommands}
      sourceCommands={sourceCommands}
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
    doctorCommands: createDoctorProfileCommandsFixture(),
    doctorDirectory: doctorDirectoryFixture,
    doctorManagement: "interactive",
    initialProfile: clinicProfileFixture,
    onFocusHandled: fn(),
    onTreatmentMissing: fn(),
    profileManagement: "interactive",
    sourceCommands: createClinicProfileSourceCommandsFixture(),
    sourceSnapshot: clinicProfileSourceFixture,
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
  },
}

export const PublishReview: Story = {
  args: { sourceSnapshot: clinicProfileSourceDraftFixture },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Continue editing" }))
    await userEvent.click(page.getByRole("button", { name: "Review & publish" }))
    const dialog = page.getByRole("dialog", { name: "Review and publish" })
    await expect(within(dialog).getByText("4 changed fields across 3 sections")).toBeVisible()
    await expect(within(dialog).queryByText("Removed", { exact: true })).not.toBeInTheDocument()
    await expect(within(dialog).queryByText("Added", { exact: true })).not.toBeInTheDocument()
    await expect(within(dialog).getByRole("button", { name: "Publish changes" })).toBeEnabled()
  },
}

export const AddressEditing: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Edit profile" }))
    const address = page.getByRole("heading", { name: "Address" }).closest("section")
    if (!address) throw new Error("Address section is required.")
    await userEvent.click(within(address).getByRole("button", { name: "Edit" }))
    await expect(page.getByRole("dialog", { name: "Edit address" })).toBeVisible()
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
    await userEvent.click(page.getByRole("button", { name: "Cancel editing" }))
    await waitFor(() =>
      expect(documentPage.getByRole("alertdialog", { name: "Leave profile editing?" })).toBeVisible(),
    )
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
