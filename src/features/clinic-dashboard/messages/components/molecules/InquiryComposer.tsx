"use client"

import { useId, useRef, type ChangeEvent, type FormEvent } from "react"
import { CircleAlert, File, LoaderCircle, LockKeyhole, Paperclip, Send, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import {
  formatInquiryAttachmentSize,
  type InquiryAttachmentDraftState,
  type InquiryComposerMode,
} from "../../model/inquiry-workspace"
import { canReplyToInquiry, type PatientInquiryDetail } from "../../model/inquiries"

const messageCharacterLimit = 3_000

export type InquiryComposerProps = Readonly<{
  attachment?: InquiryAttachmentDraftState
  draft: string
  inquiry: PatientInquiryDetail
  isMutating: boolean
  mode: InquiryComposerMode
  onAttachmentRemove: () => Promise<void>
  onAttachmentRetry: () => Promise<void>
  onAttachmentSelect: (file: File) => Promise<void>
  onDraftChange: (value: string) => void
  onModeChange: (mode: InquiryComposerMode) => void
  onSend: () => Promise<void>
  statusMessage: string
}>

function getReplyUnavailableMessage(inquiry: PatientInquiryDetail) {
  if (inquiry.handlingStatus === "spam")
    return "External messaging is blocked while this inquiry is marked as spam."
  if (inquiry.conversation.kind === "guest") {
    return "No patient chat yet. This inquiry is not linked to a verified patient account."
  }
  if (inquiry.conversation.kind === "deleted-patient") {
    return "The patient identity was deleted. External messaging is no longer available."
  }
  return "The conversation is closed. Internal notes remain available."
}

function getAttachmentDescription(attachment: InquiryAttachmentDraftState) {
  switch (attachment.status) {
    case "uploading":
      return "Uploading…"
    case "ready":
      return `${attachment.mimeType} · ${formatInquiryAttachmentSize(attachment.sizeBytes)}`
    case "failed":
    case "invalid":
      return "message" in attachment ? attachment.message : "The attachment could not be prepared."
  }
}

function getAttachmentStatusMessage(
  attachment: InquiryAttachmentDraftState | undefined,
  statusMessage: string,
) {
  if (!attachment || attachment.status === "ready") return statusMessage
  if (attachment.status === "uploading") return `Uploading ${attachment.fileName}.`
  const message = "message" in attachment ? attachment.message : "The attachment could not be prepared."
  return `${message} Choose another file to retry.`
}

export function InquiryComposer({
  attachment,
  draft,
  inquiry,
  isMutating,
  mode,
  onAttachmentRemove,
  onAttachmentRetry,
  onAttachmentSelect,
  onDraftChange,
  onModeChange,
  onSend,
  statusMessage,
}: InquiryComposerProps) {
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const inputId = useId()
  const characterStatusId = `${inputId}-character-status`
  const attachmentStatusId = `${inputId}-attachment-status`
  const canReply = canReplyToInquiry(inquiry) && inquiry.actions.canReply
  const canAddInternalNote = inquiry.actions.canAddInternalNote
  const isOverLimit = draft.length > messageCharacterLimit
  const isAttachmentBusy = attachment?.status === "uploading"
  const isAttachmentReady = attachment?.status === "ready"
  const canSend =
    !isMutating &&
    !isAttachmentBusy &&
    !isOverLimit &&
    (mode === "note" ? canAddInternalNote && draft.trim().length > 0 : canReply) &&
    (draft.trim().length > 0 || isAttachmentReady)

  if (!canReply && !canAddInternalNote) return null

  const handleFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0]
    if (file) void onAttachmentSelect(file)
    event.currentTarget.value = ""
  }
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSend) void onSend()
  }

  return (
    <form
      aria-busy={isMutating || isAttachmentBusy || undefined}
      className="border-t border-[var(--border)] bg-[var(--background)] p-3 shadow-sm sm:p-4"
      onSubmit={handleSubmit}
    >
      <div className="mx-auto w-full max-w-[68rem]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div
            aria-label="Composer mode"
            className="flex items-center gap-1 rounded-lg bg-[var(--surface)] p-1"
            role="group"
          >
            {canReply ? (
              <button
                aria-pressed={mode === "reply"}
                className={cn(
                  "min-h-10 rounded-md px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                  mode === "reply"
                    ? "bg-[var(--background)] text-[var(--secondary)] shadow-sm"
                    : "text-[var(--foreground)]",
                )}
                disabled={isMutating}
                onClick={() => onModeChange("reply")}
                type="button"
              >
                Reply to patient
              </button>
            ) : null}
            {canAddInternalNote ? (
              <button
                aria-pressed={mode === "note"}
                className={cn(
                  "min-h-10 rounded-md px-3 text-xs font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]",
                  mode === "note"
                    ? "bg-[var(--background)] text-[var(--secondary)] shadow-sm"
                    : "text-[var(--foreground)]",
                )}
                disabled={isMutating}
                onClick={() => onModeChange("note")}
                type="button"
              >
                Internal note
              </button>
            ) : null}
          </div>
          <span className="text-xs text-[var(--foreground)]">
            {mode === "note" ? "Clinic only · No patient notification" : "Sent through findmydoc"}
          </span>
        </div>

        {!canReply ? (
          <div className="mb-3 flex items-start gap-2 rounded-lg bg-[var(--surface)] px-3 py-2 text-xs leading-5 text-[var(--foreground)]">
            <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{getReplyUnavailableMessage(inquiry)}</span>
          </div>
        ) : null}

        <Textarea
          aria-describedby={`${characterStatusId} ${attachmentStatusId}`}
          aria-invalid={isOverLimit || undefined}
          aria-label={mode === "note" ? "Internal note" : "Reply to patient"}
          className="min-h-24 resize-y text-sm"
          disabled={isMutating}
          onValueChange={onDraftChange}
          placeholder={mode === "note" ? "Add clinic-only context…" : "Write a reply…"}
          value={draft}
        />

        {isOverLimit ? (
          <p
            className="mt-2 flex items-center gap-2 text-xs font-bold text-[var(--destructive)]"
            id={characterStatusId}
            role="alert"
          >
            <CircleAlert aria-hidden="true" className="size-4 shrink-0" />
            Shorten by {draft.length - messageCharacterLimit} characters before sending.
          </p>
        ) : (
          <span className="sr-only" id={characterStatusId}>
            {messageCharacterLimit - draft.length} characters remaining.
          </span>
        )}

        {attachment ? (
          <div
            className={cn(
              "mt-2 flex min-h-11 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-xs",
              (attachment.status === "failed" || attachment.status === "invalid") &&
                "border-[var(--destructive)]",
            )}
          >
            {attachment.status === "uploading" ? (
              <LoaderCircle
                aria-hidden="true"
                className="size-4 shrink-0 animate-spin text-[var(--primary)]"
              />
            ) : (
              <File aria-hidden="true" className="size-4 shrink-0 text-[var(--primary)]" />
            )}
            <span className="min-w-0 flex-1">
              <strong className="block truncate text-[var(--secondary)]">{attachment.fileName}</strong>
              <span className="block text-[var(--foreground)]">{getAttachmentDescription(attachment)}</span>
            </span>
            <Button
              aria-label={`Remove ${attachment.fileName}`}
              disabled={isMutating}
              onClick={() => void onAttachmentRemove()}
              size="icon"
              variant="ghost"
            >
              <X aria-hidden="true" className="size-4" />
            </Button>
            {attachment.status === "failed" ? (
              <Button
                disabled={isMutating}
                onClick={() => void onAttachmentRetry()}
                size="small"
                variant="outline"
              >
                Retry upload
              </Button>
            ) : null}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <input
              accept="image/png,image/jpeg,image/webp,application/pdf"
              aria-label="Choose reply attachment"
              className="sr-only"
              disabled={mode === "note" || isMutating || isAttachmentBusy}
              onChange={handleFile}
              ref={attachmentInputRef}
              type="file"
            />
            <Button
              disabled={mode === "note" || isMutating || isAttachmentBusy}
              onClick={() => attachmentInputRef.current?.click()}
              variant="outline"
            >
              <Paperclip aria-hidden="true" className="size-4" />
              {attachment && attachment.status !== "ready" ? "Choose another file" : "Attach"}
            </Button>
            <span
              className={cn(
                "text-[11px] text-[var(--foreground)] tabular-nums",
                isOverLimit && "font-bold text-[var(--destructive)]",
              )}
            >
              {draft.length.toLocaleString("en-US")} / {messageCharacterLimit.toLocaleString("en-US")}
            </span>
          </div>
          <Button disabled={!canSend} type="submit">
            {isMutating ? (
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            ) : (
              <Send aria-hidden="true" className="size-4" />
            )}
            {mode === "note" ? "Add note" : "Send reply"}
          </Button>
        </div>
        <p
          aria-live="polite"
          className={cn(
            "mt-2 min-h-5 text-xs text-[var(--foreground)]",
            attachment &&
              ["failed", "invalid"].includes(attachment.status) &&
              "font-bold text-[var(--destructive)]",
          )}
          id={attachmentStatusId}
          role="status"
        >
          {getAttachmentStatusMessage(attachment, statusMessage)}
        </p>
      </div>
    </form>
  )
}
