import { useState } from "react"
import type { Meta, StoryObj } from "@storybook/nextjs-vite"
import { expect, fn, userEvent, waitFor, within } from "storybook/test"
import type { InquiryWorkspaceActions, InquiryWorkspaceViewModel } from "../../model/inquiry-workspace"
import type { PatientInquiryDetail } from "../../model/inquiries"
import {
  closedInquiryFixture,
  deletedPatientInquiryFixture,
  hardDeletedPackageInquiryFixture,
  inquiryDetailFixtures,
  inquiryQueueFixture,
  spamInquiryFixture,
} from "../../testing/public"
import { InquiryQueueScreen } from "./InquiryQueueScreen"

const queueInquiries = inquiryQueueFixture.status === "ready" ? inquiryQueueFixture.inquiries : []

function createActions() {
  return {
    onAttachmentRemove: fn(async () => undefined),
    onAttachmentRetry: fn(async () => undefined),
    onAttachmentSelect: fn(async () => undefined),
    onComposerModeChange: fn(),
    onConflictDismiss: fn(),
    onReplyDraftConvertToNote: fn(),
    onContactReauthenticate: fn(async () => undefined),
    onContactReauthenticationDismiss: fn(),
    onContactReveal: fn(async () => undefined),
    onDraftChange: fn(),
    onHandlingStatusChange: fn(async () => undefined),
    onInquirySelect: fn(async () => undefined),
    onLifecycleToggle: fn(async () => true),
    onLoadMore: fn(async () => undefined),
    onMarkReadToggle: fn(async () => undefined),
    onMobileBack: fn(),
    onPrimaryFilterChange: fn(),
    onQueueRefresh: fn(async () => undefined),
    onRefresh: fn(async () => undefined),
    onSearchQueryChange: fn(),
    onSend: fn(async () => undefined),
    onSpamToggle: fn(async () => true),
    onStatusFilterChange: fn(),
  } satisfies InquiryWorkspaceActions
}

const baseModel = {
  activeComposerMode: "reply",
  attachmentAccessPaths: {
    "attachment-1": {
      download: "/api/dashboard/inquiries/attachments/download?attachmentId=attachment-1",
      preview: "/api/dashboard/inquiries/attachments/preview?attachmentId=attachment-1",
    },
  },
  availability: "ready",
  canConvertReplyDraftToNote: false,
  detailStatus: "idle",
  draft: "",
  handlingStatusFilter: [],
  hasPendingReplyDraft: false,
  hasUnsavedDrafts: false,
  isLoadingQueue: false,
  isMutating: false,
  lifecycleFilter: "open",
  mobileDetailOpen: false,
  searchQuery: "",
  statusMessage: "",
  totalUnreadCount: queueInquiries.reduce((total, inquiry) => total + (inquiry.unread.isUnread ? 1 : 0), 0),
  visibleInquiries: queueInquiries
    .filter(({ lifecycle, handlingStatus }) => lifecycle === "open" && handlingStatus !== "spam")
    .map((inquiry) => ({ inquiry, isActive: false })),
} satisfies InquiryWorkspaceViewModel

function selectedModel(
  inquiry: PatientInquiryDetail,
  overrides: Partial<InquiryWorkspaceViewModel> = {},
): InquiryWorkspaceViewModel {
  return {
    ...baseModel,
    activeComposerMode: inquiry.actions.canReply ? "reply" : "note",
    detailStatus: "ready",
    mobileDetailOpen: true,
    selectedInquiry: inquiry,
    selectedInquiryId: inquiry.id,
    selectedInquirySummary: inquiry,
    visibleInquiries: baseModel.visibleInquiries.map((item) => ({
      ...item,
      isActive: item.inquiry.id === inquiry.id,
    })),
    ...overrides,
  }
}

function MobileBackFocusHarness() {
  const [mobileDetailOpen, setMobileDetailOpen] = useState(true)
  return (
    <InquiryQueueScreen
      actions={{ ...createActions(), onMobileBack: () => setMobileDetailOpen(false) }}
      model={selectedModel(closedInquiryFixture, { mobileDetailOpen })}
    />
  )
}

const meta = {
  args: {
    actions: createActions(),
    model: baseModel,
  },
  component: InquiryQueueScreen,
  globals: { viewport: { value: "desktop1440" } },
  parameters: { layout: "fullscreen" },
  tags: ["domain:messages", "layer:organism", "status:stable"],
  title: "Clinic Dashboard/Messages/Organisms/Inquiry Queue Screen",
} satisfies Meta<typeof InquiryQueueScreen>

export default meta
type Story = StoryObj<typeof meta>

