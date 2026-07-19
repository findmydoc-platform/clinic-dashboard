"use client"

import { useEffect, useId, useRef } from "react"
import { Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { supportCategories, supportRequestPolicy, type SupportRequest } from "../../model/support-request"
import { useSupportRequestController } from "../../hooks/useSupportRequestController"

type SupportRequestDialogProps = Readonly<{
  onOpenChange: (open: boolean) => void
  open: boolean
}>

export function SupportRequestDialog({ onOpenChange, open }: SupportRequestDialogProps) {
  const {
    actions,
    model,
    refs: { categoryRef, messageRef, screenshotRef, subjectRef },
  } = useSupportRequestController()
  const { errors, request, result } = model
  const screenshotId = useId()
  const doneButtonRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (result) doneButtonRef.current?.focus()
  }, [result])

  return (
    <Modal
      description="Complete this local demo form. Nothing will be sent."
      footer={
        result ? (
          <div className="flex justify-end">
            <Button onClick={() => onOpenChange(false)} ref={doneButtonRef}>
              Done
            </Button>
          </div>
        ) : (
          <div className="flex flex-wrap justify-end gap-2">
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Cancel
            </Button>
            <Button onClick={actions.submit}>Submit demo request</Button>
          </div>
        )
      }
      onOpenChange={onOpenChange}
      open={open}
      panelClassName="max-w-3xl"
      title="Contact support"
    >
      <div>
        {result ? (
          <p
            className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-5 text-sm font-bold text-[var(--secondary)]"
            role="status"
          >
            {result.message}
          </p>
        ) : (
          <section aria-labelledby="support-form-heading">
            <h3 className="font-bold text-[var(--secondary)]" id="support-form-heading">
              Support request
            </h3>
            <fieldset className="mt-4 grid gap-5">
              <div className="grid gap-5 sm:grid-cols-2">
                <Field error={errors.category} isRequired label="Category">
                  {(controlProps) => (
                    <Select
                      {...controlProps}
                      onValueChange={(value) =>
                        actions.update("category", value as SupportRequest["category"])
                      }
                      ref={categoryRef}
                      value={request.category}
                    >
                      <option value="">Select…</option>
                      {supportCategories.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </Select>
                  )}
                </Field>
                <Field error={errors.subject} isRequired label="Subject">
                  {(controlProps) => (
                    <Input
                      {...controlProps}
                      onValueChange={(value) => actions.update("subject", value)}
                      ref={subjectRef}
                      value={request.subject}
                    />
                  )}
                </Field>
              </div>
              <Field error={errors.message} isRequired label="Message">
                {(controlProps) => (
                  <Textarea
                    {...controlProps}
                    className="min-h-32"
                    onValueChange={(value) => actions.update("message", value)}
                    ref={messageRef}
                    value={request.message}
                  />
                )}
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="grid content-start gap-2 text-sm">
                  <span className="font-bold">Reply method</span>
                  <span className="flex min-h-10 items-center rounded-lg border border-[var(--border)] bg-[var(--surface)] px-3">
                    {supportRequestPolicy.replyMethodLabel}
                  </span>
                </div>
                <label className="grid gap-2 text-sm font-bold" htmlFor={screenshotId}>
                  Optional screenshot
                  <input
                    accept="image/png,image/jpeg,image/webp"
                    aria-describedby={errors.screenshot ? `${screenshotId}-error` : undefined}
                    aria-invalid={Boolean(errors.screenshot)}
                    aria-label="Optional screenshot"
                    className="peer sr-only"
                    id={screenshotId}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      actions.selectScreenshot(
                        file ? { name: file.name, size: file.size, type: file.type } : undefined,
                      )
                    }}
                    ref={screenshotRef}
                    type="file"
                  />
                  <span className="flex min-h-11 items-center gap-2 rounded-lg border border-dashed border-[var(--border)] px-3 font-normal peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--primary)]">
                    <Upload aria-hidden="true" className="size-4" />
                    <span className="truncate">{request.screenshot?.name ?? "PNG or JPG, up to 5 MB"}</span>
                  </span>
                  {errors.screenshot ? (
                    <span className="text-xs text-[var(--destructive)]" id={`${screenshotId}-error`}>
                      {errors.screenshot}
                    </span>
                  ) : null}
                </label>
              </div>
            </fieldset>
          </section>
        )}
      </div>
    </Modal>
  )
}
