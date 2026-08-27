"use client"

import { useRef, useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import type { InquiryContactReauthentication } from "../../model/inquiry-workspace"

export type InquiryContactReauthenticationDialogProps = Readonly<{
  isMutating: boolean
  onConfirm: (password: string) => Promise<void>
  onDismiss: () => void
  reauthentication?: InquiryContactReauthentication
}>

export function InquiryContactReauthenticationDialog({
  isMutating,
  onConfirm,
  onDismiss,
  reauthentication,
}: InquiryContactReauthenticationDialogProps) {
  const [password, setPassword] = useState("")
  const passwordRef = useRef<HTMLInputElement>(null)
  const open = Boolean(reauthentication)

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!password || isMutating) return
    const submittedPassword = password
    setPassword("")
    void onConfirm(submittedPassword)
  }
  const dismiss = () => {
    setPassword("")
    onDismiss()
  }

  return (
    <Modal
      description="Confirm your clinic account password to reveal protected contact details for this inquiry."
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button disabled={isMutating} onClick={dismiss} variant="outline">
            Cancel
          </Button>
          <Button disabled={!password || isMutating} form="inquiry-contact-reauthentication" type="submit">
            {isMutating
              ? "Confirming…"
              : reauthentication?.status === "unavailable"
                ? "Try again"
                : "Confirm and reveal"}
          </Button>
        </div>
      }
      initialFocusRef={passwordRef}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) dismiss()
      }}
      open={open}
      title="Confirm your identity"
    >
      <form id="inquiry-contact-reauthentication" onSubmit={submit}>
        {reauthentication?.status === "invalid" || reauthentication?.status === "unavailable" ? (
          <p
            className="mb-4 rounded-lg bg-[color-mix(in_srgb,var(--destructive)_9%,var(--background))] px-3 py-2 text-sm font-bold text-[var(--destructive)]"
            role="alert"
          >
            {reauthentication.message}
          </p>
        ) : null}
        <label className="block text-sm font-bold text-[var(--secondary)]">
          Password
          <Input
            aria-invalid={reauthentication?.status === "invalid" || undefined}
            autoComplete="current-password"
            className="mt-2 font-normal"
            disabled={isMutating}
            name="password"
            onValueChange={setPassword}
            ref={passwordRef}
            type="password"
            value={password}
          />
        </label>
        <p className="mt-3 text-xs leading-5 text-[var(--foreground)]">
          The inquiry and both drafts stay open. Contact details are revealed only after this explicit
          confirmation.
        </p>
      </form>
    </Modal>
  )
}
