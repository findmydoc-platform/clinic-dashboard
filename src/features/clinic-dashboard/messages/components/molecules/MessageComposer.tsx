"use client"

import { useId, useRef, type FormEvent, type KeyboardEvent } from "react"
import { File, Paperclip, Send, Smile, Sparkles, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { formatMessageAttachmentSize, type MessageAttachmentMetadata } from "../../model/messages"

const replyTemplate = "Thank you for your message. We will review your request and get back to you shortly."

type MessageComposerProps = Readonly<{
  attachment?: MessageAttachmentMetadata
  attachmentError?: string
  draft: string
  isSending: boolean
  onAttachmentRemove: () => void
  onAttachmentSelect: (attachment: MessageAttachmentMetadata) => void
  onDraftChange: (draft: string) => void
  onSend: () => Promise<void>
  statusMessage: string
}>

export function MessageComposer({
  attachment,
  attachmentError,
  draft,
  isSending,
  onAttachmentRemove,
  onAttachmentSelect,
  onDraftChange,
  onSend,
  statusMessage,
}: MessageComposerProps) {
  const canSend = !isSending && (draft.trim().length > 0 || Boolean(attachment))
  const attachmentInputRef = useRef<HTMLInputElement>(null)
  const attachmentInputId = useId()

  const appendSmile = () => {
    const spacer = draft.length > 0 && !draft.endsWith(" ") ? " " : ""
    onDraftChange(`${draft}${spacer}🙂`)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (canSend) void onSend()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    if (canSend) void onSend()
  }

  return (
    <form
      aria-busy={isSending}
      className="border-t border-[var(--border)] bg-[var(--background)] p-3 sm:p-4"
      onSubmit={handleSubmit}
    >
      {attachment ? (
        <div className="mb-3 flex min-h-11 items-center gap-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm">
          <File aria-hidden="true" className="size-5 shrink-0 text-[var(--primary)]" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-bold">{attachment.name}</span>
            <span className="block text-xs text-[var(--foreground)]">
              {attachment.type} · {formatMessageAttachmentSize(attachment.size)}
            </span>
          </span>
          <Button
            aria-label={`Remove ${attachment.name}`}
            disabled={isSending}
            onClick={() => {
              onAttachmentRemove()
              if (attachmentInputRef.current) attachmentInputRef.current.value = ""
            }}
            size="icon"
            variant="ghost"
          >
            <X aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}
      <div className="flex items-end gap-1 sm:gap-2">
        <input
          accept="image/png,image/jpeg,image/webp,application/pdf"
          aria-label="Choose message attachment"
          aria-describedby={attachmentError ? `${attachmentInputId}-error` : `${attachmentInputId}-help`}
          className="sr-only"
          disabled={isSending}
          id={attachmentInputId}
          onChange={(event) => {
            const file = event.target.files?.[0]
            if (file) onAttachmentSelect({ name: file.name, size: file.size, type: file.type })
          }}
          ref={attachmentInputRef}
          type="file"
        />
        <Button
          aria-label="Attach file"
          disabled={isSending}
          onClick={() => attachmentInputRef.current?.click()}
          size="icon"
          variant="ghost"
        >
          <Paperclip aria-hidden="true" className="size-5" />
        </Button>
        <Button
          aria-label="Add smile emoji"
          disabled={isSending}
          onClick={appendSmile}
          size="icon"
          variant="ghost"
        >
          <Smile aria-hidden="true" className="size-5" />
        </Button>
        <Textarea
          aria-label="Write a message"
          className="[field-sizing:content] max-h-36 min-h-11 flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-5 text-[var(--secondary)] placeholder:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          disabled={isSending}
          onKeyDown={handleKeyDown}
          onValueChange={onDraftChange}
          placeholder="Write a message…"
          rows={1}
          value={draft}
        />
        <Button
          aria-label={isSending ? "Adding message locally" : "Send message"}
          disabled={!canSend}
          size="icon"
          type="submit"
        >
          <Send aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div className="mt-1.5 flex flex-wrap items-start justify-between gap-1 sm:mt-2 sm:gap-2 sm:pl-[6.5rem]">
        <Button
          aria-label="Use reply template"
          className="min-h-8 px-1 text-xs text-[var(--primary)]"
          disabled={isSending}
          onClick={() => onDraftChange(replyTemplate)}
          size="small"
          variant="ghost"
        >
          <Sparkles aria-hidden="true" className="size-4" /> Use template
        </Button>
        <div className="ml-auto text-right text-xs text-[var(--foreground)]">
          <p className="sr-only sm:not-sr-only" id={`${attachmentInputId}-help`}>
            PNG, JPEG, WebP, or PDF · 5 MB maximum
          </p>
          {attachmentError ? (
            <p className="mt-1 text-[var(--destructive)]" id={`${attachmentInputId}-error`} role="alert">
              {attachmentError}
            </p>
          ) : null}
          <p aria-live="polite" className="mt-1 sm:min-h-4" role="status">
            {statusMessage}
          </p>
        </div>
      </div>
    </form>
  )
}
