"use client"
import { useEffect, useRef } from "react"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Textarea } from "@/components/ui/textarea"
import type { SupportCommand } from "../../model/support-request"
import { useSupportRequestController } from "../../hooks/useSupportRequestController"

type SupportRequestDialogProps = Readonly<{
  onOpenChange: (open: boolean) => void
  open: boolean
  send: SupportCommand
}>
export function SupportRequestDialog({ onOpenChange, open, send }: SupportRequestDialogProps) {
  const { actions, model, refs } = useSupportRequestController(send)
  const { errors, isSubmitting, request, result } = model
  const doneRef = useRef<HTMLButtonElement>(null)
  const accepted = result?.status === "accepted"
  useEffect(() => {
    if (accepted && open) doneRef.current?.focus()
  }, [accepted, open])
  const close = () => {
    if (!isSubmitting) actions.reset()
    onOpenChange(false)
  }
  return (
    <Modal
      title="Contact support"
      description="Send a support request for your active clinic. Replies go to your account email."
      open={open}
      onOpenChange={(next) => {
        if (!next) close()
      }}
      panelClassName="max-w-3xl"
      footer={
        accepted ? (
          <Button onClick={close} ref={doneRef}>
            Done
          </Button>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={close} variant="outline">
              {isSubmitting ? "Close dialog" : "Cancel"}
            </Button>
            <Button aria-busy={isSubmitting} disabled={isSubmitting} onClick={() => void actions.submit()}>
              {isSubmitting ? "Sending…" : "Send support request"}
            </Button>
          </div>
        )
      }
    >
      {accepted ? (
        <div
          role="status"
          aria-label="Request accepted"
          className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <CheckCircle2 aria-hidden="true" className="size-6 shrink-0 text-[var(--primary)]" />
          <div>
            <h3 className="font-bold">Request accepted</h3>
            <p className="mt-1 text-sm leading-6">
              Google accepted your request for delivery to support. This does not confirm inbox delivery or
              review by the team.
            </p>
          </div>
        </div>
      ) : (
        <section aria-labelledby="support-form-heading">
          <h3 className="font-bold text-[var(--secondary)]" id="support-form-heading">
            Support request
          </h3>
          <p className="mt-2 text-sm leading-6">
            Do not include patient data or confidential information. If screenshots are needed later, remove
            confidential details before sharing them by email.
          </p>
          <fieldset disabled={isSubmitting} className="mt-4 grid gap-5">
            <Field error={errors.subject} isRequired label="Subject">
              {(props) => (
                <Input
                  {...props}
                  maxLength={160}
                  onValueChange={(value) => actions.update("subject", value)}
                  ref={refs.subjectRef}
                  value={request.subject}
                />
              )}
            </Field>
            <Field error={errors.message} isRequired label="Message">
              {(props) => (
                <Textarea
                  {...props}
                  className="min-h-32"
                  maxLength={5000}
                  onValueChange={(value) => actions.update("message", value)}
                  ref={refs.messageRef}
                  value={request.message}
                />
              )}
            </Field>
          </fieldset>
          {isSubmitting ? (
            <p className="mt-4 text-sm" role="status">
              Sending your request…
            </p>
          ) : null}
          {result?.status === "failed" ? (
            <p className="mt-4 text-sm text-[var(--destructive)]" role="alert">
              Your request could not be sent. Your text is still here. You can try again manually.
            </p>
          ) : null}
          {result?.status === "unknown" ? (
            <p className="mt-4 text-sm" role="alert">
              Sending was not confirmed. Your request may already have been accepted. Your text is still here.
              Trying again may create a duplicate request.
            </p>
          ) : null}
        </section>
      )}
    </Modal>
  )
}
