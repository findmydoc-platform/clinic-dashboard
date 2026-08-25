"use client"

import { useRef, useState } from "react"
import { LockKeyhole, Mail, MailOpen, MoreHorizontal, ShieldAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu } from "@/components/ui/dropdown-menu"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import type { InquiryWorkspaceActions } from "../../model/inquiry-workspace"
import type { PatientInquiryDetail } from "../../model/inquiries"

type InquiryActionsMenuProps = Readonly<{
  hasPendingReplyDraft: boolean
  inquiry: PatientInquiryDetail
  isMutating: boolean
  onLifecycleToggle: InquiryWorkspaceActions["onLifecycleToggle"]
  onMarkReadToggle: () => Promise<void>
  onSpamToggle: InquiryWorkspaceActions["onSpamToggle"]
}>

export function InquiryActionsMenu({
  hasPendingReplyDraft,
  inquiry,
  isMutating,
  onLifecycleToggle,
  onMarkReadToggle,
  onSpamToggle,
}: InquiryActionsMenuProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [closeDialogOpen, setCloseDialogOpen] = useState(false)
  const [closeReason, setCloseReason] = useState("")
  const [spamDialogOpen, setSpamDialogOpen] = useState(false)
  const [spamReason, setSpamReason] = useState("")
  const triggerRef = useRef<HTMLButtonElement>(null)
  const markingSpam = inquiry.handlingStatus !== "spam"
  const canToggleRead = inquiry.unread.isUnread ? inquiry.actions.canMarkRead : inquiry.actions.canMarkUnread

  return (
    <>
      <DropdownMenu onOpenChange={setMenuOpen} open={menuOpen && !isMutating}>
        <DropdownMenu.Trigger asChild>
          <Button
            aria-label="More actions"
            aria-busy={isMutating || undefined}
            disabled={isMutating}
            ref={triggerRef}
            size="icon"
            variant="outline"
          >
            <MoreHorizontal aria-hidden="true" className="size-5" />
          </Button>
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" aria-label="Inquiry actions" className="w-64">
          <DropdownMenu.Item
            disabled={inquiry.handlingStatus === "spam" || !inquiry.actions.canChangeLifecycle || isMutating}
            onSelect={() => {
              if (inquiry.lifecycle === "open") setCloseDialogOpen(true)
              else void onLifecycleToggle()
            }}
          >
            <LockKeyhole aria-hidden="true" className="size-4" />
            {inquiry.handlingStatus === "spam"
              ? "Conversation locked while spam"
              : inquiry.lifecycle === "open"
                ? "Close conversation"
                : "Reopen conversation"}
          </DropdownMenu.Item>
          <DropdownMenu.Item disabled={!canToggleRead || isMutating} onSelect={() => void onMarkReadToggle()}>
            {inquiry.unread.isUnread ? (
              <MailOpen aria-hidden="true" className="size-4" />
            ) : (
              <Mail aria-hidden="true" className="size-4" />
            )}
            {inquiry.unread.isUnread ? "Mark as read" : "Mark as unread"}
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item
            disabled={
              !inquiry.actions.canChangeHandlingStatus ||
              (markingSpam && !inquiry.actions.canChangeLifecycle) ||
              isMutating
            }
            onSelect={() => {
              if (markingSpam) setSpamDialogOpen(true)
              else void onSpamToggle()
            }}
            variant="destructive"
          >
            <ShieldAlert aria-hidden="true" className="size-4" />
            {markingSpam ? "Mark as spam" : "Remove spam label"}
          </DropdownMenu.Item>
        </DropdownMenu.Content>
      </DropdownMenu>

      <Modal
        description="Closing keeps the conversation readable and leaves internal notes available."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setCloseDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={isMutating}
              onClick={async () => {
                const succeeded = await onLifecycleToggle({
                  draftDiscardConfirmed: hasPendingReplyDraft,
                  ...(closeReason.trim() ? { reason: closeReason.trim() } : {}),
                })
                if (succeeded) {
                  setCloseDialogOpen(false)
                  setCloseReason("")
                }
              }}
            >
              Close conversation
            </Button>
          </div>
        }
        onOpenChange={setCloseDialogOpen}
        open={closeDialogOpen}
        title="Close conversation?"
        triggerRef={triggerRef}
      >
        {hasPendingReplyDraft ? (
          <p
            className="mb-4 rounded-lg bg-[color-mix(in_srgb,var(--warning)_35%,var(--background))] px-3 py-2 text-sm font-bold text-[var(--secondary)]"
            role="alert"
          >
            Closing discards the unsent patient reply and its attachment. Internal-note drafts are kept.
          </p>
        ) : null}
        <label className="block text-sm font-bold text-[var(--secondary)]">
          Internal reason (optional)
          <Textarea
            aria-label="Close reason"
            className="mt-2 min-h-28 font-normal"
            maxLength={500}
            onValueChange={setCloseReason}
            placeholder="Add clinic-only context for this decision."
            value={closeReason}
          />
          <span className="mt-1 block text-right text-xs font-normal text-[var(--foreground)]">
            {closeReason.length} / 500
          </span>
        </label>
      </Modal>

      <Modal
        description="Spam closes the conversation and hides protected contact details. The reason is recorded in the inquiry activity."
        footer={
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button onClick={() => setSpamDialogOpen(false)} variant="outline">
              Cancel
            </Button>
            <Button
              disabled={!spamReason.trim() || isMutating}
              onClick={async () => {
                const reason = spamReason.trim()
                if (!reason) return
                const succeeded = await onSpamToggle({
                  draftDiscardConfirmed: hasPendingReplyDraft,
                  reason,
                })
                if (succeeded) {
                  setSpamDialogOpen(false)
                  setSpamReason("")
                }
              }}
              variant="destructive"
            >
              Mark as spam
            </Button>
          </div>
        }
        onOpenChange={setSpamDialogOpen}
        open={spamDialogOpen}
        title="Mark inquiry as spam?"
        triggerRef={triggerRef}
      >
        {hasPendingReplyDraft ? (
          <p
            className="mb-4 rounded-lg bg-[color-mix(in_srgb,var(--warning)_35%,var(--background))] px-3 py-2 text-sm font-bold text-[var(--secondary)]"
            role="alert"
          >
            Marking as spam discards the unsent patient reply and its attachment. Internal-note drafts are
            kept.
          </p>
        ) : null}
        <label className="block text-sm font-bold text-[var(--secondary)]">
          Reason
          <Textarea
            aria-label="Spam reason"
            className="mt-2 min-h-28 font-normal"
            maxLength={500}
            onValueChange={setSpamReason}
            placeholder="Explain why this inquiry is unrelated to patient care."
            value={spamReason}
          />
          <span className="mt-1 block text-right text-xs font-normal text-[var(--foreground)]">
            {spamReason.length} / 500
          </span>
        </label>
      </Modal>
    </>
  )
}