export const NoAutomaticSelection: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
    await expect(canvas.getByRole("heading", { name: "Select an inquiry" })).toBeVisible()
    await expect(canvas.queryByRole("region", { name: /^Inquiry from/ })).not.toBeInTheDocument()
  },
}

export const OpenConversation: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.open) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
    await userEvent.click(canvas.getByText("Inquiry details"))
    await expect(canvas.getByRole("heading", { name: "Original request" })).toBeVisible()
    await expect(canvas.getByRole("log", { name: "Activity for Lukas Weber" })).toBeVisible()
    await expect(canvas.getByRole("link", { name: "Preview" })).toHaveAttribute(
      "href",
      "/api/dashboard/inquiries/attachments/preview?attachmentId=attachment-1",
    )
    await expect(canvas.getByRole("link", { name: "Download" })).toHaveAttribute(
      "href",
      "/api/dashboard/inquiries/attachments/download?attachmentId=attachment-1",
    )
    await expect(canvas.getByRole("textbox", { name: "Reply to patient" })).toBeVisible()
  },
}

export const RestrictedContentPlaceholders: Story = {
  args: {
    model: selectedModel({
      ...inquiryDetailFixtures.open,
      timeline: [
        {
          attachmentState: "restricted",
          author: { kind: "patient", label: "Patient" },
          body: "",
          contentState: "restricted",
          createdAt: "2026-08-24T09:03:00.000Z",
          id: "message-restricted",
          kind: "external-message",
          moderation: { category: "privacy-concern", isCurrentActorAffected: false },
          timeLabel: "24 Aug, 11:03",
        },
      ],
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Message unavailable")).toBeVisible()
    await expect(canvas.getByText("Attachment unavailable")).toBeVisible()
  },
}

export const MultipleStatusFilters: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const page = within(canvasElement.ownerDocument.body)
    const trigger = canvas.getByRole("button", { name: "Filter by status. All statuses" })

    trigger.focus()
    await userEvent.keyboard("{Enter}")
    await expect(await page.findByRole("menuitem", { name: "All statuses" })).toHaveFocus()
    await userEvent.keyboard("{ArrowDown}")
    await expect(page.getByRole("menuitemcheckbox", { name: "Submitted" })).toHaveFocus()
    await expect(page.getByRole("menuitemcheckbox", { name: "In review" })).toBeVisible()
    await expect(page.getByRole("menuitemcheckbox", { name: "Contacted" })).toBeVisible()
  },
}

export const GuestInquiry: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.guest) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = within(canvas.getByRole("region", { name: "Inquiry from Aylin Kaya" }))
    await expect(detail.getByText("Guest inquiry · No chat")).toBeVisible()
    await expect(detail.queryByRole("textbox", { name: "Reply to patient" })).not.toBeInTheDocument()
    await expect(detail.getByRole("textbox", { name: "Internal note" })).toBeVisible()
  },
}

export const ClosedConversation: Story = {
  args: { model: selectedModel(closedInquiryFixture) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByText("Conversation closed")).toBeVisible()
    await expect(
      canvas.getByText("The conversation is closed. Internal notes remain available."),
    ).toBeVisible()
    await expect(canvas.getByRole("log", { name: "Activity for Markus Schmidt" })).toBeVisible()
  },
}

export const DeletedPatient: Story = {
  args: { model: selectedModel(deletedPatientInquiryFixture) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = within(canvas.getByRole("region", { name: "Inquiry from Deleted patient" }))
    await expect(detail.getByText("Deleted patient")).toBeVisible()
    await expect(detail.getByText("Inquiry inquiry-deleted-patient")).toBeVisible()
    await expect(detail.getByText("Patient deleted · No chat")).toBeVisible()
    await expect(detail.queryByRole("textbox", { name: "Reply to patient" })).not.toBeInTheDocument()
    await expect(detail.getByRole("textbox", { name: "Internal note" })).toBeVisible()
  },
}

export const HardDeletedPackage: Story = {
  args: { model: selectedModel(hardDeletedPackageInquiryFixture) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    const detail = within(canvas.getByRole("region", { name: "Inquiry from Deleted patient" }))
    await userEvent.click(detail.getByText("Inquiry details"))
    await expect(detail.getByText("Inquiry deleted")).toBeVisible()
    await expect(detail.getByText("Message deleted")).toBeVisible()
    await expect(detail.getByText("Internal note deleted")).toBeVisible()
    await expect(detail.queryByRole("textbox")).not.toBeInTheDocument()
    await expect(detail.queryByText("Sarah Schmidt")).not.toBeInTheDocument()
  },
}

export const SpamProtectedContact: Story = {
  args: { model: selectedModel(spamInquiryFixture) },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByText("Inquiry details"))
    await userEvent.click(canvas.getByText("Protected contact details"))
    await expect(canvas.getByText(/Reauthentication is required/)).toBeVisible()
    await expect(canvas.getByRole("button", { name: "Reveal contact details" })).toBeVisible()
  },
}

