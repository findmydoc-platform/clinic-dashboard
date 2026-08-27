import type {
  InquiryDetailResult,
  InquiryHandlingStatusTarget,
  InquiryQueueQuery,
  InquiryResult,
  InquiryUnreadProjection,
  PatientInquiryDetail,
  PatientInquiryQueueSnapshot,
} from "./inquiries"
import type { InquiryAttachmentDraft } from "./inquiry-workspace"

export type InquiryWorkspaceCommands = Readonly<{
  addInternalNote: (
    input: Readonly<{
      idempotencyKey: string
      inquiryId: string
      text: string
    }>,
  ) => Promise<InquiryResult<Readonly<{ inquiry: PatientInquiryDetail; replayed?: boolean }>>>
  changeReadPosition: (
    input: Readonly<{
      activityId?: string
      inquiryId: string
      mode: "read" | "unread"
    }>,
  ) => Promise<InquiryResult<Readonly<{ unread: InquiryUnreadProjection }>>>
  changeState: (
    input:
      | Readonly<{
          action: "set-handling-status"
          expectedRevision: number
          handlingStatus: InquiryHandlingStatusTarget
          inquiryId: string
        }>
      | Readonly<{
          action: "close" | "reopen" | "mark-spam" | "remove-spam"
          expectedRevision: number
          inquiryId: string
          reason?: string
        }>,
  ) => Promise<InquiryResult<Readonly<{ inquiry: PatientInquiryDetail; replayed?: boolean }>>>
  revealContact: (
    input: Readonly<{ inquiryId: string }>,
  ) => Promise<InquiryResult<Readonly<{ inquiry: PatientInquiryDetail }>>>
  createAttachmentDraft: (
    input: Readonly<{
      file: File
      inquiryId: string
    }>,
  ) => Promise<InquiryResult<InquiryAttachmentDraft>>
  discardAttachmentDraft: (
    input: Readonly<{ draftId: string; inquiryId: string }>,
  ) => Promise<InquiryResult<Readonly<{ discarded: boolean }>>>
  loadDetail: (
    input: Readonly<{ inquiryId: string; knownChangeCursor?: string; knownRevision?: number }>,
  ) => Promise<InquiryResult<InquiryDetailResult>>
  loadQueue: (query: InquiryQueueQuery) => Promise<InquiryResult<PatientInquiryQueueSnapshot>>
  sendExternalMessage: (
    input: Readonly<{
      attachmentDraftId?: string
      expectedRevision: number
      idempotencyKey: string
      inquiryId: string
      text?: string
    }>,
  ) => Promise<InquiryResult<Readonly<{ inquiry: PatientInquiryDetail; replayed?: boolean }>>>
}>

/** @deprecated Use InquiryWorkspaceCommands. */
export type InquiryStatusCommands = InquiryWorkspaceCommands
