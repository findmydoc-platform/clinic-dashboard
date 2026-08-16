import { useMemo } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, userEvent, waitFor, within } from "storybook/test"
import { Button } from "@/components/ui/button"
import { useClinicGalleryController } from "../../hooks/useClinicGalleryController"
import type { ClinicGallerySnapshot } from "../../model/clinic-gallery"
import { ClinicGalleryCommandError, type ClinicGalleryCommands } from "../../model/clinic-gallery-commands"
import {
  clinicGallerySnapshotFixture,
  createClinicGalleryCommandsFixture,
} from "../../testing/clinic-profile.fixtures"
import { ClinicGalleryManagerDialog } from "./ClinicGalleryManagerDialog"

type GalleryStoryProps = Readonly<{
  initialSnapshot?: ClinicGallerySnapshot
  management?: "interactive" | "read-only"
  scenario?: "default" | "discard-failure" | "loading" | "retry-upload" | "save-conflict" | "unavailable"
}>

const imageBytes = Uint8Array.from(
  atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII="),
  (character) => character.charCodeAt(0),
)

function imageFile(name: string) {
  return new File([imageBytes], name, { type: "image/png" })
}

function GalleryStory({
  initialSnapshot = clinicGallerySnapshotFixture,
  management = "interactive",
  scenario = "default",
}: GalleryStoryProps) {
  const startingSnapshot = scenario === "loading" || scenario === "unavailable" ? undefined : initialSnapshot
  const commands = useMemo<ClinicGalleryCommands>(() => {
    const commands = createClinicGalleryCommandsFixture(initialSnapshot)
    if (scenario === "loading") {
      return {
        ...commands,
        loadGallery: async () => {
          await new Promise((resolve) => setTimeout(resolve, 5_000))
          return initialSnapshot
        },
      }
    }
    if (scenario === "unavailable") {
      return {
        ...commands,
        loadGallery: async () => {
          throw new ClinicGalleryCommandError("unavailable", "Gallery service unavailable.")
        },
      }
    }
    if (scenario === "save-conflict") {
      return {
        ...commands,
        saveGallery: async () => {
          throw new ClinicGalleryCommandError("conflict", "The gallery changed elsewhere.")
        },
      }
    }
    if (scenario === "discard-failure") {
      return {
        ...commands,
        discardDrafts: async () => {
          throw new ClinicGalleryCommandError("unavailable", "Draft cleanup unavailable.")
        },
      }
    }
    if (scenario === "retry-upload") {
      const uploadMedia = commands.uploadMedia
      const failedFiles = new Set<string>()
      return {
        ...commands,
        uploadMedia: async (input) => {
          if (input.file.name === "retry.png" && !failedFiles.has(input.file.name)) {
            failedFiles.add(input.file.name)
            throw new ClinicGalleryCommandError("unavailable", "Connection interrupted.")
          }
          return uploadMedia(input)
        },
      }
    }
    return commands
  }, [initialSnapshot, scenario])
  const controller = useClinicGalleryController({ commands, initialSnapshot: startingSnapshot, management })
  return (
    <div className="min-h-dvh bg-[var(--canvas)] p-4 sm:p-6 lg:p-8">
      {!controller.model.open ? (
        <Button onClick={controller.actions.openGallery}>Open gallery manager</Button>
      ) : null}
      <ClinicGalleryManagerDialog controller={controller} />
    </div>
  )
}

function getGallery(documentBody: HTMLElement, name = "Manage gallery") {
  return within(documentBody).getByRole("region", { name })
}

const meta = {
  component: ClinicGalleryManagerDialog,
  parameters: { layout: "fullscreen" },
  render: (args: GalleryStoryProps) => <GalleryStory {...args} />,
  tags: ["domain:clinic-profile", "layer:organism", "status:prototype"],
  title: "Clinic Dashboard/Clinic Profile/Organisms/Clinic Gallery Manager",
} satisfies Meta

export default meta
type Story = StoryObj<GalleryStoryProps>

export const ImageInspector: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    await waitFor(() =>
      expect(within(gallery).getByRole("heading", { name: "Manage gallery" })).toHaveFocus(),
    )
    await expect(within(gallery).getAllByText("Main image")[0]).toBeVisible()
    await expect(within(gallery).getByRole("textbox", { name: /Alt text/ })).toHaveValue(
      "Berlin Health Clinic reception",
    )
  },
}