export const ContactRevealNeedsReauthentication: Story = {
  args: {
    model: selectedModel(spamInquiryFixture, {
      contactReauthentication: {
        message: "Confirm your password to reveal protected contact details.",
        status: "required",
      },
      draft: "Clinic-only context remains available.",
      hasUnsavedDrafts: true,
    }),
  },
  play: async ({ canvasElement }) => {
    const page = within(canvasElement.ownerDocument.body)
    await expect(page.getByRole("dialog", { name: "Confirm your identity" })).toBeVisible()
    await expect(page.getByLabelText("Password")).toHaveFocus()
    await expect(page.getByDisplayValue("Clinic-only context remains available.")).toBeVisible()
  },
}

export const QueueEmpty: Story = {
  args: { model: { ...baseModel, totalUnreadCount: 0, visibleInquiries: [] } },
}

export const QueueLoading: Story = {
  args: { model: { ...baseModel, isLoadingQueue: true, visibleInquiries: [] } },
}

export const QueueUnavailable: Story = {
  args: {
    model: {
      ...baseModel,
      availability: "temporarily-unavailable",
      totalUnreadCount: 0,
      visibleInquiries: [],
    },
  },
}

export const DetailLoading: Story = {
  args: {
    model: {
      ...baseModel,
      detailStatus: "loading",
      mobileDetailOpen: true,
      selectedInquiryId: inquiryDetailFixtures.open.id,
      selectedInquirySummary: inquiryDetailFixtures.open,
    },
  },
}

export const DetailLoadFailure: Story = {
  args: {
    model: {
      ...baseModel,
      detailError: "The inquiry service is temporarily unavailable.",
      detailStatus: "refresh-error",
      mobileDetailOpen: true,
      selectedInquiryId: inquiryDetailFixtures.open.id,
      selectedInquirySummary: inquiryDetailFixtures.open,
    },
  },
}

export const RefreshTimeout: Story = {
  args: {
    model: selectedModel(inquiryDetailFixtures.open, {
      detailError: "The result is uncertain. The latest activity was loaded before you retry.",
      detailStatus: "refresh-error",
    }),
  },
}

export const SendFailureKeepsDraft: Story = {
  args: {
    model: selectedModel(inquiryDetailFixtures.open, {
      draft: "Please review the attached context.",
      hasPendingReplyDraft: true,
      hasUnsavedDrafts: true,
      mutationError: "The inquiry service is temporarily unavailable.",
    }),
  },
}

export const RevisionConflictKeepsDraft: Story = {
  args: {
    actions: { ...createActions(), onReplyDraftConvertToNote: fn() },
    model: selectedModel(
      {
        ...inquiryDetailFixtures.open,
        actions: { ...inquiryDetailFixtures.open.actions, canReply: false },
        lifecycle: "closed",
        revision: 5,
      },
      {
        blockedReplyDraft: "This reply must remain available.",
        canConvertReplyDraftToNote: true,
        conflict: {
          current: {
            ...inquiryDetailFixtures.open,
            actions: { ...inquiryDetailFixtures.open.actions, canReply: false },
            lifecycle: "closed",
            revision: 5,
          },
          message: "This inquiry changed. Review the current state and decide again.",
        },
        hasPendingReplyDraft: true,
        hasUnsavedDrafts: true,
        mutationError: "This inquiry changed. Review the current state and decide again.",
      },
    ),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getAllByRole("alert")).toHaveLength(1)
    await expect(canvas.getByRole("alert")).toHaveTextContent("Your draft has been kept.")
    await expect(canvas.getByText("This reply must remain available.")).toBeVisible()
    await userEvent.click(canvas.getByRole("button", { name: "Move reply text to internal note" }))
    await expect(args.actions.onReplyDraftConvertToNote).toHaveBeenCalledOnce()
  },
}

