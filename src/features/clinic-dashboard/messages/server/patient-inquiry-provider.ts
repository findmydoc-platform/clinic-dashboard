import "server-only"

import type {
  InquiryHandlingStatusTarget,
  InquiryQueueQuery,
  InquiryResult,
  InquiryUnreadProjection,
  PatientInquiryDetail,
  PatientInquiryQueueSnapshot,
} from "../model/inquiries"

export type InquiryAttachmentDraftUpload = Readonly<{
  draftId: string
  expiresAt: string
  upload: Readonly<{
    headers: Readonly<Record<string, string>>
    method: "PUT"
    url: string
  }>
}>

export type InquiryAttachmentContent = Readonly<{
  body: ArrayBuffer
  contentType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp"
}>

export type PatientInquiryAttachmentDraftUpload = (
  input: Readonly<{
    body: ArrayBuffer
    draftId: string
    mimeType: InquiryAttachmentContent["contentType"]
  }>,
) => Promise<InquiryResult<Readonly<{ uploaded: true }>>>

export type PatientInquiryAttachmentDraftUploadFactory = (
  accessToken: string,
  clinicId: string,
) => PatientInquiryAttachmentDraftUpload | undefined

export type PatientInquiryProvider = Readonly<{
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
  createAttachmentDraft: (
    input: Readonly<{
      fileName: string
      inquiryId: string
      mimeType: string
      sizeBytes: number
    }>,
  ) => Promise<InquiryResult<InquiryAttachmentDraftUpload>>
  discardAttachmentDraft: (
    input: Readonly<{ draftId: string; inquiryId: string }>,
  ) => Promise<InquiryResult<Readonly<{ discarded: boolean }>>>
  downloadAttachment: (
    input: Readonly<{ attachmentId: string }>,
  ) => Promise<InquiryResult<InquiryAttachmentContent>>
  previewAttachment: (
    input: Readonly<{ attachmentId: string }>,
  ) => Promise<InquiryResult<InquiryAttachmentContent>>
  finalizeAttachmentDraft: (
    input: Readonly<{ draftId: string; inquiryId: string }>,
  ) => Promise<InquiryResult<Readonly<{ finalized: boolean }>>>
  loadDetail: (
    input: Readonly<{ inquiryId: string; knownChangeCursor?: string; knownRevision?: number }>,
  ) => Promise<
    InquiryResult<Readonly<{ changeCursor: string; inquiry: PatientInquiryDetail; unchanged: boolean }>>
  >
  loadQueue: (input: InquiryQueueQuery) => Promise<InquiryResult<PatientInquiryQueueSnapshot>>
  revealContact: (
    input: Readonly<{ inquiryId: string }>,
  ) => Promise<InquiryResult<Readonly<{ inquiry: PatientInquiryDetail }>>>
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

export type PatientInquiryProviderFactory = (accessToken: string, clinicId: string) => PatientInquiryProvider
