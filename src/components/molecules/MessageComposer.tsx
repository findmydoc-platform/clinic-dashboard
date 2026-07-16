"use client"

import type { FormEvent, KeyboardEvent } from "react"
import { Paperclip, Send, Smile, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

const replyTemplate = "Thank you for your message. We will review your request and get back to you shortly."

type MessageComposerProps = Readonly<{
  draft: string
  onDraftChange: (draft: string) => void
  onSend: (message: string) => void
}>

export function MessageComposer({ draft, onDraftChange, onSend }: MessageComposerProps) {
  const canSend = draft.trim().length > 0

  const sendDraft = () => {
    if (!canSend) return
    onSend(draft.trim())
  }

  const appendSmile = () => {
    const spacer = draft.length > 0 && !draft.endsWith(" ") ? " " : ""
    onDraftChange(`${draft}${spacer}🙂`)
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    sendDraft()
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || event.nativeEvent.isComposing) return
    event.preventDefault()
    sendDraft()
  }

  return (
    <form className="border-t border-[var(--border)] bg-[var(--background)] p-4" onSubmit={handleSubmit}>
      <div className="flex items-end gap-2">
        <Button
          aria-describedby="attachment-prototype-note"
          aria-label="Attach file, unavailable in this prototype"
          disabled
          size="icon"
          title="Attachments are not available in this prototype"
          variant="ghost"
        >
          <Paperclip aria-hidden="true" className="size-5" />
        </Button>
        <Button aria-label="Add smile emoji" onClick={appendSmile} size="icon" variant="ghost">
          <Smile aria-hidden="true" className="size-5" />
        </Button>
        <textarea
          aria-label="Write a message"
          className="[field-sizing:content] max-h-36 min-h-11 flex-1 resize-none rounded-lg border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm leading-5 text-[var(--secondary)] placeholder:text-[var(--foreground)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--primary)]"
          onChange={(event) => onDraftChange(event.currentTarget.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write a message…"
          rows={1}
          value={draft}
        />
        <Button aria-label="Send message" disabled={!canSend} size="icon" type="submit">
          <Send aria-hidden="true" className="size-5" />
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 pl-[6.5rem]">
        <Button
          aria-label="Use reply template"
          className="min-h-8 px-1 text-xs text-[var(--primary)]"
          onClick={() => onDraftChange(replyTemplate)}
          size="small"
          variant="ghost"
        >
          <Sparkles aria-hidden="true" className="size-4" /> Use template
        </Button>
        <p className="text-xs text-[var(--foreground)]" id="attachment-prototype-note">
          Attachments are not available in this prototype.
          <span className="hidden sm:inline"> · Enter to send · Shift+Enter for a new line</span>
        </p>
      </div>
    </form>
  )
}