export const KeyboardReorderAndSave: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    await waitFor(() =>
      expect(within(gallery).getByRole("heading", { name: "Manage gallery" })).toHaveFocus(),
    )
    const secondHandle = within(gallery).getByRole("button", {
      name: "Reorder image 2. Use arrow keys.",
    })
    secondHandle.focus()
    await userEvent.keyboard("{ArrowLeft}")
    const save = within(gallery).getByRole("button", { name: "Save and return" })
    await waitFor(() => expect(save).toBeEnabled())
    await userEvent.click(save)
    await waitFor(() =>
      expect(documentPage.queryByRole("region", { name: "Manage gallery" })).not.toBeInTheDocument(),
    )
  },
}

export const StagedRemovalWithPreview: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    await waitFor(() =>
      expect(within(gallery).getByRole("heading", { name: "Manage gallery" })).toHaveFocus(),
    )
    await userEvent.click(within(gallery).getByRole("button", { name: "More image actions" }))
    await userEvent.click(await documentPage.findByRole("menuitem", { name: "Remove image" }))
    await expect(within(gallery).getByText("Removed (1)")).toBeVisible()
    await userEvent.click(within(gallery).getByRole("button", { name: "Save and return" }))
    const confirmation = await documentPage.findByRole("alertdialog", {
      name: "Remove 1 image and save?",
    })
    await waitFor(() => expect(confirmation).toBeVisible())
    await expect(confirmation.querySelector("img")).not.toBeNull()
    await expect(within(confirmation).getByText("Berlin Health Clinic reception")).toBeVisible()
  },
}

export const EmptyGallery: Story = {
  args: { initialSnapshot: { ...clinicGallerySnapshotFixture, items: [], revision: 0 } },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    await expect(
      within(getGallery(canvasElement.ownerDocument.body)).getByText("Add your clinic photos"),
    ).toBeVisible()
  },
}

export const AddImages: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    await userEvent.click(
      within(getGallery(canvasElement.ownerDocument.body)).getByRole("button", { name: "Add images" }),
    )
    await expect(documentPage.getByRole("dialog", { name: "Add images" })).toBeVisible()
    await expect(documentPage.getByText("Drop clinic images here")).toBeVisible()
  },
}

export const UploadedImagesRequireAltText: Story = {
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    let gallery = getGallery(canvasElement.ownerDocument.body)
    await userEvent.click(within(gallery).getByRole("button", { name: "Add images" }))
    const addDialog = documentPage.getByRole("dialog", { name: "Add images" })
    await userEvent.upload(within(addDialog).getByLabelText("Choose clinic images"), [
      imageFile("consultation.png"),
      imageFile("reception.png"),
    ])
    await waitFor(() => expect(addDialog).not.toBeVisible())
    gallery = getGallery(canvasElement.ownerDocument.body)
    await expect(within(gallery).getAllByText("Needs alt text")).toHaveLength(2)
    await expect(within(gallery).getByRole("button", { name: "Save and return" })).toBeDisabled()
    await userEvent.type(within(gallery).getByRole("textbox", { name: /Alt text/ }), "Consultation room")
    await userEvent.click(within(gallery).getByRole("button", { name: "Edit image 6: Alt text missing" }))
    await userEvent.type(within(gallery).getByRole("textbox", { name: /Alt text/ }), "Clinic reception")
    await expect(within(gallery).queryByText("Needs alt text")).not.toBeInTheDocument()
    await expect(within(gallery).getByRole("button", { name: "Save and return" })).toBeEnabled()
    await expect(within(gallery).queryByRole("button", { name: "Skip for now" })).not.toBeInTheDocument()
  },
}