export const PollingCloseKeepsReplyRecoveryVisible: Story = {
  args: {
    actions: {
      ...createActions(),
      onAttachmentRemove: fn(async () => undefined),
      onReplyDraftConvertToNote: fn(),
    },
    model: selectedModel(
      {
        ...inquiryDetailFixtures.open,
        actions: { ...inquiryDetailFixtures.open.actions, canReply: false },
        lifecycle: "closed",
        revision: inquiryDetailFixtures.open.revision + 1,
      },
      {
        activeComposerMode: "note",
        blockedReplyAttachment: {
          draftId: "story-blocked-draft",
          expiresAt: "2026-08-25T00:00:00.000Z",
          fileName: "blocked-assessment.pdf",
          mimeType: "application/pdf",
          sizeBytes: 128_000,
          status: "ready",
        },
        blockedReplyDraft: "Reply text kept after the parallel close.",
        canConvertReplyDraftToNote: true,
        draft: "Separate clinic-only note.",
        hasPendingReplyDraft: true,
        hasUnsavedDrafts: true,
      },
    ),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByRole("heading", { name: "Unsent reply recovery" })).toBeVisible()
    await expect(canvas.getByText("Reply text kept after the parallel close.")).toBeVisible()
    await expect(canvas.getByText("blocked-assessment.pdf")).toBeVisible()
    await expect(canvas.getByRole("textbox", { name: "Internal note" })).toHaveValue(
      "Separate clinic-only note.",
    )
    await userEvent.click(canvas.getByRole("button", { name: "Discard blocked-assessment.pdf" }))
    await expect(args.actions.onAttachmentRemove).toHaveBeenCalledOnce()
    await userEvent.click(canvas.getByRole("button", { name: "Move reply text to internal note" }))
    await expect(args.actions.onReplyDraftConvertToNote).toHaveBeenCalledOnce()
  },
}

export const SessionEnded: Story = {
  args: {
    model: {
      ...baseModel,
      availability: "temporarily-unavailable",
      detailError: "Your session ended. Sign in again to continue.",
      totalUnreadCount: 0,
      visibleInquiries: [],
    },
  },
}

export const UploadingAttachment: Story = {
  args: {
    model: selectedModel(inquiryDetailFixtures.open, {
      attachment: {
        fileName: "assessment-photos.pdf",
        mimeType: "application/pdf",
        sizeBytes: 720_000,
        status: "uploading",
      },
      hasPendingReplyDraft: true,
      hasUnsavedDrafts: true,
    }),
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Remove assessment-photos.pdf" })).toBeEnabled()
  },
}

export const InvalidAttachment: Story = {
  args: {
    model: selectedModel(inquiryDetailFixtures.open, {
      attachment: {
        fileName: "records.zip",
        message: "Use a PNG, JPEG, WebP or PDF file.",
        mimeType: "application/zip",
        sizeBytes: 128_000,
        status: "invalid",
      },
      hasPendingReplyDraft: true,
      hasUnsavedDrafts: true,
    }),
  },
}

export const FailedAttachmentCanRetryOrRemove: Story = {
  args: {
    actions: { ...createActions(), onAttachmentRetry: fn(async () => undefined) },
    model: selectedModel(inquiryDetailFixtures.open, {
      attachment: {
        fileName: "assessment.pdf",
        message: "The inquiry service is temporarily unavailable.",
        mimeType: "application/pdf",
        sizeBytes: 128_000,
        status: "failed",
      },
      hasPendingReplyDraft: true,
      hasUnsavedDrafts: true,
    }),
  },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Remove assessment.pdf" })).toBeEnabled()
    await userEvent.click(canvas.getByRole("button", { name: "Retry upload" }))
    await expect(args.actions.onAttachmentRetry).toHaveBeenCalledOnce()
  },
}

export const MobileListAt320: Story = {
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const MobileDetailAt320: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.open) },
  globals: { viewport: { value: "mobile320Short" } },
  play: async ({ args, canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Back to inquiries" })).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
    await userEvent.click(canvas.getByRole("button", { name: "Back to inquiries" }))
    await expect(args.actions.onMobileBack).toHaveBeenCalledOnce()
  },
}

export const MobileBackFromInquiryOutsideLoadedQueue: Story = {
  args: { model: selectedModel(closedInquiryFixture) },
  globals: { viewport: { value: "mobile320Short" } },
  render: () => <MobileBackFocusHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await userEvent.click(canvas.getByRole("button", { name: "Back to inquiries" }))
    await waitFor(() => expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toHaveFocus())
  },
}

export const TabletSinglePane: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.open) },
  globals: { viewport: { value: "tablet768" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("button", { name: "Back to inquiries" })).toBeVisible()
    await expect(canvasElement.scrollWidth).toBeLessThanOrEqual(canvasElement.clientWidth)
  },
}

export const MediumSinglePane: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.open) },
  globals: { viewport: { value: "desktop1279" } },
}

export const WideMasterDetail: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.open) },
  globals: { viewport: { value: "desktop1440" } },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)
    await expect(canvas.getByRole("heading", { level: 1, name: "Inquiries" })).toBeVisible()
    await expect(canvas.getByRole("region", { name: "Inquiry from Lukas Weber" })).toBeVisible()
  },
}

export const WideDark: Story = {
  args: { model: selectedModel(inquiryDetailFixtures.open) },
  globals: { theme: "dark", viewport: { value: "desktop1440" } },
}
