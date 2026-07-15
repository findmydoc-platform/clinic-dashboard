"use client"

import type { FormEvent, KeyboardEvent } from "react"
import { Paperclip, Send } from "lucide-react"
import { Button } from "@/components/ui/button"

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
          aria-label="Attach file, unavailable in this prototype"
          disabled
          size="icon"
          title="Attachments are not available in this prototype"
          variant="ghost"
        >
          <Paperclip aria-hidden="true" className="size-5" />
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
      <p className="mt-2 hidden pl-[3.25rem] text-xs text-[var(--foreground)] sm:block">
        Enter to send · Shift+Enter for a new line
      </p>
    </form>
  )
}