export const FailedUploadCanRetry: Story = {
  args: { scenario: "retry-upload" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    let gallery = getGallery(canvasElement.ownerDocument.body)
    await userEvent.click(within(gallery).getByRole("button", { name: "Add images" }))
    const addDialog = documentPage.getByRole("dialog", { name: "Add images" })
    await userEvent.upload(within(addDialog).getByLabelText("Choose clinic images"), [
      imageFile("ready.png"),
      imageFile("retry.png"),
    ])
    await waitFor(() => expect(addDialog).not.toBeVisible())
    gallery = getGallery(canvasElement.ownerDocument.body)
    await expect(within(gallery).getByText("Some images were not added")).toBeVisible()
    await userEvent.click(within(gallery).getByRole("button", { name: "Retry" }))
    await waitFor(() =>
      expect(within(gallery).queryByText("Some images were not added")).not.toBeInTheDocument(),
    )
    await expect(within(gallery).getAllByText("Needs alt text")).toHaveLength(2)
  },
}

export const Loading: Story = {
  args: { scenario: "loading" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    await expect(
      within(getGallery(canvasElement.ownerDocument.body)).getByText("Loading clinic gallery…"),
    ).toBeInTheDocument()
  },
}

export const Unavailable: Story = {
  args: { scenario: "unavailable" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    await expect(await within(gallery).findByText("Gallery unavailable")).toBeVisible()
    await expect(within(gallery).getByText("Your existing public gallery is unchanged.")).toBeVisible()
  },
}

export const SaveConflictPreservesLocalChanges: Story = {
  args: { scenario: "save-conflict" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    const secondHandle = within(gallery).getByRole("button", {
      name: "Reorder image 2. Use arrow keys.",
    })
    secondHandle.focus()
    await userEvent.keyboard("{ArrowLeft}")
    await userEvent.click(within(gallery).getByRole("button", { name: "Save and return" }))
    await waitFor(() => expect(within(gallery).getByText("Gallery changed elsewhere")).toBeVisible())
    await expect(within(gallery).getByText(/Your local values remain visible/)).toBeVisible()
    await expect(within(gallery).getByRole("button", { name: "More image actions" })).toBeVisible()
    await expect(within(gallery).getByRole("button", { name: "Save and return" })).toBeDisabled()
  },
}

export const DraftCleanupFailureStaysVisible: Story = {
  args: { scenario: "discard-failure" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    const documentPage = within(canvasElement.ownerDocument.body)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    await userEvent.click(within(gallery).getByRole("button", { name: "Add images" }))
    const addDialog = documentPage.getByRole("dialog", { name: "Add images" })
    await userEvent.upload(within(addDialog).getByLabelText("Choose clinic images"), imageFile("draft.png"))
    await waitFor(() => expect(addDialog).not.toBeVisible())
    await userEvent.click(within(gallery).getByRole("button", { name: "Back to profile" }))
    const leaveDialog = documentPage.getByRole("alertdialog", {
      name: "Save changes before leaving?",
    })
    await userEvent.click(within(leaveDialog).getByRole("button", { name: "Discard changes" }))
    await expect(within(gallery).getByText(/Draft cleanup failed/)).toBeVisible()
  },
}

export const FullCapacity: Story = {
  args: {
    initialSnapshot: {
      ...clinicGallerySnapshotFixture,
      items: Array.from({ length: 12 }, (_, index) => ({
        ...clinicGallerySnapshotFixture.items[index % clinicGallerySnapshotFixture.items.length]!,
        id: `full-${index + 1}`,
      })),
    },
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body)
    await expect(within(gallery).getByText(/Gallery full/)).toBeVisible()
    await expect(within(gallery).getByRole("button", { name: "Add images" })).toBeDisabled()
    await expect(within(gallery).getAllByRole("button", { name: /^Edit image/ })).toHaveLength(12)
  },
}

export const ReadOnly: Story = {
  args: { management: "read-only" },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement)
    await userEvent.click(page.getByRole("button", { name: "Open gallery manager" }))
    const gallery = getGallery(canvasElement.ownerDocument.body, "Clinic image gallery")
    await expect(within(gallery).queryByRole("button", { name: "Remove image" })).not.toBeInTheDocument()
    await expect(within(gallery).getByRole("button", { name: /View image 1/ })).toBeVisible()
    await expect(within(gallery).getByRole("button", { name: "Back to profile" })).toBeVisible()
  },
}

export const MobileInspector: Story = {
  globals: { viewport: { value: "mobile390Tall" } },
  play: ImageInspector.play,
}
